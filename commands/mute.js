// ======================================
// .mute / .unmute - group message settings
// ======================================

export default {
  name: 'mute',
  category: 'Group Admin',
  description: 'Only admins can send messages (group mute)',
  usage: '.mute',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, jid, botAdmin, reply } = ctx;

    if (!botAdmin) {
      await reply('🛡️ I need *admin rights* to change group settings.');
      return;
    }

    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      await reply('🔇 *Group muted*\n\nOnly admins can send messages now.\nUse .unmute to open the chat again.');
    } catch (error) {
      await reply(`❌ Mute failed: ${error.message}`);
    }
  }
};
