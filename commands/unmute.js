// ======================================
// .unmute - open the group again
// ======================================

export default {
  name: 'unmute',
  category: 'Group Admin',
  description: 'Everyone can send messages again',
  usage: '.unmute',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, jid, botAdmin, reply } = ctx;

    if (!botAdmin) {
      await reply('🛡️ I need *admin rights* to change group settings.');
      return;
    }

    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await reply('🔊 *Group unmuted*\n\nAll members can send messages again.\nUse .mute to close the chat.');
    } catch (error) {
      await reply(`❌ Unmute failed: ${error.message}`);
    }
  }
};
