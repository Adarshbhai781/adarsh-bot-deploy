// ======================================
// .goodbye - goodbye message settings
// ======================================

import { getGroup, saveGroup } from '../lib/store.js';

export default {
  name: 'goodbye',
  category: 'Group Admin',
  description: 'Set the goodbye message for leaving members',
  usage: '.goodbye on | off | set <text> | show | reset',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { jid, args, reply } = ctx;
    const sub = String(args[0] || 'show').toLowerCase();
    const group = await getGroup(jid);

    if (sub === 'on' || sub === 'off') {
      await saveGroup(jid, { goodbye: sub === 'on' });
      await reply(`😢 Goodbye messages: *${sub === 'on' ? 'ON ✅' : 'OFF ❌'}*`);
      return;
    }

    if (sub === 'set') {
      const custom = args.slice(1).join(' ').trim();

      if (!custom) {
        await reply(
          '❌ Type the message text after "set".\n\n' +
          '📌 Placeholders: @user @group @count\n\n' +
          'Example: .goodbye set Sad to see @user leave @group'
        );
        return;
      }

      await saveGroup(jid, { goodbyeText: custom });
      await reply(`😢 Custom goodbye message saved:\n\n"${custom}"`);
      return;
    }

    if (sub === 'reset') {
      await saveGroup(jid, { goodbyeText: '' });
      await reply('🧹 Goodbye message reset to the default template.');
      return;
    }

    await reply(
      `😢 *GOODBYE SETTINGS*\n\n` +
      `Status: *${group.goodbye ? 'ON ✅' : 'OFF ❌'}*\n` +
      `Custom text: ${group.goodbyeText ? `"${group.goodbyeText}"` : '(default template)'}\n\n` +
      'Commands:\n' +
      '• .goodbye on / off\n' +
      '• .goodbye set <text>\n' +
      '• .goodbye reset\n\n' +
      '📌 Placeholders: @user @group @count'
    );
  }
};
