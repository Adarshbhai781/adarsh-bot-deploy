// ======================================
// .admins - list bot admins
// ======================================

import { listAdmins } from '../lib/adminStore.js';

export default {
  name: 'admins',
  category: 'Bot Admin',
  description: 'Show the bot admin list',
  usage: '.admins',
  ownerOnly: true,

  async execute(ctx) {
    const admins = await listAdmins();

    if (!admins.length) {
      await ctx.reply(
        '👥 *Bot admin list is empty*\n\nUse .addadmin <number> to add someone.'
      );
      return;
    }

    const lines = ['👥 *BOT ADMINS*', '', ...admins.map((a, i) => `${i + 1}. +${a}`)];

    await ctx.reply(lines.join('\n'), {
      mentions: admins.map(a => `${a}@s.whatsapp.net`)
    });
  }
};
