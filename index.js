
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import P from 'pino';
import qrcode from 'qrcode-terminal';

import { loadCommands } from './lib/commandHandler.js';
import { handleMessages, trackChat, getSeenChats } from './lib/router.js';
import { loadOfflineState } from './lib/offlineMode.js';
import { restoreSessionIfNeeded } from './lib/sessionRestore.js';
import { handleGroupParticipants } from './lib/groupEvents.js';
import { OWNER_NUMBER, BOT_NAME, PREFIXES, BOT_VERSION, GEMINI_API_KEY } from './config.js';
import { numberFromJid } from './lib/jid.js';
import { mkdir } from 'fs/promises';
import { pathToFileURL } from 'url';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const AUTH_DIR = './auth_info';

let commands = new Map();
let sock;
let reconnecting = false;
let botReady = false;
let botNumber = '';
let lastDisconnectInfo = null;

// ======================================
// START BOT
// ======================================

async function startBot() {
  await mkdir(AUTH_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    console.log('[bot] could not fetch latest WA version, using bundled default');
  }

  const currentSock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['ADARSH BOT', 'Chrome', '1.0.0'],
    markOnlineOnConnect: true,
    syncFullHistory: false
  });

  sock = currentSock;

  currentSock.ev.on('creds.update', saveCreds);

  currentSock.ev.on('messages.upsert', async ({ messages }) => {
    if (sock !== currentSock) return;

    for (const msg of messages) {
      try {
        await handleMessages(currentSock, msg, { commands });
      } catch (error) {
        console.error('[bot] message handler error:', error.message);
      }
    }
  });

  currentSock.ev.on('group-participants.update', async update => {
    if (sock !== currentSock) return;

    try {
      await handleGroupParticipants(currentSock, update);
    } catch (error) {
      console.error('[bot] group event error:', error.message);
    }
  });

  currentSock.ev.on('connection.update', async update => {
    if (sock !== currentSock) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Scan this QR code with WhatsApp > Linked Devices:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'connecting') {
      console.log('🔄 Connecting to WhatsApp...');
    }

    if (connection === 'open') {
      reconnecting = false;
      botReady = true;
      botNumber = numberFromJid(currentSock.user?.id || '');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ ${BOT_NAME} v${BOT_VERSION} connected!`);
      console.log(`📱 Bot number: +${botNumber}`);
      console.log(`👑 Owner: +${numberFromJid(OWNER_NUMBER)}`);
      console.log(`⚡ Prefixes: ${PREFIXES.join(' ')}`);
      console.log(`📦 Commands loaded: ${commands.size}`);
      console.log(`🤖 AI engine: ${GEMINI_API_KEY ? 'Google Gemini' : 'Free (no key)'}`);
      console.log('🚫 Anti-delete: ON');
      console.log('🌍 Public commands: menu, help, ping, info, ai, download, dl, ytmp3, ytmp4, jid, runtime');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      try {
        await currentSock.sendPresenceUpdate('available');
      } catch {
        // presence is optional
      }

      // Seed known chats for .broadcast
      try {
        const chats = currentSock.chats;

        if (chats) {
          if (typeof chats.entries === 'function') {
            for (const [id] of chats.entries()) trackChat(id);
          } else if (typeof chats === 'object') {
            for (const id of Object.keys(chats)) trackChat(id);
          }
        }
      } catch {
        // broadcast list builds over time anyway
      }
    }

    if (connection === 'close') {
      const statusCode =
        new Boom(lastDisconnect?.error)?.output?.statusCode;

      botReady = false;
      lastDisconnectInfo = {
        code: statusCode,
        at: new Date().toISOString()
      };

      if (statusCode === DisconnectReason.loggedOut) {
        lastDisconnectInfo.message = 'WhatsApp session logged out. QR scan required.';
        console.log('⚠️ Logged out. Delete auth_info and pair again.');
      } else if (statusCode === 440 || statusCode === DisconnectReason.connectionReplaced) {
        // Another device opened the SAME session -> we got kicked.
        // Retrying fast only creates a reconnect war, so back off 60s.
        lastDisconnectInfo.message =
          'Session is in use by another device (phone/Termux). Close the other bot to run it here.';
        console.log('⚠️ Code 440: another device is using this WhatsApp session!');
        console.log('   👉 Stop the bot running on your phone/Termux, then this cloud bot will connect automatically.');

        if (!reconnecting) {
          reconnecting = true;
          console.log('🔄 Retrying in 60 seconds...');

          setTimeout(() => {
            reconnecting = false;
            startBot().catch(console.error);
          }, 60 * 1000);
        }
      } else {
        console.log('❌ Connection closed:', statusCode);

        if (!reconnecting) {
          reconnecting = true;
          console.log('🔄 Reconnecting in 3 seconds...');

          setTimeout(() => {
            reconnecting = false;
            startBot().catch(console.error);
          }, 3000);
        }
      }
    }
  });

  return currentSock;
}

// ======================================
// PO TOKEN ENGINE (bgutil) - helps YouTube
// downloads on cloud/datacenter IPs
// ======================================

function startBgutilServer() {
  const script = path.join(process.cwd(), 'bgutil-server', 'build', 'main.js');

  if (!existsSync(script)) return;

  try {
    const child = spawn(
      process.execPath,
      [script, '--host', '127.0.0.1', '--port', '4416'],
      { stdio: 'ignore', env: process.env }
    );

    child.on('error', () => {}); // optional component, never crash the bot
    console.log('🔓 PO token engine started (bgutil) - better YouTube support');
  } catch {
    // optional component
  }
}

// ======================================
// RENDER WEB SERVER (port binding + keep-alive)
// ======================================

function startWebServer() {
  const port = Number(process.env.PORT || 0);

  if (!port) return; // only needed on hosts like Render

  const server = http.createServer(async (req, res) => {
    const parsed = new URL(req.url, 'http://localhost');

    // /diag?url=...&key=... -> downloader probe (for remote testing)
    if (parsed.pathname === '/diag') {
      const key = process.env.DIAG_KEY;

      if (!key || parsed.searchParams.get('key') !== key) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'forbidden' }));
        return;
      }

      const target = parsed.searchParams.get('url');

      if (!target) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'missing url param' }));
        return;
      }

      try {
        const { probeInfo } = await import('./lib/downloader.js');
        const info = await probeInfo(target);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          title: info.title || null,
          platform: info.extractor_key || null,
          duration: info.duration || null,
          size: info.filesize || info.filesize_approx || null,
          ext: info.ext || null,
          isLive: !!info.is_live
        }));
      } catch (error) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      bot: BOT_NAME,
      version: BOT_VERSION,
      connected: botReady,
      number: botNumber ? `+${botNumber}` : null,
      commands: commands.size,
      uptimeSeconds: Math.floor(process.uptime()),
      lastDisconnect: lastDisconnectInfo,
      time: new Date().toISOString()
    }));
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Status server listening on port ${port}`);
  });

  const externalUrl = process.env.RENDER_EXTERNAL_URL;

  if (externalUrl) {
    setInterval(() => {
      fetch(externalUrl).catch(() => {});
    }, 10 * 60 * 1000).unref();
    console.log('💤 Keep-alive self-ping enabled (free tier anti-sleep)');
  }
}

// ======================================
// MAIN
// ======================================

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log(`║   ${BOT_NAME} v${BOT_VERSION} - ADVANCED EDITION   ║`);
  console.log('╚═══════════════════════════════════════╝');

  await loadOfflineState();

  await restoreSessionIfNeeded('./auth_info');

  commands = await loadCommands();

  startBgutilServer();

  startWebServer();

  await startBot();
}

// Run only when executed directly (node index.js)
const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch(error => {
    console.error('[bot] fatal error:', error);
    process.exit(1);
  });
}

export { startBot, getSeenChats };
