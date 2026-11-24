// ======================================
// .menu - full command list
// ======================================

import { BOT_NAME, OWNER_NUMBER, PREFIXES, BOT_VERSION } from '../config.js';
import { fmtDuration } from '../lib/util.js';
import { getSettings } from '../lib/store.js';
import { aiEngineName } from '../lib/ai.js';
import { numberFromJid } from '../lib/jid.js';

const CATEGORY_EMOJI = {
  'General': '🧩',
  'AI': '🤖',
  'Downloader': '📥',
  'Group Admin': '🛡️',
  'Bot Admin': '👥',
  'Owner': '👑'
};

const CATEGORY_ORDER = ['General', 'AI', 'Downloader', 'Group Admin', 'Bot Admin', 'Owner'];

export default {
  name: 'menu',
  aliases: ['allmenu', 'cmds', 'commandlist'],
  category: 'General',
  description: 'Show all bot commands',
  usage: '.menu',
  public: true,

  async execute(ctx) {
    const { commands, reply } = ctx;
    const settings = await getSettings();

    const categories = new Map();

    for (const [key, cmd] of commands.entries()) {
      if (key !== cmd.name.toLowerCase()) continue; // skip alias entries
      if (!categories.has(cmd.category)) categories.set(cmd.category, []);
      categories.get(cmd.category).push(cmd);
    }

    const lines = [
      `╭─「 ✦ *${BOT_NAME}* ✦ 」`,
      '│',
      `│ 🤖 Bot      : ${BOT_NAME} v${BOT_VERSION}`,
      `│ 👑 Owner    : +${numberFromJid(OWNER_NUMBER)}`,
      `│ ⚡ Prefixes : ${PREFIXES.join(' ')}`,
      `│ 🤖 AI       : ${aiEngineName()}`,
      `│ 🌐 Mode     : ${settings.mode}`,
      `│ ⏱ Uptime   : ${fmtDuration(process.uptime() * 1000)}`,
      '╰────────────────────',
      ''
    ];

    const ordered = [
      ...CATEGORY_ORDER.filter(c => categories.has(c)),
      ...[...categories.keys()].filter(c => !CATEGORY_ORDER.includes(c))
    ];

    let total = 0;

    for (const category of ordered) {
      const cmds = categories
        .get(category)
        .sort((a, b) => a.name.localeCompare(b.name));

      total += cmds.length;

      lines.push(`${CATEGORY_EMOJI[category] || '🔹'} *${category.toUpperCase()}*`);

      for (const cmd of cmds) {
        lines.push(`• ${ctx.prefix}${cmd.name}${cmd.description ? ` — ${cmd.description}` : ''}`);
      }

      lines.push('');
    }

    lines.push(`📦 Total: ${total} commands`);
    lines.push('💡 Tip: .help <command> shows full details.');

    await reply(lines.join('\n'));
  }
};
