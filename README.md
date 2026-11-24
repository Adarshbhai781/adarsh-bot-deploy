# ADARSH BOT v5.1 — Advanced Edition + All-Link Downloader (Termux)

Full-advanced WhatsApp bot using Node.js and Baileys. Your session is already
included, so the bot connects **without scanning the QR again**.

## What is new in v5.1 (All-Link Downloader)

- 📥 **ALL-LINK downloader** — `.dl <link>` downloads from almost any site
  (yt-dlp engine is bundled inside `bin/` — zero setup)
- 🎵 `.ytmp3 <link>` — YouTube / any video link → audio (mp3)
- 🎬 `.ytmp4 <link>` — YouTube / any link → video (mp4)
- 💬 **Paste a link in private chat** — bot downloads it automatically
- 🖼 Direct links supported too: mp4, mp3, jpg, png, m3u8 (HLS), etc.
- 🛡 Works in groups: `.dl` links are never punished by antilink
- 📦 Max size 500 MB (config `DOWNLOAD_MAX_MB`); big files come as document

Supported sites (via yt-dlp, 1000+): YouTube, Instagram, TikTok, Facebook,
Twitter/X, Pinterest, SoundCloud, Dailymotion, Vimeo, Reddit, Snapchat,
Twitch and more.

## What was new in v5 (Advanced)

- 🛡 **Group admin pack** — kick, add, promote, demote, warn system, antilink,
  welcome/goodbye messages, tagall, mute/unmute, groupinfo, delete
- 🤖 **AI chatbot** — free built-in AI (no API key needed). Optional Google
  Gemini support: just paste your key in `config.js`
- 🚫 **Anti-delete** — deleted messages are recovered and shown again
- ⚡ **Multi prefix** — commands work with `.`, `!`, `#`, `/`
- 🌐 **Public commands** — menu, help, ping, info, ai, jid, runtime, download
  work for everyone; everything else stays owner/admin only
- ⏳ **Anti-spam** — command cooldown + flood protection
- 🔒 **Self mode** — bot responds only to you when you want privacy
- 📢 **Broadcast** — send one message to all chats
- 🔴 Offline mode + admin system (from previous versions)

## Install on Termux

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts unzip -y
```

Move the ZIP to your Downloads folder, then:

```bash
termux-setup-storage
cd ~/storage/downloads
unzip adarsh-whatsapp-bot.zip
cd adarsh-whatsapp-bot
npm start
```

`node_modules` is already included, so `npm install` is NOT needed.
If you ever get a module error, run `npm install` once and start again.

## Pairing

Your session (`auth_info/`) is included, so the bot should connect
automatically and show:

```
✅ ADARSH BOT v5.1.0 connected!
📱 Bot number: +91xxxxxxxxxx
👑 Owner: +916200051781
```

If it ever asks for a QR (logged out), scan it with
WhatsApp > Linked Devices > Link a Device, or delete the
`auth_info` folder and pair again.

## Command prefixes

All commands work with any of these prefixes:

```
.menu   !menu   #menu   /menu
```

## Full command list

### General (everyone)
| Command | What it does |
|---|---|
| `.menu` | Full command list with categories |
| `.help [command]` | Help guide / details of a command |
| `.ping` | Check bot speed |
| `.info` | Bot information |
| `.runtime` | How long the bot has been running |
| `.jid` | Get chat/user JID (reply to someone for their JID) |

### Downloader (everyone)
| Command | What it does |
|---|---|
| `.dl <link>` | Download from ANY link (YouTube, Insta, TikTok, FB, X...) |
| `.ytmp3 <link>` | YouTube / video link → audio (mp3) |
| `.ytmp4 <link>` | YouTube / link → video (mp4) |
| `.download` | Interactive downloader (send link after it) |
| *(paste link)* | In private chat any link auto-downloads |

Downloader notes:
- Files above 25 MB arrive as **document** (WhatsApp inline limit)
- Playlist link? Only the **first video** is downloaded
- Live streams cannot be downloaded
- If YouTube ever says "verification error", just try again
- Termux users: `pkg install ffmpeg` gives best video quality (HD merge)

### AI (everyone)
| Command | What it does |
|---|---|
| `.ai <question>` | Ask the AI anything |
| *(normal chat)* | In private chats the bot replies with AI automatically |

### Group admin (group admins + bot admins)
| Command | What it does |
|---|---|
| `.kick @user` | Remove a member (reply/mention) |
| `.add 91xxxxxxxxxx` | Add a member by number |
| `.promote @user` | Make a member admin |
| `.demote @user` | Remove admin rights |
| `.warn @user <reason>` | Warn a member — 3 warnings = auto remove |
| `.warnings @user` | Show someone's warnings |
| `.resetwarn @user` | Clear warnings |
| `.antilink on/off` | Block links (delete + warn, auto-remove at 3) |
| `.welcome on/off/set <text>/reset` | Welcome message for new members |
| `.goodbye on/off/set <text>/reset` | Goodbye message for leavers |
| `.tagall <text>` | Mention every member |
| `.mute` / `.unmute` | Only-admins / everyone can send |
| `.groupinfo` | Full group details |
| `.delete` | Delete a replied message |

Welcome/goodbye text placeholders: `@user`, `@group`, `@desc`, `@count`.

### Bot admin management (owner only)
| Command | What it does |
|---|---|
| `.addadmin @user` | Make someone a bot admin |
| `.deladmin @user` | Remove a bot admin |
| `.admins` | List bot admins |
| `.adminhelp` | Admin command guide |

### Owner only
| Command | What it does |
|---|---|
| `.offline` | Offline mode: auto reply + auto block strangers |
| `.online` | Back online, unblocks everyone auto-blocked |
| `.mode public` / `.mode self` | Everyone / only you |
| `.aion` / `.aioff` | Turn AI auto-replies on/off |
| `.broadcast <text>` | Send to all chats |
| `.block @user` / `.unblock @user` | Block/unblock on WhatsApp |

### Automatic replies (everyone, private chat)
`hi, hello, hey, gm, good morning, gn, good night, ge, thanks, bye,
how are you, who are you, ok, love you, sad, help, menu` and more —
and any other message gets a smart AI reply.

## Make the AI smarter (optional)

The bot works out of the box with a free AI (no key needed).
For the best quality replies:

1. Get a free API key: https://aistudio.google.com/apikey
2. Open `config.js`
3. Put your key inside the quotes: `export const GEMINI_API_KEY = 'YOUR_KEY';`
4. Restart the bot

## Owner number

`config.js` already has `OWNER_NUMBER = '916200051781'`.
Change it there if you ever need a different controller number
(digits only, with country code).

## Add your own command

Create a new `.js` file inside `commands/`:

```js
export default {
  name: 'hello',
  category: 'General',
  description: 'Says hello',
  usage: '.hello',
  public: true,          // everyone can use it
  // ownerOnly: true,    // or owner only
  // adminOnly: true,    // or admins only
  // groupOnly: true,    // or groups only
  async execute(ctx) {
    await ctx.reply('👋 Hello!');
  }
};
```

Restart the bot. `ctx` gives you `sock, msg, jid, args, text, reply, react,
senderJid, isGroup, owner, senderIsAdmin, botAdmin, metadata, commands`.

## Data files (all auto-saved in `data/`)

- `admins.json` — bot admin list
- `settings.json` — mode, AI switch
- `groups.json` — per-group antilink/welcome settings
- `warns.json` — group warnings
- `offline-state.json` — offline mode state

## Security and notes

- NEVER share the `auth_info/` or `session/` folders — they contain your
  WhatsApp login. Do not upload them anywhere.
- This is an unofficial WhatsApp Web integration. Use responsibly and follow
  WhatsApp's terms — avoid spam or bulk messaging, or your number can be banned.
- Keep Termux running; Android may stop background processes. Use Termux
  wake-lock (`termux-wake-lock`) to keep it alive.
- If a command shows an error, note the exact error text (but never share
  session files) and ask for help.

## Troubleshooting

| Problem | Fix |
|---|---|
| Asks for QR after working fine | Session got logged out — scan again |
| `Cannot find module` error | Run `npm install` once |
| Bot not responding in groups | Make sure it used public/admin commands; bot answers group commands from admins |
| AI not replying | `.aion` enables it; check internet connection |
| Antilink not kicking | Make the bot a group admin |
| Welcome messages not coming | Make the bot a group admin and check `.welcome on` |

---
ADARSH BOT v5.1 — built with Node.js + Baileys + yt-dlp. Enjoy! 🚀
