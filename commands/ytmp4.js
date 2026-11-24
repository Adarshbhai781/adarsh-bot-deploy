// ======================================
// .ytmp4 <link> - YouTube to video (mp4)
// ======================================

import { runDownloadFlow, extractFirstUrl } from '../lib/downloader.js';

export default {
  name: 'ytmp4',
  aliases: ['ytv', 'yt', 'video', 'mp4'],
  category: 'Downloader',
  description: 'Download video (mp4) from YouTube or any link',
  usage: '.ytmp4 <link>',
  public: true,

  async execute(ctx) {
    const url = extractFirstUrl(ctx.text);

    if (!url) {
      await ctx.reply(
        '🎬 *YOUTUBE -> VIDEO*\n\n' +
        'Send a YouTube link after the command.\n\n' +
        '*Example:*\n' +
        '.ytmp4 https://youtu.be/xxxxxxx\n\n' +
        'Big files are sent as document automatically.'
      );
      return;
    }

    await runDownloadFlow(ctx.sock, ctx.jid, url, { mode: 'video' });
  }
};
