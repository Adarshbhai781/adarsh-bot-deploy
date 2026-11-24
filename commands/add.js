// ======================================
// .add - add a member by number
// ======================================

import { phoneJid, numberFromJid } from '../lib/jid.js';

export default {
  name: 'add',
  category: 'Group Admin',
  description: 'Add a member to the group by phone number',
  usage: '.add 91xxxxxxxxxx',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, jid, args, botAdmin, reply } = ctx;

    if (!botAdmin) {
      await reply('🛡️ I need *admin rights* to add members. Please make me a group admin first.');
      return;
    }

    const number = String(args[0] || '').replace(/[^0-9]/g, '');

    if (number.length < 7) {
      await reply('❌ Type the full number with country code.\n\nExample: .add 91xxxxxxxxxx');
      return;
    }

    const target = phoneJid(number);

    try {
      const result = await sock.groupParticipantsUpdate(jid, [target], 'add');
      const status = Array.isArray(result) ? result[0]?.status : null;

      if (!status || status === 200) {
        await reply(`✅ Added +${number} to the group. Welcome! 🎉`, {
          mentions: [target]
        });
        return;
      }

      if (status === 403) {
        let inviteLink = '';

        try {
          const code = await sock.groupInviteCode(jid);
          inviteLink = `\n\n🔗 Invite link: https://chat.whatsapp.com/${code}`;
        } catch {
          // no invite link available
        }

        await reply(
          `❌ Could not add +${number} directly.\nTheir privacy settings may block adds.${inviteLink}`
        );
        return;
      }

      if (status === 408) {
        await reply(`ℹ️ +${number} left the group recently. Send them the invite link instead.`);
        return;
      }

      await reply(`❌ Could not add +${number} (WhatsApp code ${status}).`);
    } catch (error) {
      await reply(`❌ Add failed: ${error.message}`);
    }
  }
};
