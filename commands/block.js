// ======================================
// .block / .unblock - owner tools
// ======================================

import { resolveTarget } from '../lib/groupHelper.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'block',
  category: 'Owner',
  description: 'Block a user from WhatsApp (reply/mention/number)',
  usage: '.block @user | .block 91xxxxxxxxxx',
  ownerOnly: true,

  async execute(ctx) {
    const target = resolveTarget(ctx.msg, ctx.args);

    if (!target) {
      await ctx.reply('❌ Reply to a message, mention the user, or type the number.\n\nExample: .block 91xxxxxxxxxx');
      return;
    }

    try {
      await ctx.sock.updateBlockStatus(target, 'block');
      await ctx.reply(`⛔ Blocked +${numberFromJid(target)}`);
    } catch (error) {
      await ctx.reply(`❌ Block failed: ${error.message}`);
    }
  }
};
