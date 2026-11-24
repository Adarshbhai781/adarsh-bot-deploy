// ======================================
// .aion - enable AI auto replies
// ======================================

import { saveSettings } from '../lib/store.js';

export default {
  name: 'aion',
  category: 'Owner',
  description: 'Turn ON AI auto replies in private chats',
  usage: '.aion',
  ownerOnly: true,

  async execute(ctx) {
    await saveSettings({ aiEnabled: true });
    await ctx.reply(
      '🤖 *AI auto-reply: ON*\n\n' +
      'The bot will now chat with people in private chat using AI.\n\n' +
      'Use .aioff to turn it off.'
    );
  }
};
