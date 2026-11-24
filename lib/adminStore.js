
import fs from 'node:fs/promises';
import path from 'node:path';
import * as configModule from '../config.js';

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'admins.json');

function normalizeJid(jid) {
  if (!jid) return '';
  return String(jid).split(':')[0];
}

export async function isOwnerJid(jid) {
  const owner = String(
    configModule.default?.OWNER_NUMBER ||
    configModule.OWNER_NUMBER ||
    ''
  ).replace(/\D/g, '');

  const number = normalizeJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');

  return owner.length > 0 && number === owner;
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(
      dataFile,
      JSON.stringify({ admins: [] }, null, 2)
    );
  }
}

async function readStore() {
  await ensureStore();

  try {
    const parsed = JSON.parse(
      await fs.readFile(dataFile, 'utf8')
    );

    return {
      admins: Array.isArray(parsed.admins)
        ? parsed.admins
        : []
    };
  } catch {
    return { admins: [] };
  }
}

async function writeStore(data) {
  await ensureStore();

  await fs.writeFile(
    dataFile,
    JSON.stringify(data, null, 2)
  );
}

export async function listAdmins() {
  const data = await readStore();
  return data.admins;
}

export async function isAdminJid(jid) {
  const target = normalizeJid(jid);
  const admins = await listAdmins();

  return admins.some(
    item => normalizeJid(item) === target
  );
}

export async function addAdmin(jid) {
  const target = normalizeJid(jid);

  if (!target) return false;

  const data = await readStore();

  if (!data.admins.some(
    item => normalizeJid(item) === target
  )) {
    data.admins.push(target);
    await writeStore(data);
  }

  return true;
}

export async function removeAdmin(jid) {
  const target = normalizeJid(jid);
  const data = await readStore();

  const before = data.admins.length;

  data.admins = data.admins.filter(
    item => normalizeJid(item) !== target
  );

  await writeStore(data);

  return data.admins.length !== before;
}
