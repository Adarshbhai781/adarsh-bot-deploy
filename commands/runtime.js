// ======================================
// .runtime - bot uptime
// ======================================

import { fmtDuration } from '../lib/util.js';

export default {
  name: 'runtime',
  aliases: ['uptime'],
  category: 'General',
  description: 'Show how long the bot has been running',
  usage: '.runtime',
  public: true,

  async execute(ctx) {
    await ctx.reply(
      `⏱ *Bot Runtime*\n\n` +
      `🟢 The bot has been running for:\n` +
      `*${fmtDuration(process.uptime() * 1000)}*`
    );
  }
};
