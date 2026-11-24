
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

const AUTH_DIR = './auth_info';

let commands = new Map();
let sock;
let reconnecting = false;
let botReady = false;
let botNumber = '';

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
      console.log('❌ Connection closed:', statusCode);

      if (statusCode !== DisconnectReason.loggedOut && !reconnecting) {
        reconnecting = true;
        console.log('🔄 Reconnecting in 3 seconds...');

        setTimeout(() => {
          reconnecting = false;
          startBot().catch(console.error);
        }, 3000);
      } else if (statusCode === DisconnectReason.loggedOut) {
        console.log('⚠️ Logged out. Delete auth_info and pair again.');
      }
    }
  });

  return currentSock;
}

// ======================================
// RENDER WEB SERVER (port binding + keep-alive)
// ======================================

function startWebServer() {
  const port = Number(process.env.PORT || 0);

  if (!port) return; // only needed on hosts like Render

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      bot: BOT_NAME,
      version: BOT_VERSION,
      connected: botReady,
      number: botNumber ? `+${botNumber}` : null,
      commands: commands.size,
      uptimeSeconds: Math.floor(process.uptime()),
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
