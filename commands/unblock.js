// ======================================
// .unblock - owner tool
// ======================================

import { resolveTarget } from '../lib/groupHelper.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'unblock',
  category: 'Owner',
  description: 'Unblock a user (reply/mention/number)',
  usage: '.unblock @user | .unblock 91xxxxxxxxxx',
  ownerOnly: true,

  async execute(ctx) {
    const target = resolveTarget(ctx.msg, ctx.args);

    if (!target) {
      await ctx.reply('❌ Reply to a message, mention the user, or type the number.\n\nExample: .unblock 91xxxxxxxxxx');
      return;
    }

    try {
      await ctx.sock.updateBlockStatus(target, 'unblock');
      await ctx.reply(`✅ Unblocked +${numberFromJid(target)}`);
    } catch (error) {
      await ctx.reply(`❌ Unblock failed: ${error.message}`);
    }
  }
};
