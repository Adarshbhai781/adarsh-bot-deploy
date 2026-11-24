// ======================================
// ANTI-DELETE
// Remembers recent messages and re-shows
// them when someone deletes a message.
// ======================================

import { ANTI_DELETE } from '../config.js';
import { currentTimeIST } from './util.js';

const store = new Map(); // messageId -> entry
const MAX_ENTRIES = 800;

function unwrapMessage(message) {
  let m = message;

  while (m) {
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
    else break;
  }

  return m;
}

function contentPreview(m) {
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  );
}

function mediaType(m) {
  const types = [
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'stickerMessage',
    'documentMessage'
  ];

  return types.find(t => m[t]) || null;
}

export function rememberMessage(msg) {
  if (!ANTI_DELETE) return;

  if (!msg?.key?.id || msg.key.fromMe) return;

  const m = unwrapMessage(msg.message);
  if (!m || m.protocolMessage) return;

  store.set(msg.key.id, {
    chat: msg.key.remoteJid,
    sender: msg.key.participant || msg.key.remoteJid,
    text: contentPreview(m),
    mediaType: mediaType(m),
    message: m,
    ts: Date.now()
  });

  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
}

// Returns true when the message was a revoke (deleted message)
export async function handleRevoke(sock, msg) {
  if (!ANTI_DELETE) return false;

  const m = unwrapMessage(msg.message);
  const proto = m?.protocolMessage;

  if (!proto || (proto.type !== 0 && proto.type !== 'REVOKE')) return false;

  // Owner deleted their own message - do not report
  if (proto.key?.fromMe) return true;

  const chat = proto.key?.remoteJid || msg.key.remoteJid;
  const entry = store.get(proto.key?.id);

  if (!entry) return true;

  const userTag = `@${String(entry.sender).split('@')[0].split(':')[0]}`;

  const lines = [
    '🚫 *ANTI-DELETE ALERT*',
    '',
    `👤 User: ${userTag}`,
    `🕐 Sent at: ${currentTimeIST(new Date(entry.ts))}`,
    ''
  ];

  if (entry.text) {
    lines.push(`💬 Deleted message:\n${entry.text}`);
  } else if (entry.mediaType) {
    lines.push(`📎 A ${entry.mediaType.replace('Message', '')} was deleted (attached below).`);
  } else {
    lines.push('💬 Message content could not be recovered.');
  }

  await sock.sendMessage(chat, {
    text: lines.join('\n'),
    mentions: [entry.sender]
  });

  if (entry.mediaType && entry.message) {
    try {
      await sock.sendMessage(chat, entry.message);
    } catch {
      // Media may have expired - ignore
    }
  }

  store.delete(proto.key.id);

  return true;
}
