// ======================================
// UNIVERSAL DOWNLOADER ENGINE (v5.1)
// Downloads from ANY link using yt-dlp:
// YouTube, Instagram, TikTok, Facebook,
// Twitter/X, Pinterest, SoundCloud,
// Dailymotion, Vimeo, Reddit + direct files
// ======================================

import { spawn } from 'child_process';
import fs from 'node:fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

import { DOWNLOAD_MAX_MB, PREFIXES } from '../config.js';
import { validateMediaUrl, downloadDirectMedia } from './download.js';

const ROOT = process.cwd();
const BIN_DIR = path.join(ROOT, 'bin');
const TMP_DIR = path.join(os.tmpdir(), 'adarsh-dl');

const PROBE_TIMEOUT = 75 * 1000;
const DOWNLOAD_TIMEOUT = 10 * 60 * 1000;
const INLINE_MEDIA_MB = 25; // below this size media is sent inline, bigger as document

// per-chat concurrency guard
const busyChats = new Set();
const pendingDownloads = new Set();

// links that are WhatsApp-internal (never auto-download these)
const WHATSAPP_LINK_RE = /(?:chat\.whatsapp\.com|wa\.me)/i;

// all command names handled by the downloader (router + antilink use this)
export const DOWNLOAD_COMMANDS = new Set([
  'dl', 'download', 'get', 'save', 'downloadlink',
  'ytmp3', 'ytaudio', 'song', 'mp3',
  'ytmp4', 'ytv', 'yt', 'video', 'mp4'
]);

// ======================================
// PLATFORM DETECTION
// ======================================

const PLATFORMS = [
  ['YouTube', /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i],
  ['Instagram', /(^|\.)(instagram\.com|instagr\.am)$/i],
  ['TikTok', /(^|\.)(tiktok\.com)$/i],
  ['Facebook', /(^|\.)(facebook\.com|fb\.com|fb\.watch)$/i],
  ['Twitter/X', /(^|\.)(twitter\.com|x\.com)$/i],
  ['Pinterest', /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/i],
  ['SoundCloud', /(^|\.)soundcloud\.com$/i],
  ['Dailymotion', /(^|\.)(dailymotion\.com|dai\.ly)$/i],
  ['Vimeo', /(^|\.)vimeo\.com$/i],
  ['Reddit', /(^|\.)(reddit\.com|redd\.it)$/i],
  ['Snapchat', /(^|\.)snapchat\.com$/i],
  ['Twitch', /(^|\.)twitch\.tv$/i]
];

export function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const [name, re] of PLATFORMS) {
      if (re.test(host)) return name;
    }
    return 'Web';
  } catch {
    return 'Web';
  }
}

const DIRECT_EXT_RE =
  /\.(mp4|mkv|webm|mov|avi|3gp|3gpp|m4v|mp3|m4a|aac|ogg|opus|wav|flac|m3u8|jpg|jpeg|png|gif|webp|bmp)$/i;

export function isDirectMediaUrl(url) {
  try {
    return DIRECT_EXT_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function extractFirstUrl(text) {
  if (!text) return null;
  const match = String(text).match(/https?:\/\/\S+/i);
  if (!match) return null;
  return match[0].replace(/[),.;!?'"]+$/, '');
}

// ======================================
// PROCESS HELPER
// ======================================

function runProc(cmd, args, timeoutMs) {
  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';

    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ code: -1, stdout: '', stderr: error.message });
      return;
    }

    let done = false;

    const finish = result => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* already dead */ }
      finish({ code: -1, stdout, stderr: stderr + '\nProcess timed out' });
    }, timeoutMs);

    child.stdout?.on('data', chunk => {
      stdout += chunk;
      if (stdout.length > 20 * 1024 * 1024) stdout = stdout.slice(-10 * 1024 * 1024);
    });

    child.stderr?.on('data', chunk => {
      stderr += chunk;
      if (stderr.length > 1024 * 1024) stderr = stderr.slice(-512 * 1024);
    });

    child.on('error', error => {
      finish({ code: -1, stdout, stderr: stderr + '\n' + error.message });
    });

    child.on('close', code => {
      finish({ code: code === null ? -1 : code, stdout, stderr });
    });
  });
}

// ======================================
// ENGINE RESOLUTION (bundled -> PATH -> auto install)
// ======================================

let engineCache = null;
let installPromise = null;
let ffmpegCache; // undefined = unknown, true/false = checked

async function verifyBinary(cmd, preArgs = []) {
  const result = await runProc(cmd, [...preArgs, '--version'], 20 * 1000);
  if (result.code === 0 && result.stdout.trim().length >= 4) {
    return result.stdout.trim().split(/\s+/)[0];
  }
  return null;
}

export async function resolveEngine(force = false) {
  if (engineCache && !force) return engineCache;

  const candidates = [];

  if (process.env.YTDLP_BIN) {
    candidates.push({ cmd: process.env.YTDLP_BIN, preArgs: [] });
  }

  const localBin = path.join(
    BIN_DIR,
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  );
  candidates.push({ cmd: localBin, preArgs: [] });
  candidates.push({ cmd: 'yt-dlp', preArgs: [] });
  candidates.push({ cmd: 'yt-dlp.exe', preArgs: [] });
  candidates.push({ cmd: 'python3', preArgs: ['-m', 'yt_dlp'] });

  for (const candidate of candidates) {
    try {
      if (/[/\\]/.test(candidate.cmd)) {
        // make sure bundled binaries are executable
        await fs.chmod(candidate.cmd, 0o755).catch(() => {});
        await fs.access(candidate.cmd);
      }

      const version = await verifyBinary(candidate.cmd, candidate.preArgs);
      if (version) {
        engineCache = { ...candidate, version };
        return engineCache;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

function engineAssetName() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') return 'yt-dlp.exe';
  if (platform === 'linux' && arch === 'x64') return 'yt-dlp_linux';
  if (platform === 'linux' && arch === 'arm64') return 'yt-dlp_linux_aarch64';
  if (platform === 'darwin') return 'yt-dlp_macos';
  return null;
}

export async function installEngine() {
  // single-flight: parallel downloads must not race on the same file
  if (!installPromise) {
    installPromise = doInstallEngine().finally(() => {
      installPromise = null;
    });
  }

  return installPromise;
}

async function doInstallEngine() {
  const asset = engineAssetName();

  if (!asset) {
    throw new Error(
      `No automatic installer for ${process.platform}-${process.arch}. Install yt-dlp manually.`
    );
  }

  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  const dest = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

  await fs.mkdir(BIN_DIR, { recursive: true });

  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10 * 60 * 1000)
  });

  if (!response.ok || !response.body) {
    throw new Error(`Engine download failed (HTTP ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < 1024 * 1024) {
    throw new Error('Engine download was incomplete');
  }

  // write to a temp file and swap atomically - renaming over a binary that
  // is currently executing never fails with ETXTBSY on linux
  const tmp = `${dest}.download-${randomUUID().slice(0, 8)}`;
  await fs.writeFile(tmp, buffer);
  await fs.chmod(tmp, 0o755).catch(() => {});
  await fs.rename(tmp, dest);

  const version = await verifyBinary(dest);

  if (!version) {
    await fs.rm(dest, { force: true }).catch(() => {});
    throw new Error('Engine binary is not runnable on this system');
  }

  engineCache = { cmd: dest, preArgs: [], version };
  return engineCache;
}

export async function ensureEngine() {
  const engine = await resolveEngine();
  if (engine) return engine;

  try {
    return await installEngine();
  } catch (error) {
    throw new Error(
      'Downloader engine (yt-dlp) is not available on this device.\n\n' +
      `Reason: ${error.message}\n\n` +
      'Fix it in your terminal:\n' +
      '- Termux:  pkg install python && pip install -U yt-dlp\n' +
      '- VPS/PC:  pip install -U yt-dlp\n' +
      'Then restart the bot.'
    );
  }
}

async function runYtDlp(args, timeoutMs) {
  const engine = await ensureEngine();
  const extra = await extraEngineArgs(engine);
  return runProc(engine.cmd, [...engine.preArgs, ...extra, ...args], timeoutMs);
}

// ======================================
// ENGINE BOOSTERS (EJS runtime + PO token)
// Cloud/datacenter IPs get blocked by YouTube's
// bot check. Fix: let yt-dlp run its challenge
// JS on node + mint PO tokens with the bundled
// bgutil server (started by index.js on port 4416).
// ======================================

function versionAtLeast(version, min) {
  const parts = String(version || '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number);
  const minParts = String(min).split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const a = parts[i] || 0;
    const b = minParts[i] || 0;
    if (a !== b) return a > b;
  }

  return true;
}

let bgutilCheckedAt = 0;
let bgutilReachable = false;

async function bgutilAvailable() {
  if (Date.now() - bgutilCheckedAt < 5 * 60 * 1000) return bgutilReachable;
  bgutilCheckedAt = Date.now();

  try {
    const res = await fetch('http://127.0.0.1:4416/ping', {
      signal: AbortSignal.timeout(1500)
    });
    bgutilReachable = res.ok;
  } catch {
    bgutilReachable = false;
  }

  return bgutilReachable;
}

async function extraEngineArgs(engine) {
  const extra = [];

  // modern yt-dlp only (2025.11+ has EJS + PO token framework)
  if (!versionAtLeast(engine?.version, '2025.11')) return extra;

  // node is always present - the bot itself runs on it
  extra.push('--js-runtimes', 'node');

  if (await bgutilAvailable()) {
    // fetch_pot=always forces the player request itself to carry a PO token,
    // which is what clears YouTube's "Sign in to confirm you're not a bot"
    extra.push(
      '--extractor-args',
      'youtube:fetch_pot=always;youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416'
    );
  }

  return extra;
}

export async function hasFfmpeg() {
  if (typeof ffmpegCache === 'boolean') return ffmpegCache;

  const result = await runProc('ffmpeg', ['-version'], 10 * 1000);
  ffmpegCache = result.code === 0;
  return ffmpegCache;
}

export function __resetEngineCache() {
  engineCache = null;
  ffmpegCache = undefined;
}

// ======================================
// FRIENDLY ERROR MESSAGES
// ======================================

export function friendlyError(stderr = '', stdout = '') {
  const all = (stderr + '\n' + stdout).toLowerCase();

  if (all.includes('larger than max-filesize') || all.includes('file is larger than')) {
    return `File is bigger than the ${DOWNLOAD_MAX_MB} MB WhatsApp limit.`;
  }
  if (all.includes('sign in to confirm') || all.includes('not a bot')) {
    return 'YouTube verification error. Please try again in a few minutes.';
  }
  if (all.includes('pass filter') || all.includes('is_live')) {
    return 'Live streams cannot be downloaded.';
  }
  if (
    all.includes('private video') ||
    all.includes('members-only') ||
    all.includes('login required') ||
    all.includes('please log in') ||
    all.includes('requested content is not account available')
  ) {
    return 'This content is private — the bot cannot access it.';
  }
  if (all.includes('unsupported url')) {
    return 'This link is not supported. Try a direct media link (mp4/mp3).';
  }
  if (all.includes('unable to download webpage') || all.includes('getaddrinfo')) {
    return 'Network error while reaching the site. Please try again.';
  }
  if (all.includes('drm')) {
    return 'DRM-protected content cannot be downloaded.';
  }
  if (all.includes('404') || all.includes('not found')) {
    return 'Media not found (404). Check the link.';
  }
  if (all.includes('no video formats') || all.includes('no audio formats') || all.includes('no formats found')) {
    return 'No downloadable media found at this link.';
  }

  const errLine = stderr
    .split(/\r?\n/)
    .reverse()
    .find(line => /error/i.test(line));

  if (errLine) {
    return (
      'Download failed: ' +
      errLine.replace(/^\s*\[[^\]]*\]\s*ERROR:\s*/i, '').trim().slice(0, 140)
    );
  }

  return 'Download failed. Please check the link and try again.';
}

// ======================================
// METADATA PROBE (-j)
// ======================================

export async function probeInfo(url, { playerClient } = {}) {
  const baseArgs = ['-j', '--no-playlist', '--playlist-items', '1', '--no-warnings', url];

  if (playerClient) {
    baseArgs.push('--extractor-args', `youtube:player_client=${playerClient}`);
  }

  let result = await runYtDlp(baseArgs, PROBE_TIMEOUT);

  // YouTube sometimes asks for verification -> retry once with a different client
  if (result.code !== 0) {
    const all = (result.stderr + '\n' + result.stdout).toLowerCase();
    let isYouTube = false;
    try {
      isYouTube = /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(url).hostname);
    } catch { /* not a URL */ }

    if (isYouTube && (all.includes('sign in to confirm') || all.includes('not a bot'))) {
      result = await runYtDlp(
        [...baseArgs, '--extractor-args', 'youtube:player_client=android'],
        PROBE_TIMEOUT
      );
    }
  }

  if (result.code !== 0) {
    throw new Error(friendlyError(result.stderr, result.stdout));
  }

  let data = null;

  try {
    data = JSON.parse(result.stdout.trim());
  } catch {
    for (const line of result.stdout.split(/\r?\n/).reverse()) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{')) continue;
      try {
        data = JSON.parse(trimmed);
        break;
      } catch {
        // keep looking
      }
    }
  }

  if (!data) throw new Error('Could not read media info for this link.');
  if (data?._type === 'playlist') data = (data.entries || [])[0];
  if (!data || !data.title) throw new Error('No media found at this link.');

  return data;
}

// ======================================
// FORMAT SELECTION
// ======================================

export function buildFormatArgs(mode, ffmpeg) {
  if (mode === 'audio') {
    return ffmpeg
      ? ['-f', 'ba/b', '-x', '--audio-format', 'mp3']
      : ['-f', 'ba[ext=m4a]/ba[ext=mp3]/ba/b'];
  }

  return ffmpeg
    ? ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4']
    : ['-f', 'b[ext=mp4]/b'];
}

export function guessMode(info) {
  const ext = String(info?.ext || '').toLowerCase();

  if (['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac'].includes(ext)) {
    return 'audio';
  }

  const formats = Array.isArray(info?.formats) ? info.formats : null;

  if (formats && formats.length) {
    const hasVideoAndAudio = formats.some(
      f => f?.vcodec && f.vcodec !== 'none' && f?.acodec && f.acodec !== 'none'
    );
    const hasAudioOnly = formats.some(f => f?.acodec && f.acodec !== 'none');
    if (!hasVideoAndAudio && hasAudioOnly) return 'audio';
  }

  return 'video';
}

const AUDIO_MIME = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  webm: 'audio/webm'
};

// ======================================
// YT-DLP DOWNLOAD
// ======================================

async function ytdlDownload(url, mode) {
  const ffmpeg = await hasFfmpeg();

  await fs.mkdir(TMP_DIR, { recursive: true });

  const workDir = path.join(TMP_DIR, `dl-${randomUUID().slice(0, 8)}`);
  await fs.mkdir(workDir, { recursive: true });

  const args = [
    '--no-playlist',
    '--playlist-items', '1',
    '--no-warnings',
    '--no-progress',
    '-N', '4',
    '--max-filesize', `${DOWNLOAD_MAX_MB}M`,
    '--match-filter', '!is_live',
    ...buildFormatArgs(mode, ffmpeg),
    '-o', path.join(workDir, '%(title).50s-%(id)s.%(ext)s'),
    url
  ];

  const result = await runYtDlp(args, DOWNLOAD_TIMEOUT);

  const files = (await fs.readdir(workDir).catch(() => []))
    .filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl') && !f.startsWith('.'));

  let best = null;
  let bestSize = -1;

  for (const file of files) {
    const stat = await fs.stat(path.join(workDir, file)).catch(() => null);
    if (stat && stat.size > bestSize) {
      bestSize = stat.size;
      best = file;
    }
  }

  if (result.code !== 0 || !best) {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(friendlyError(result.stderr, result.stdout));
  }

  return {
    filePath: path.join(workDir, best),
    workDir,
    size: bestSize,
    ext: path.extname(best).slice(1).toLowerCase()
  };
}

// ======================================
// SMART DOWNLOAD (routes direct vs extractor)
// ======================================

export async function smartDownload(url, mode = 'auto') {
  validateMediaUrl(url);

  // direct file links (mp4/mp3/jpg/...) -> fast path, no engine needed
  if (isDirectMediaUrl(url)) {
    await fs.mkdir(TMP_DIR, { recursive: true });

    const filePath = path.join(TMP_DIR, `direct-${randomUUID()}.media`);
    const media = await downloadDirectMedia(url, filePath);

    return {
      type: media.type,
      filePath: media.filePath,
      workDir: null,
      size: media.size,
      ext: media.extension,
      mime: media.mime,
      title: null,
      platform: 'Direct link',
      duration: null
    };
  }

  // platform links -> yt-dlp
  const info = await probeInfo(url);

  if (info.is_live) {
    throw new Error('Live streams cannot be downloaded.');
  }

  const estimated = info.filesize || info.filesize_approx || null;

  if (estimated && estimated > DOWNLOAD_MAX_MB * 1024 * 1024) {
    throw new Error(
      `File is too big: ${Math.round(estimated / (1024 * 1024))} MB. ` +
      `WhatsApp limit is ${DOWNLOAD_MAX_MB} MB.`
    );
  }

  const chosen = mode === 'auto' ? guessMode(info) : mode;
  const download = await ytdlDownload(info.webpage_url || url, chosen);

  return {
    type: chosen,
    filePath: download.filePath,
    workDir: download.workDir,
    size: download.size,
    ext: download.ext,
    mime: chosen === 'audio'
      ? (AUDIO_MIME[download.ext] || 'audio/mp4')
      : 'video/mp4',
    title: info.title || null,
    platform: info.extractor_key || info.extractor || 'Web',
    duration: info.duration || null
  };
}

// ======================================
// SEND RESULT TO WHATSAPP
// ======================================

function safeFileName(title, ext) {
  const base = String(title || 'ADARSH-media')
    .replace(/[\\/:*?"<>|\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);

  return `${base || 'ADARSH-media'}.${ext || 'mp4'}`;
}

function fmtSeconds(total) {
  const s = Math.round(Number(total) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}h ${m}m`
    : `${m}m ${String(sec).padStart(2, '0')}s`;
}

async function cleanupResult(res) {
  try {
    if (res.workDir) {
      await fs.rm(res.workDir, { recursive: true, force: true });
    } else if (res.filePath) {
      await fs.rm(res.filePath, { force: true });
    }
  } catch {
    // temp cleanup is best-effort
  }
}

export async function sendResult(sock, jid, res) {
  const sizeMB = res.size / (1024 * 1024);

  let caption = '';
  if (res.title) caption += `*${String(res.title).slice(0, 100)}*\n`;
  caption += `📤 ${res.platform || 'Web'} • ${sizeMB.toFixed(1)} MB`;
  if (res.duration) caption += ` • ${fmtSeconds(res.duration)}`;
  caption += '\n\n✅ _Downloaded by ADARSH BOT_';

  try {
    if (res.type === 'image') {
      await sock.sendMessage(jid, {
        image: { url: res.filePath },
        caption
      });
      return;
    }

    if (res.type === 'audio') {
      if (sizeMB <= INLINE_MEDIA_MB && res.ext !== 'webm') {
        await sock.sendMessage(jid, {
          audio: { url: res.filePath },
          mimetype: res.mime,
          fileName: safeFileName(res.title, res.ext),
          ptt: false
        });
        return;
      }
    } else if (res.type === 'video' && sizeMB <= INLINE_MEDIA_MB && res.ext === 'mp4') {
      await sock.sendMessage(jid, {
        video: { url: res.filePath },
        mimetype: 'video/mp4',
        caption
      });
      return;
    }

    // fallback: send as document (works for big files too)
    await sock.sendMessage(jid, {
      document: { url: res.filePath },
      fileName: safeFileName(res.title, res.ext),
      mimetype: res.mime,
      caption
    });
  } finally {
    await cleanupResult(res);
  }
}

// ======================================
// PUBLIC FLOW USED BY ALL COMMANDS
// ======================================

export async function runDownloadFlow(sock, jid, url, { mode = 'auto' } = {}) {
  if (busyChats.has(jid)) {
    await sock.sendMessage(jid, {
      text: '⏳ Your previous download is still running. Please wait for it to finish.'
    }).catch(() => {});
    return;
  }

  busyChats.add(jid);

  try {
    let target;
    try {
      target = validateMediaUrl(url).href;
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ ${error.message}` }).catch(() => {});
      return;
    }

    if (!isDirectMediaUrl(target) && !(await resolveEngine())) {
      await sock.sendMessage(jid, {
        text: '⚙️ One-time setup: downloader engine is missing.\nDownloading it now (~40 MB), please wait...'
      }).catch(() => {});
    }

    await sock.sendMessage(jid, {
      text: `⏳ *Downloading...*\n🔗 ${target.slice(0, 120)}\n📎 ${detectPlatform(target)}`
    }).catch(() => {});

    const res = await smartDownload(target, mode);
    await sendResult(sock, jid, res);
  } catch (error) {
    console.error('[bot] downloader error:', error.message);
    await sock.sendMessage(jid, {
      text: `❌ *Download failed!*\n\n${error.message}`
    }).catch(() => {});
  } finally {
    busyChats.delete(jid);
  }
}

// auto-download: private chat me bina command ke link bhejo
export async function tryAutoDownload(sock, jid, url) {
  if (!url || WHATSAPP_LINK_RE.test(url)) return false;
  await runDownloadFlow(sock, jid, url, { mode: 'auto' });
  return true;
}

// ======================================
// INTERACTIVE .download FLOW
// ======================================

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

export async function startDownload(sock, jid) {
  if (pendingDownloads.has(jid)) {
    await sock.sendMessage(jid, {
      text: '⚠️ Please send your media link or type cancel.'
    });
    return;
  }

  if (busyChats.has(jid)) {
    await sock.sendMessage(jid, {
      text: '⏳ Your previous download is still running.'
    });
    return;
  }

  pendingDownloads.add(jid);

  await sock.sendMessage(jid, {
    text:
      '📥 *ADARSH ALL-LINK DOWNLOADER*\n\n' +
      'Send me ANY media link and I will download it for you!\n\n' +
      '✅ Works with:\n' +
      '• YouTube (video + audio)\n' +
      '• Instagram (reels + posts)\n' +
      '• TikTok\n' +
      '• Facebook\n' +
      '• Twitter / X\n' +
      '• Pinterest\n' +
      '• SoundCloud\n' +
      '• Dailymotion, Vimeo, Reddit\n' +
      '• Any direct MP4 / MP3 / JPG link\n\n' +
      `📦 Max size: ${DOWNLOAD_MAX_MB} MB\n\n` +
      '💡 Fast way: .dl <link>\n' +
      'or just paste a link in private chat!\n\n' +
      'Type *cancel* to stop.'
  });
}

export async function handleDownloadReply(sock, msg, jid) {
  if (msg.key?.fromMe) return false;

  if (!pendingDownloads.has(jid)) return false;

  const text = getMessageText(msg.message ? msg.message : msg);

  if (!text) {
    await sock.sendMessage(jid, {
      text: '⚠️ Please send a valid media link.'
    });
    return true;
  }

  if (text.toLowerCase() === 'cancel') {
    pendingDownloads.delete(jid);
    await sock.sendMessage(jid, {
      text: '❌ Download request cancelled.'
    });
    return true;
  }

  // a command typed during the flow -> cancel silently,
  // but let the command run normally (router continues)
  if (PREFIXES.some(p => text.startsWith(p))) {
    pendingDownloads.delete(jid);
    await sock.sendMessage(jid, {
      text: '📥 Download cancelled. Use .dl <link> anytime to download again.'
    });
    return false;
  }

  let cleanUrl;

  try {
    cleanUrl = validateMediaUrl(text).href;
  } catch (error) {
    await sock.sendMessage(jid, {
      text: `❌ ${error.message}\n\nSend another link or type cancel.`
    });
    return true;
  }

  pendingDownloads.delete(jid);

  await runDownloadFlow(sock, jid, cleanUrl, { mode: 'auto' });

  return true;
}
