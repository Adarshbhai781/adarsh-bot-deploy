// ======================================
// .offline - owner goes offline
// ======================================

import { enableOffline } from '../lib/offlineMode.js';

export default {
  name: 'offline',
  category: 'Owner',
  description: 'Enable offline mode (auto-reply + auto-block strangers)',
  usage: '.offline',
  ownerOnly: true,

  async execute(ctx) {
    await enableOffline();

    await ctx.reply(
      '🔴 *Offline mode enabled*\n\n' +
      '• New messages from others will get an offline reply\n' +
      '• After 3 messages they will be auto-blocked\n' +
      '• Your own commands keep working normally\n\n' +
      'Use .online to come back and unblock everyone.'
    );
  }
};
