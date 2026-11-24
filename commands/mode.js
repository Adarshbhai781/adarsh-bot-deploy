// ======================================
// .mode - public / self mode
// ======================================

import { saveSettings } from '../lib/store.js';

export default {
  name: 'mode',
  category: 'Owner',
  description: 'Switch bot between public and self mode',
  usage: '.mode public | .mode self',
  ownerOnly: true,

  async execute(ctx) {
    const value = String(ctx.args[0] || '').toLowerCase();

    if (!['public', 'self'].includes(value)) {
      await ctx.reply(
        '🌐 *BOT MODE*\n\n' +
        '• .mode public — everyone can use public commands and chat\n' +
        '• .mode self — the bot responds ONLY to you (owner)\n\n' +
        `Current mode: *${ctx.settings.mode}*`
      );
      return;
    }

    await saveSettings({ mode: value });

    await ctx.reply(
      value === 'public'
        ? '🌍 *Mode: PUBLIC*\n\nThe bot now serves everyone.'
        : '🔒 *Mode: SELF*\n\nThe bot now responds only to you (owner).'
    );
  }
};
