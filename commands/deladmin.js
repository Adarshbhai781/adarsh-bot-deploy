// ======================================
// .deladmin - owner removes a bot admin
// ======================================

import { removeAdmin } from '../lib/adminStore.js';
import { resolveTarget } from '../lib/groupHelper.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'deladmin',
  category: 'Bot Admin',
  description: 'Remove a bot admin',
  usage: '.deladmin @user (or reply, or type number)',
  ownerOnly: true,

  async execute(ctx) {
    const target = resolveTarget(ctx.msg, ctx.args);

    if (!target) {
      await ctx.reply(
        '❌ Reply to a message, mention the user, or type the number.\n\nExample: .deladmin 91xxxxxxxxxx'
      );
      return;
    }

    const number = numberFromJid(target);
    const removed = await removeAdmin(number);

    await ctx.reply(
      removed
        ? `👥 Bot admin removed: +${number}`
        : `ℹ️ +${number} was not in the bot admin list.`
    );
  }
};
