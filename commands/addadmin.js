// ======================================
// .addadmin - owner adds a bot admin
// ======================================

import { addAdmin } from '../lib/adminStore.js';
import { resolveTarget } from '../lib/groupHelper.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'addadmin',
  category: 'Bot Admin',
  description: 'Add a bot admin (bot admins can use admin commands)',
  usage: '.addadmin @user (or reply, or type number)',
  ownerOnly: true,

  async execute(ctx) {
    const target = resolveTarget(ctx.msg, ctx.args);

    if (!target) {
      await ctx.reply(
        '❌ Reply to a message, mention the user, or type the number.\n\nExample: .addadmin 91xxxxxxxxxx'
      );
      return;
    }

    const number = numberFromJid(target);

    if (!number) {
      await ctx.reply('❌ Could not read that number.');
      return;
    }

    await addAdmin(number);

    await ctx.reply(
      `👥 *Bot admin added!*\n\n📱 +${number}\n\nThis user can now use admin commands.`
    );
  }
};
