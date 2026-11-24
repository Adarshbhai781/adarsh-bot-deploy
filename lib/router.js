// ======================================
// MESSAGE ROUTER - the brain of the bot
// ======================================

import { PREFIXES, WARN_LIMIT } from '../config.js';
import { numberFromJid, isGroupJid } from './jid.js';
import { isOwner } from './permissions.js';
import { isAdminJid } from './adminStore.js';
import { getSettings, getGroup, addWarning, resetWarnings } from './store.js';
import {
  handleDownloadReply,
  startDownload,
  tryAutoDownload,
  extractFirstUrl,
  DOWNLOAD_COMMANDS
} from './downloader.js';
import { autoReply } from './autoReply.js';
import { askAI } from './ai.js';
import { checkMessage, checkCommand } from './antispam.js';
import { rememberMessage, handleRevoke } from './antiDelete.js';
import { handleOfflineMessage } from './offlineMode.js';
import {
  getGroupMetadata,
  isParticipantAdmin,
  isBotGroupAdmin
} from './groupHelper.js';

const LINK_RE =
  /(https?:\/\/\S+|www\.\S+|(?:chat\.whatsapp\.com|wa\.me)\/\S+)/i;

const seenChats = new Set(); // for .broadcast

export function getSeenChats() {
  return [...seenChats];
}

export function trackChat(jid) {
  if (jid && !String(jid).endsWith('@broadcast') && jid !== 'status@broadcast') {
    seenChats.add(jid);
  }
}

// ======================================
// MESSAGE UNWRAP + TEXT
// ======================================

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

function getMessageText(m) {
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  ).trim();
}

function parseCommand(text) {
  if (!text) return null;

  const prefix = PREFIXES.find(p => text.startsWith(p));
  if (!prefix) return null;

  const body = text.slice(prefix.length).trim();
  if (!body) return null;

  const parts = body.split(/\s+/);

  return {
    prefix,
    name: parts[0].toLowerCase(),
    args: parts.slice(1),
    text: parts.slice(1).join(' ')
  };
}

// ======================================
// AI REPLY WITH TYPING SIMULATION
// ======================================

async function aiReply(sock, jid, prompt) {
  try {
    await sock.sendPresenceUpdate('composing', jid);
  } catch {
    // presence is optional
  }

  const answer = await askAI(jid, prompt);
  await sock.sendMessage(jid, { text: answer });
}

// ======================================
// ANTILINK ENFORCEMENT
// ======================================

async function handleAntilink(sock, msg, jid, text, senderJid, senderIsAdmin) {
  if (!text || !LINK_RE.test(text)) return false;

  const group = await getGroup(jid);
  if (!group.antilink) return false;

  if (senderIsAdmin) return false; // admins may post links

  // Try to delete the offending message
  try {
    await sock.sendMessage(jid, { delete: msg.key });
  } catch {
    // Bot needs admin rights to delete; warning still applies
  }

  const warn = await addWarning(jid, senderJid, 'Sent a link (antilink on)');
  const userTag = `@${String(senderJid).split('@')[0].split(':')[0]}`;

  if (warn.count >= WARN_LIMIT) {
    await resetWarnings(jid, senderJid);

    let kicked = false;

    try {
      await sock.groupParticipantsUpdate(jid, [senderJid], 'remove');
      kicked = true;
    } catch {
      // Needs bot admin rights
    }

    await sock.sendMessage(jid, {
      text: kicked
        ? `🚫 ${userTag} was removed after 3 warnings (links are not allowed here).`
        : `⚠️ ${userTag} reached the warning limit for sending links.\n(I need admin rights to remove members.)`,
      mentions: [senderJid]
    }).catch(() => {});
  } else {
    await sock.sendMessage(jid, {
      text: `🔗 ${userTag} links are not allowed here!\n\n⚠️ Warning: ${warn.count}/${WARN_LIMIT}`,
      mentions: [senderJid]
    }).catch(() => {});
  }

  return true;
}

// ======================================
// MAIN HANDLER (one message)
// ======================================

export async function handleMessages(sock, msg, ctx = {}) {
  if (!msg?.message) return;

  const m = unwrapMessage(msg.message);
  if (!m) return;

  const jid = msg.key.remoteJid;

  if (
    !jid ||
    jid === 'status@broadcast' ||
    jid.endsWith('@broadcast') ||
    jid.endsWith('@newsletter')
  ) {
    return;
  }

  const isGroup = isGroupJid(jid);

  // Deleted message (revoke) - handled before anything else
  if (m.protocolMessage) {
    try {
      await handleRevoke(sock, msg);
    } catch (error) {
      console.error('[bot] anti-delete error:', error.message);
    }
    return;
  }

  // Never process the bot's own outgoing messages
  if (msg.key.fromMe) return;

  const senderJid = msg.key.participant || jid;
  const senderNumber = numberFromJid(senderJid) || senderJid;
  const owner = isOwner(sock, msg, senderJid);
  const text = getMessageText(m);

  // Remember for anti-delete
  rememberMessage(msg);

  // Track chat for broadcast
  trackChat(jid);

  const settings = await getSettings();

  // Self mode: bot only listens to the owner
  if (!owner && settings.mode === 'self') return;

  // Flood / spam guard (non-owner)
  if (!owner) {
    const status = checkMessage(senderNumber);

    if (status === 'muted') return;

    if (status === 'warned') {
      await sock.sendMessage(jid, {
        text: '⚠️ You are sending messages too fast. Please wait 30 seconds.'
      }).catch(() => {});
      return;
    }
  }

  // Download flow (public) - runs before everything else
  try {
    const handled = await handleDownloadReply(sock, msg, jid);
    if (handled) return;
  } catch (error) {
    console.error('[bot] download flow error:', error.message);
  }

  // Offline mode (private chats, non-owner)
  if (!isGroup && !owner) {
    const handled = await handleOfflineMessage(sock, jid);
    if (handled) return;
  }

  // Group metadata (fetched only when needed, cached 60s)
  let metadata = null;

  if (isGroup) {
    try {
      metadata = await getGroupMetadata(sock, jid);
    } catch {
      // Group may be unavailable; commands will degrade gracefully
    }
  }

  const senderIsAdmin = isGroup
    ? isParticipantAdmin(metadata, senderJid) || owner || await isAdminJid(senderJid)
    : owner || await isAdminJid(senderJid);

  // Command parsing (done before antilink so downloader
  // commands can carry links without being punished)
  const parsed = parseCommand(text);

  // Antilink enforcement (groups, non-admin senders)
  // Downloader commands (.dl .ytmp3 ...) are allowed to contain links
  if (isGroup && !senderIsAdmin && !(parsed && DOWNLOAD_COMMANDS.has(parsed.name))) {
    const acted = await handleAntilink(
      sock, msg, jid, text, senderJid, senderIsAdmin
    );
    if (acted) return;
  }

  // ======================================
  // COMMANDS
  // ======================================

  if (parsed) {
    // .download is a public special command (URL downloader flow)
    if (parsed.name === 'download') {
      if (!owner && !checkCommand(senderNumber)) {
        await sock.sendMessage(jid, {
          text: '⏳ Slow down! Wait a few seconds before using another command.'
        }).catch(() => {});
        return;
      }

      await startDownload(sock, jid);
      return;
    }

    const cmd = ctx.commands.get(parsed.name);

    if (!cmd) {
      if (owner) {
        await sock.sendMessage(jid, {
          text: `❌ Unknown command: *${parsed.name}*\n\nType ${parsed.prefix}menu to see all commands.`
        }).catch(() => {});
      }
      return;
    }

    // Command cooldown (non-owner)
    if (!owner && !checkCommand(senderNumber)) {
      await sock.sendMessage(jid, {
        text: '⏳ Slow down! Wait a few seconds before using another command.'
      }).catch(() => {});
      return;
    }

    if (cmd.groupOnly && !isGroup) {
      await sock.sendMessage(jid, {
        text: '👥 This command works only inside groups.'
      }).catch(() => {});
      return;
    }

    if (cmd.ownerOnly && !owner) {
      await sock.sendMessage(jid, {
        text: '⛔ You are not able to use this command. Only the bot owner can use it.'
      }).catch(() => {});
      return;
    }

    if (cmd.adminOnly && !senderIsAdmin) {
      await sock.sendMessage(jid, {
        text: '🛡️ Only group admins can use this command.'
      }).catch(() => {});
      return;
    }

    // Private chats: non-public commands stay owner/admin only (v4 behaviour)
    if (!cmd.public && !cmd.adminOnly && !owner && !isGroup && !senderIsAdmin) {
      await sock.sendMessage(jid, {
        text: '⛔ You are not able to use commands. Only the bot owner can use them.'
      }).catch(() => {});
      return;
    }

    const botAdmin = isGroup ? isBotGroupAdmin(metadata, sock) : false;

    const execCtx = {
      sock,
      msg,
      jid,
      m,
      args: parsed.args,
      text: parsed.text,
      prefix: parsed.prefix,
      commandName: cmd.name,
      senderJid,
      isGroup,
      owner,
      senderIsAdmin,
      botAdmin,
      metadata,
      settings,
      commands: ctx.commands,
      reply: (content, extra = {}) =>
        sock.sendMessage(
          jid,
          typeof content === 'string' ? { text: content, ...extra } : content
        ),
      react: emoji =>
        sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch(() => {})
    };

    try {
      await cmd.execute(execCtx);
    } catch (error) {
      console.error(`[bot] command ${parsed.name} error:`, error.message);
      await sock.sendMessage(jid, {
        text: `❌ Command error: ${error.message}`
      }).catch(() => {});
    }

    return;
  }

  // ======================================
  // NON-COMMAND MESSAGES (private chats)
  // ======================================

  if (!isGroup) {
    // Any bare link in a private chat -> download it automatically
    if (text) {
      const bareUrl = extractFirstUrl(text);

      if (bareUrl) {
        const handled = await tryAutoDownload(sock, jid, bareUrl);
        if (handled) return;
      }
    }

    const reply = autoReply(text);

    if (reply) {
      await sock.sendMessage(jid, { text: reply }).catch(() => {});
      return;
    }

    if (settings.aiEnabled && text) {
      try {
        await aiReply(sock, jid, text);
      } catch (error) {
        console.error('[bot] AI error:', error.message);
        await sock.sendMessage(jid, {
          text: '🤖 My AI brain is busy right now. Please try again in a minute!'
        }).catch(() => {});
      }
    }
  }
}
