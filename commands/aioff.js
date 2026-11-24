// ======================================
// .aioff - disable AI auto replies
// ======================================

import { saveSettings } from '../lib/store.js';
import { resetHistory } from '../lib/ai.js';

export default {
  name: 'aioff',
  category: 'Owner',
  description: 'Turn OFF AI auto replies in private chats',
  usage: '.aioff',
  ownerOnly: true,

  async execute(ctx) {
    await saveSettings({ aiEnabled: false });
    resetHistory();
    await ctx.reply(
      '🤖 *AI auto-reply: OFF*\n\n' +
      'The .ai command still works, but normal chats will not get AI replies.'
    );
  }
};
