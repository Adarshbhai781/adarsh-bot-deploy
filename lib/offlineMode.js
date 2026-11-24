// ======================================
// OFFLINE MODE
// Owner can go offline: the bot sends an
// offline reply and auto-blocks users who
// keep messaging (same behaviour as v4).
// ======================================

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const OFFLINE_FILE = path.resolve('offline-state.json');

let offlineState = {
  enabled: false,
  counts: {},
  autoBlocked: []
};

export async function loadOfflineState() {
  try {
    const data = await readFile(OFFLINE_FILE, 'utf8');
    offlineState = JSON.parse(data);
  } catch {
    await saveOfflineState();
  }

  if (!offlineState.counts) offlineState.counts = {};
  if (!offlineState.autoBlocked) offlineState.autoBlocked = [];
}

async function saveOfflineState() {
  await writeFile(
    OFFLINE_FILE,
    JSON.stringify(offlineState, null, 2)
  );
}

export function isOffline() {
  return !!offlineState.enabled;
}

export async function enableOffline() {
  offlineState.enabled = true;
  offlineState.counts = {};
  await saveOfflineState();
}

// Returns the list of users auto-blocked during offline mode
export async function enableOnlineMode() {
  const blocked = [...(offlineState.autoBlocked || [])];

  offlineState.enabled = false;
  offlineState.counts = {};
  offlineState.autoBlocked = [];

  await saveOfflineState();

  return blocked;
}

export async function unblockUsers(sock, jids = []) {
  const results = [];

  for (const jid of jids) {
    try {
      await sock.updateBlockStatus(jid, 'unblock');
      results.push({ jid, ok: true });
    } catch (error) {
      console.error('[bot] unblock error:', jid, error.message);
      results.push({ jid, ok: false });
    }
  }

  return results;
}

// Private-chat offline handler. Caller must exclude the owner.
// Returns true when the message was handled by offline mode.
export async function handleOfflineMessage(sock, jid) {
  if (!offlineState.enabled) return false;

  const count = Number(offlineState.counts[jid] || 0) + 1;
  offlineState.counts[jid] = count;

  await saveOfflineState();

  if (count <= 3) {
    const imagePath = path.resolve('./assets/offline.jpg');

    try {
      await sock.sendMessage(jid, {
        image: { url: imagePath },
        caption: '🔴 I am currently offline.\n\nPlease try again later.'
      });
    } catch {
      await sock.sendMessage(jid, {
        text: '🔴 I am currently offline.\n\nPlease try again later.'
      });
    }
  } else {
    await sock.sendMessage(jid, {
      text: '⛔ You have been blocked.\n\nReason: Automatically blocked because offline mode is enabled.'
    });

    try {
      await sock.updateBlockStatus(jid, 'block');

      if (!offlineState.autoBlocked.includes(jid)) {
        offlineState.autoBlocked.push(jid);
        await saveOfflineState();
      }
    } catch (error) {
      console.error('[bot] offline block error:', error.message);
    }
  }

  return true;
}
