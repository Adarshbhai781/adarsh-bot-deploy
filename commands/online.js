// ======================================
// .online - owner comes back online
// ======================================

import { enableOnlineMode, unblockUsers } from '../lib/offlineMode.js';

export default {
  name: 'online',
  category: 'Owner',
  description: 'Disable offline mode and unblock auto-blocked users',
  usage: '.online',
  ownerOnly: true,

  async execute(ctx) {
    const blocked = await enableOnlineMode();
    const results = await unblockUsers(ctx.sock, blocked);

    const ok = results.filter(r => r.ok).length;
    const failed = results.length - ok;

    await ctx.reply(
      '🟢 *Online mode enabled*\n\n' +
      (results.length
        ? `🔓 Unblocked: ${ok} user(s)\n${failed ? `⚠️ Failed: ${failed} (manual check needed)` : ''}`
        : '🔓 No users were auto-blocked, so nothing to unblock.')
    );
  }
};
