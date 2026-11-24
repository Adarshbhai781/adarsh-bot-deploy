// ======================================
// .ping - speed test
// ======================================

export default {
  name: 'ping',
  category: 'General',
  description: 'Check the bot response speed',
  usage: '.ping',
  public: true,

  async execute(ctx) {
    const start = Date.now();

    await ctx.reply('🏓 Pinging...');

    const ms = Date.now() - start;

    await ctx.reply(
      `🏓 *Pong!*\n\n` +
      `⚡ Response time: ${ms} ms\n` +
      `🟢 Status: Connected\n` +
      `⏱ Uptime: ${Math.floor(process.uptime())}s`
    );
  }
};
