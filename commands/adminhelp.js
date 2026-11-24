// ======================================
// .adminhelp - admin commands guide
// ======================================

export default {
  name: 'adminhelp',
  category: 'Bot Admin',
  description: 'Show all owner and admin commands',
  usage: '.adminhelp',
  ownerOnly: true,

  async execute(ctx) {
    const { commands, prefix } = ctx;

    const cats = ['Bot Admin', 'Owner', 'Group Admin'];

    const lines = ['🛡️ *ADMIN COMMAND GUIDE*', ''];

    for (const cat of cats) {
      const cmds = [...commands.entries()]
        .filter(([key, cmd]) => key === cmd.name.toLowerCase() && cmd.category === cat)
        .map(([, cmd]) => cmd)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (!cmds.length) continue;

      lines.push(`🔹 *${cat.toUpperCase()}*`);

      for (const cmd of cmds) {
        lines.push(`• ${prefix}${cmd.name} — ${cmd.description || ''}`);
        if (cmd.usage) lines.push(`   📌 ${cmd.usage}`);
      }

      lines.push('');
    }

    lines.push('💡 Group admin commands also work for WhatsApp group admins.');

    await ctx.reply(lines.join('\n'));
  }
};
