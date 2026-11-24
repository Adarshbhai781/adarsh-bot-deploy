// ======================================
// DIRECT MEDIA DOWNLOADER (v5.1)
// Handles direct file links: MP4, MP3, M4A,
// WEBM, MOV, MKV, AAC, OGG, WAV, FLAC,
// JPG/PNG/GIF/WEBP images, HLS (.m3u8)
// (Platform links like YouTube are handled
// by lib/downloader.js using yt-dlp)
// ======================================

import { createWriteStream } from 'fs';
import { mkdir, rm, stat, open } from 'fs/promises';
import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { DOWNLOAD_MAX_MB } from '../config.js';

const MAX_SIZE = DOWNLOAD_MAX_MB * 1024 * 1024;
const TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_REDIRECTS = 5;

const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

const MIME_EXTENSIONS = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/3gpp': '3gp',

  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',

  ...IMAGE_EXTENSIONS
};

// ======================================
// URL VALIDATION
// ======================================

export function validateMediaUrl(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('Please send a valid URL.');
  }

  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Invalid URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS links are supported.');
  }

  if (url.username || url.password) {
    throw new Error('URLs containing credentials are not allowed.');
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '0.0.0.0'
  ) {
    throw new Error('This URL is not allowed.');
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    throw new Error('Direct IP addresses are not supported.');
  }

  return url;
}

// ======================================
// HTTP RESPONSE
// ======================================

async function getResponse(initialUrl) {
  let currentUrl = initialUrl;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT),
      headers: {
        'User-Agent': 'ADARSH-BOT/1.0',
        'Accept': 'video/*, audio/*, image/*, application/octet-stream, */*'
      }
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');

      await response.body?.cancel().catch(() => {});

      if (!location) {
        throw new Error('Redirect location missing.');
      }

      const nextUrl = new URL(location, currentUrl);

      validateMediaUrl(nextUrl.href);

      currentUrl = nextUrl.href;
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`Server returned HTTP ${response.status}.`);
    }

    return response;
  }

  throw new Error('Too many redirects.');
}

// ======================================
// FILE SIGNATURE DETECTION
// ======================================

export async function detectFileType(filePath) {
  const file = await open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(32);

    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);

    const data = buffer.subarray(0, bytesRead);

    // JPEG
    if (
      data.length >= 3 &&
      data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF
    ) {
      return { mime: 'image/jpeg', extension: 'jpg', type: 'image' };
    }

    // PNG
    if (
      data.length >= 8 &&
      data[0] === 0x89 && data[1] === 0x50 &&
      data[2] === 0x4E && data[3] === 0x47
    ) {
      return { mime: 'image/png', extension: 'png', type: 'image' };
    }

    // GIF
    if (
      data.length >= 6 &&
      data.toString('ascii', 0, 4) === 'GIF8'
    ) {
      return { mime: 'image/gif', extension: 'gif', type: 'image' };
    }

    // MP4 / M4A / MOV
    if (
      data.length >= 8 &&
      data.toString('ascii', 4, 8) === 'ftyp'
    ) {
      const brand = data.toString('ascii', 8, 12);

      if (brand.startsWith('M4A') || brand.startsWith('M4B')) {
        return { mime: 'audio/mp4', extension: 'm4a', type: 'audio' };
      }

      if (brand.startsWith('qt')) {
        return { mime: 'video/quicktime', extension: 'mov', type: 'video' };
      }

      return { mime: 'video/mp4', extension: 'mp4', type: 'video' };
    }

    // WEBP (RIFF....WEBP)
    if (
      data.length >= 12 &&
      data.toString('ascii', 0, 4) === 'RIFF' &&
      data.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { mime: 'image/webp', extension: 'webp', type: 'image' };
    }

    // WEBM / MKV
    if (
      data.length >= 4 &&
      data[0] === 0x1A && data[1] === 0x45 &&
      data[2] === 0xDF && data[3] === 0xA3
    ) {
      return { mime: 'video/webm', extension: 'webm', type: 'video' };
    }

    // MP3
    if (
      data.length >= 3 &&
      data.toString('ascii', 0, 3) === 'ID3'
    ) {
      return { mime: 'audio/mpeg', extension: 'mp3', type: 'audio' };
    }

    // OGG / OPUS
    if (
      data.length >= 4 &&
      data.toString('ascii', 0, 4) === 'OggS'
    ) {
      return { mime: 'audio/ogg', extension: 'ogg', type: 'audio' };
    }

    // WAV
    if (
      data.length >= 12 &&
      data.toString('ascii', 0, 4) === 'RIFF' &&
      data.toString('ascii', 8, 12) === 'WAVE'
    ) {
      return { mime: 'audio/wav', extension: 'wav', type: 'audio' };
    }

    // FLAC
    if (
      data.length >= 4 &&
      data.toString('ascii', 0, 4) === 'fLaC'
    ) {
      return { mime: 'audio/flac', extension: 'flac', type: 'audio' };
    }

    // AAC ADTS
    if (
      data.length >= 2 &&
      data[0] === 0xFF &&
      (data[1] & 0xF6) === 0xF0
    ) {
      return { mime: 'audio/aac', extension: 'aac', type: 'audio' };
    }

    return null;
  } finally {
    await file.close();
  }
}

// ======================================
// SIZE LIMIT TRANSFORM
// ======================================

function createSizeLimiter() {
  let total = 0;

  return new Transform({
    transform(chunk, encoding, callback) {
      total += chunk.length;

      if (total > MAX_SIZE) {
        callback(new Error(`Download exceeds the ${DOWNLOAD_MAX_MB} MB limit.`));
        return;
      }

      callback(null, chunk);
    }
  });
}

// ======================================
// DIRECT DOWNLOAD
// ======================================

async function downloadDirect(url, filePath) {
  const response = await getResponse(url);

  const mime = (response.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  const isMedia =
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('image/');

  const isBinary =
    mime === 'application/octet-stream' ||
    mime === 'binary/octet-stream' ||
    mime === 'application/binary';

  if (!isMedia && !isBinary) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Unsupported format: ${mime || 'unknown'}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);

  if (contentLength > MAX_SIZE) {
    await response.body?.cancel().catch(() => {});
    throw new Error(
      `File is bigger than the ${DOWNLOAD_MAX_MB} MB WhatsApp limit.`
    );
  }

  if (!response.body) {
    throw new Error('Empty response from server.');
  }

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      createSizeLimiter(),
      createWriteStream(filePath)
    );
  } catch (error) {
    await rm(filePath, { force: true }).catch(() => {});
    throw error;
  }

  const fileStat = await stat(filePath);

  if (!fileStat.size) {
    throw new Error('Downloaded file is empty.');
  }

  if (fileStat.size > MAX_SIZE) {
    await rm(filePath, { force: true }).catch(() => {});
    throw new Error(
      `File is bigger than the ${DOWNLOAD_MAX_MB} MB WhatsApp limit.`
    );
  }

  // First try the actual file signature.
  const detected = await detectFileType(filePath);

  if (detected) {
    return {
      filePath,
      ...detected,
      size: fileStat.size
    };
  }

  // If signature is unknown, accept only known media MIME.
  const extension = MIME_EXTENSIONS[mime];

  if (extension) {
    return {
      filePath,
      mime,
      extension,
      type: mime.startsWith('video/')
        ? 'video'
        : mime.startsWith('image/')
          ? 'image'
          : 'audio',
      size: fileStat.size
    };
  }

  throw new Error('Could not identify the downloaded file format.');
}

// ======================================
// HLS PLAYLIST CHECK
// ======================================

async function checkHlsPlaylist(url) {
  const response = await getResponse(url);

  const mime = (response.headers.get('content-type') || '').toLowerCase();

  if (!response.body) {
    throw new Error('Empty HLS playlist.');
  }

  const playlist = await response.text();

  if (!response.ok || !playlist.includes('#EXTM3U')) {
    throw new Error('Invalid HLS playlist.');
  }

  // Do not process encrypted or DRM-protected playlists.
  const keyLines = playlist
    .split(/\r?\n/)
    .filter(line => line.trim().startsWith('#EXT-X-KEY:'));

  for (const line of keyLines) {
    if (!/METHOD\s*=\s*NONE/i.test(line)) {
      throw new Error('Encrypted or protected HLS streams are not supported.');
    }
  }

  return playlist;
}

// ======================================
// HLS DOWNLOAD
// Requires ffmpeg installed (Termux: pkg install ffmpeg)
// Supports unencrypted HLS only.
// ======================================

async function downloadHls(url, filePath) {
  await checkHlsPlaylist(url);

  return new Promise((resolve, reject) => {
    const args = [
      '-nostdin',
      '-y',
      '-i', url,
      '-map', '0:v:0?',
      '-map', '0:a:0?',
      '-c', 'copy',
      '-fs', String(MAX_SIZE),
      '-movflags', '+faststart',
      '-f', 'mp4',
      filePath
    ];

    const process = spawn('ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe']
    });

    let stderr = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        process.kill('SIGKILL');
        finish(new Error('Download timed out.'));
      }
    }, TIMEOUT);

    function finish(error, result) {
      if (finished) return;

      finished = true;
      clearTimeout(timer);

      if (error) {
        rm(filePath, { force: true }).catch(() => {});
        reject(error);
      } else {
        resolve(result);
      }
    }

    process.stderr.on('data', chunk => {
      stderr += chunk.toString();

      if (stderr.length > 5000) {
        stderr = stderr.slice(-5000);
      }
    });

    process.on('error', error => {
      finish(new Error(`FFmpeg error: ${error.message}`));
    });

    process.on('close', async code => {
      if (code !== 0) {
        finish(new Error(`FFmpeg failed: ${stderr.slice(-1000)}`));
        return;
      }

      try {
        const fileStat = await stat(filePath);

        if (!fileStat.size) {
          throw new Error('Downloaded file is empty.');
        }

        if (fileStat.size > MAX_SIZE) {
          throw new Error(
            `File is bigger than the ${DOWNLOAD_MAX_MB} MB WhatsApp limit.`
          );
        }

        finish(null, {
          filePath,
          mime: 'video/mp4',
          extension: 'mp4',
          type: 'video',
          size: fileStat.size
        });
      } catch (error) {
        finish(error);
      }
    });
  });
}

// ======================================
// DOWNLOAD ROUTER (direct files)
// ======================================

export async function downloadDirectMedia(url, filePath) {
  const parsed = new URL(url);

  if (parsed.pathname.toLowerCase().endsWith('.m3u8')) {
    return downloadHls(url, filePath);
  }

  return downloadDirect(url, filePath);
}
