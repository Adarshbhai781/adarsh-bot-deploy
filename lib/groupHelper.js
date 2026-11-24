// ======================================
// GROUP HELPERS (metadata, admins, targets)
// ======================================

import { numberFromJid } from './jid.js';

const cache = new Map(); // jid -> { data, ts }
const TTL = 60000;

export async function getGroupMetadata(sock, jid, force = false) {
  const cached = cache.get(jid);

  if (!force && cached && Date.now() - cached.ts < TTL) {
    return cached.data;
  }

  const data = await sock.groupMetadata(jid);
  cache.set(jid, { data, ts: Date.now() });

  return data;
}

export function clearGroupCache(jid) {
  if (jid) cache.delete(jid);
  else cache.clear();
}

export function groupAdmins(metadata) {
  return (metadata?.participants || [])
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin' || p.isAdmin)
    .map(p => p.id);
}

export function isParticipantAdmin(metadata, jid) {
  if (!jid) return false;

  const admins = groupAdmins(metadata);

  if (admins.some(a => String(a).split(':')[0] === String(jid).split(':')[0])) {
    return true;
  }

  const target = numberFromJid(jid);
  return target !== '' && admins.some(a => numberFromJid(a) === target);
}

export function isBotGroupAdmin(metadata, sock) {
  return isParticipantAdmin(metadata, sock?.user?.id);
}

export function findParticipant(metadata, targetJid) {
  const list = metadata?.participants || [];

  const direct = list.find(
    p => String(p.id).split(':')[0] === String(targetJid).split(':')[0]
  );
  if (direct) return direct;

  const num = numberFromJid(targetJid);
  if (!num) return null;

  return list.find(
    p => numberFromJid(p.id) === num || numberFromJid(p.lid || '') === num
  ) || null;
}

// Resolve the target user from: mention > reply > typed number
export function resolveTarget(msg, args = []) {
  const ctx = msg?.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid || [];

  if (mentioned.length) return mentioned[0];
  if (ctx?.participant) return ctx.participant;

  const raw = String(args[0] || '').replace(/[^0-9]/g, '');

  if (raw.length >= 7) return `${raw}@s.whatsapp.net`;

  return null;
}
