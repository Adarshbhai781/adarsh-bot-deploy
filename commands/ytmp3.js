// ======================================
// .ytmp3 <link> - YouTube to audio (mp3)
// ======================================

import { runDownloadFlow, extractFirstUrl } from '../lib/downloader.js';

export default {
  name: 'ytmp3',
  aliases: ['ytaudio', 'song', 'mp3'],
  category: 'Downloader',
  description: 'Download audio (mp3) from YouTube or any video link',
  usage: '.ytmp3 <link>',
  public: true,

  async execute(ctx) {
    const url = extractFirstUrl(ctx.text);

    if (!url) {
      await ctx.reply(
        '🎵 *YOUTUBE -> AUDIO*\n\n' +
        'Send a YouTube link after the command.\n\n' +
        '*Example:*\n' +
        '.ytmp3 https://youtu.be/xxxxxxx\n\n' +
        'Works with any video link (YouTube, FB, etc).'
      );
      return;
    }

    await runDownloadFlow(ctx.sock, ctx.jid, url, { mode: 'audio' });
  }
};
