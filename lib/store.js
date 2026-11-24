// ======================================
// JSON DATA STORE (data/*.json)
// ======================================

import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson(file, fallback) {
  await ensureDir();

  try {
    const parsed = JSON.parse(
      await fs.readFile(path.join(DATA_DIR, file), 'utf8')
    );
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(file, data) {
  await ensureDir();

  const finalPath = path.join(DATA_DIR, file);
  const tmpPath = finalPath + '.tmp';

  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
  await fs.rename(tmpPath, finalPath);
}

// ======================================
// BOT-WIDE SETTINGS (data/settings.json)
// mode: 'public' | 'self'
// aiEnabled: boolean
// ======================================

const SETTINGS_FILE = 'settings.json';

const DEFAULT_SETTINGS = {
  mode: 'public',
  aiEnabled: true
};

export async function getSettings() {
  const data = await readJson(SETTINGS_FILE, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(data || {}) };
}

export async function saveSettings(patch) {
  const data = { ...(await getSettings()), ...patch };
  await writeJson(SETTINGS_FILE, data);
  return data;
}

// ======================================
// PER-GROUP SETTINGS (data/groups.json)
// antilink, welcome, welcomeText, goodbye, goodbyeText
// ======================================

const GROUPS_FILE = 'groups.json';

const DEFAULT_GROUP = {
  antilink: false,
  welcome: true,
  welcomeText: '',
  goodbye: true,
  goodbyeText: ''
};

export async function getGroup(chatId) {
  const all = await readJson(GROUPS_FILE, {});
  return { ...DEFAULT_GROUP, ...(all[chatId] || {}) };
}

export async function saveGroup(chatId, patch) {
  const all = await readJson(GROUPS_FILE, {});
  all[chatId] = { ...DEFAULT_GROUP, ...(all[chatId] || {}), ...patch };
  await writeJson(GROUPS_FILE, all);
  return all[chatId];
}

// ======================================
// WARNINGS (data/warns.json)
// ======================================

const WARNS_FILE = 'warns.json';

export async function getWarns(chatId, userJid) {
  const all = await readJson(WARNS_FILE, {});
  const entry = all[chatId]?.[userJid] || { count: 0, reasons: [] };
  return { count: 0, reasons: [], ...entry };
}

export async function addWarning(chatId, userJid, reason) {
  const all = await readJson(WARNS_FILE, {});

  if (!all[chatId]) all[chatId] = {};

  const entry = all[chatId][userJid] || { count: 0, reasons: [] };
  entry.count += 1;
  entry.reasons.push({
    reason: reason || 'No reason given',
    ts: Date.now()
  });

  all[chatId][userJid] = entry;
  await writeJson(WARNS_FILE, all);

  return entry;
}

export async function resetWarnings(chatId, userJid) {
  const all = await readJson(WARNS_FILE, {});

  if (all[chatId]?.[userJid]) {
    delete all[chatId][userJid];
    await writeJson(WARNS_FILE, all);
    return true;
  }

  return false;
}
