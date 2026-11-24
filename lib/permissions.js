// ======================================
// PERMISSION CHECKS
// ======================================

import { OWNER_NUMBER } from '../config.js';
import { numberFromJid } from './jid.js';
import { isAdminJid } from './adminStore.js';

export function getBotNumber(sock) {
  return numberFromJid(sock?.user?.id || '');
}

export function ownerNumbers(sock) {
  return [
    ...new Set([
      numberFromJid(OWNER_NUMBER),
      getBotNumber(sock)
    ].filter(Boolean))
  ];
}

export function isOwner(sock, msg, senderJid) {
  if (msg?.key?.fromMe) return true;

  const sender =
    numberFromJid(senderJid || msg?.key?.participant || msg?.key?.remoteJid || '');

  if (!sender) return false;

  return ownerNumbers(sock).includes(sender);
}

// Bot admins are stored in data/admins.json (managed with .addadmin)
export async function isBotAdmin(senderJid) {
  return isAdminJid(senderJid);
}

export { listAdmins, addAdmin, removeAdmin } from './adminStore.js';
