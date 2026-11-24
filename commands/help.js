// ======================================
// .help [command] - help system
// ======================================

export default {
  name: 'help',
  aliases: ['h'],
  category: 'General',
  description: 'Show help for a command or the help guide',
  usage: '.help [command]',
  public: true,

  async execute(ctx) {
    const { commands, reply, prefix, args } = ctx;

    if (!args.length) {
      const lines = [
        '📖 *ADARSH BOT - HELP GUIDE*',
        '',
        `⚡ Commands start with: ${prefix}`,
        '',
        '🧩 *GENERAL*',
        `• ${prefix}menu — see all commands`,
        `• ${prefix}help <command> — full details of a command`,
        `• ${prefix}ping — check bot speed`,
        `• ${prefix}info — bot information`,
        `• ${prefix}runtime — how long the bot has been running`,
        `• ${prefix}jid — get chat/user JID`,
        '',
        '🤖 *AI*',
        `• ${prefix}ai <question> — ask the AI anything`,
        '• Just chat in private — the bot replies with AI!',
        '',
        '📥 *ALL-LINK DOWNLOADER*',
        `• ${prefix}dl <link> — download from ANY link`,
        `• ${prefix}ytmp3 <link> — YouTube link -> audio (mp3)`,
        `• ${prefix}ytmp4 <link> — YouTube link -> video (mp4)`,
        `• ${prefix}download — interactive downloader`,
        '• YouTube, Instagram, TikTok, Facebook, Twitter/X,',
        '  Pinterest, SoundCloud + any direct mp4/mp3/jpg link',
        '• In private chat: just paste a link, bot downloads it!',
        '',
        '🛡️ *GROUP ADMIN*',
        `• ${prefix}help kick — see how each admin command works`,
        '',
        '💡 Example: .help kick'
      ];

      await reply(lines.join('\n'));
      return;
    }

    const name = args[0].toLowerCase().replace(prefix, '');
    const cmd = commands.get(name);

    if (!cmd) {
      await reply(`❌ No command found: *${name}*\n\nType ${prefix}menu to see all commands.`);
      return;
    }

    const access = cmd.ownerOnly
      ? '👑 Owner only'
      : cmd.adminOnly
        ? '🛡️ Group/Bot admins'
        : cmd.public
          ? '🌍 Everyone'
          : '👑 Owner & admins';

    const aliases = cmd.aliases.length
      ? `🔗 Aliases   : ${cmd.aliases.map(a => prefix + a).join(', ')}`
      : null;

    const lines = [
      `📖 *HELP — ${prefix}${cmd.name}*`,
      '',
      `🧩 Category  : ${cmd.category}`,
      `📝 Details   : ${cmd.description || '—'}`,
      `📌 Usage     : ${cmd.usage || `${prefix}${cmd.name}`}`,
      aliases,
      `🔐 Access    : ${access}`,
      cmd.groupOnly ? '👥 Works only inside groups' : null
    ].filter(Boolean);

    await reply(lines.join('\n'));
  }
};
