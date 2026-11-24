// ======================================
// .welcome - welcome message settings
// ======================================

import { getGroup, saveGroup } from '../lib/store.js';

export default {
  name: 'welcome',
  category: 'Group Admin',
  description: 'Set the welcome message for new members',
  usage: '.welcome on | off | set <text> | show | reset',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { jid, args, reply } = ctx;
    const sub = String(args[0] || 'show').toLowerCase();
    const group = await getGroup(jid);

    if (sub === 'on' || sub === 'off') {
      await saveGroup(jid, { welcome: sub === 'on' });
      await reply(`👋 Welcome messages: *${sub === 'on' ? 'ON ✅' : 'OFF ❌'}*`);
      return;
    }

    if (sub === 'set') {
      const custom = args.slice(1).join(' ').trim();

      if (!custom) {
        await reply(
          '❌ Type the message text after "set".\n\n' +
          '📌 Placeholders you can use:\n' +
          '• @user — the new member\n' +
          '• @group — group name\n' +
          '• @desc — group description\n' +
          '• @count — member count\n\n' +
          'Example: .welcome set Welcome @user to @group! Read @desc'
        );
        return;
      }

      await saveGroup(jid, { welcomeText: custom });
      await reply(`👋 Custom welcome message saved:\n\n"${custom}"`);
      return;
    }

    if (sub === 'reset') {
      await saveGroup(jid, { welcomeText: '' });
      await reply('🧹 Welcome message reset to the default template.');
      return;
    }

    await reply(
      `👋 *WELCOME SETTINGS*\n\n` +
      `Status: *${group.welcome ? 'ON ✅' : 'OFF ❌'}*\n` +
      `Custom text: ${group.welcomeText ? `"${group.welcomeText}"` : '(default template)'}\n\n` +
      'Commands:\n' +
      '• .welcome on / off\n' +
      '• .welcome set <text>\n' +
      '• .welcome reset\n\n' +
      '📌 Placeholders: @user @group @desc @count'
    );
  }
};
