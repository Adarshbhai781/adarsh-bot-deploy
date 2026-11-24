// ======================================
// .dl <link> - universal downloader
// ======================================

import { runDownloadFlow, extractFirstUrl } from '../lib/downloader.js';

export default {
  name: 'dl',
  aliases: ['get', 'save', 'downloadlink'],
  category: 'Downloader',
  description: 'Download from any link (YouTube, Insta, TikTok, FB, Twitter...)',
  usage: '.dl <link>',
  public: true,

  async execute(ctx) {
    const url = extractFirstUrl(ctx.text);

    if (!url) {
      await ctx.reply(
        '📥 *ALL-LINK DOWNLOADER*\n\n' +
        'Send any media link after the command.\n\n' +
        '*Examples:*\n' +
        '• .dl https://youtu.be/xxxxxxx\n' +
        '• .dl https://www.instagram.com/reel/xxxx/\n' +
        '• .dl https://vt.tiktok.com/xxxx/\n\n' +
        'YouTube video/audio -> use .ytmp3 or .ytmp4'
      );
      return;
    }

    await runDownloadFlow(ctx.sock, ctx.jid, url, { mode: 'auto' });
  }
};
