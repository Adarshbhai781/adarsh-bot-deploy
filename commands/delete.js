// ======================================
// .delete - bot deletes a replied message
// ======================================

export default {
  name: 'delete',
  aliases: ['del'],
  category: 'Group Admin',
  description: 'Delete a message (reply to it)',
  usage: '.delete (reply to the message)',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, msg, jid, botAdmin, reply } = ctx;

    const context = msg.message?.extendedTextMessage?.contextInfo;
    const stanzaId = context?.stanzaId;

    if (!stanzaId) {
      await reply('❌ Reply to the message you want to delete.');
      return;
    }

    if (!botAdmin) {
      await reply('🛡️ I need *admin rights* to delete other people\'s messages.');
      return;
    }

    const targetKey = {
      remoteJid: jid,
      id: stanzaId,
      fromMe: false,
      participant: context.participant
    };

    try {
      await sock.sendMessage(jid, { delete: targetKey });
    } catch (error) {
      await reply(`❌ Delete failed: ${error.message}`);
    }
  }
};
