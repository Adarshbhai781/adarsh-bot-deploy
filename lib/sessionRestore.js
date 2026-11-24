// ======================================
// SESSION RESTORE (for hosting: Render etc.)
// ======================================
// Restores the WhatsApp session from a private tarball URL when the
// local auth_info folder is empty. This keeps the session OUT of the
// public deploy repo while still allowing a no-rescan deployment.

import { spawnSync } from 'child_process';
import fs from 'node:fs/promises';
import path from 'path';
import os from 'os';

export async function restoreSessionIfNeeded(authDir = './auth_info') {
  const url = process.env.SESSION_SOURCE_URL;

  if (!url) return false;

  try {
    await fs.access(path.join(authDir, 'creds.json'));
    return false; // session already present, nothing to do
  } catch {
    // session missing -> try to restore
  }

  console.log('[session] auth_info empty - restoring WhatsApp session ...');

  const headers = {};

  if (process.env.GH_TOKEN) {
    headers.Authorization = `token ${process.env.GH_TOKEN}`;
    headers.Accept = 'application/vnd.github.raw';
  }

  let res;

  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(120 * 1000) });
  } catch (error) {
    console.log('[session] restore download failed:', error.message);
    return false;
  }

  if (!res.ok) {
    console.log('[session] restore download failed: HTTP', res.status);
    return false;
  }

  const buf = Buffer.from(await res.arrayBuffer());

  if (buf.length < 1024) {
    console.log('[session] restore file looks invalid (too small)');
    return false;
  }

  await fs.mkdir(authDir, { recursive: true });
  const tmpTar = path.join(os.tmpdir(), `wa-session-${Date.now()}.tgz`);
  await fs.writeFile(tmpTar, buf);

  const result = spawnSync('tar', ['-xzf', tmpTar, '-C', authDir], { stdio: 'ignore' });
  await fs.rm(tmpTar, { force: true }).catch(() => {});

  if (result.status !== 0) {
    console.log('[session] tar extraction failed (status ' + result.status + ')');
    return false;
  }

  try {
    await fs.access(path.join(authDir, 'creds.json'));
    console.log('[session] WhatsApp session restored successfully (no QR needed)');
    return true;
  } catch {
    console.log('[session] restore finished but creds.json still missing');
    return false;
  }
}
