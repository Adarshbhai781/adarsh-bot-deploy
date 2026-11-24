// ======================================
// .info - bot information
// ======================================

import os from 'os';
import { BOT_NAME, BOT_VERSION, OWNER_NUMBER, PREFIXES, GEMINI_API_KEY, ANTI_DELETE } from '../config.js';
import { fmtDuration } from '../lib/util.js';
import { getSettings } from '../lib/store.js';
import { aiEngineName } from '../lib/ai.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'info',
  category: 'General',
  description: 'Show bot information',
  usage: '.info',
  public: true,

  async execute(ctx) {
    const settings = await getSettings();

    const lines = [
      `ℹ️ *${BOT_NAME} — BOT INFO*`,
      '',
      `🤖 Version    : v${BOT_VERSION} (Advanced)`,
      `👑 Owner      : +${numberFromJid(OWNER_NUMBER)}`,
      `📱 Bot number : +${numberFromJid(ctx.sock.user?.id || '')}`,
      `⚡ Prefixes   : ${PREFIXES.join(' ')}`,
      `📦 Commands   : ${ctx.commands.size}`,
      `🌐 Mode       : ${settings.mode}`,
      `🤖 AI engine  : ${aiEngineName()}`,
      `🚫 Anti-delete: ${ANTI_DELETE ? 'ON' : 'OFF'}`,
      `⏱ Uptime     : ${fmtDuration(process.uptime() * 1000)}`,
      '',
      `💻 Node.js    : ${process.version}`,
      `📟 Platform   : ${os.platform()} (${os.arch()})`,
      '',
      '🛠 Powered by Baileys — created for Adarsh'
    ];

    await ctx.reply(lines.join('\n'));
  }
};
