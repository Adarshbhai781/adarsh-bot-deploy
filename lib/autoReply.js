// ======================================
// SMART AUTO REPLIES (English)
// ======================================

const replies = [
  {
    patterns: ['hi', 'hii', 'hiii', 'hihi', 'hello', 'helloo', 'hellooo', 'hey', 'heyy', 'helo', 'yo'],
    reply: '👋 Hello! Welcome to ADARSH BOT.\n\nType .menu to see all commands — or just talk to me, I reply with AI!'
  },
  {
    patterns: ['gm', 'good morning'],
    reply: '🌞 Good Morning! Have a wonderful day ahead.'
  },
  {
    patterns: ['gn', 'good night'],
    reply: '🌙 Good Night! Sweet dreams.'
  },
  {
    patterns: ['ge', 'good evening'],
    reply: '🌆 Good Evening! How was your day?'
  },
  {
    patterns: ['thanks', 'thank', 'thank you', 'thx', 'tysm', 'ty'],
    reply: '😊 You are welcome! Anything else I can help with?'
  },
  {
    patterns: ['bye', 'goodbye', 'tata', 'see you'],
    reply: '👋 See you later! Come back anytime.'
  },
  {
    patterns: ['how are you', 'how r u', 'how are u', 'kaise ho'],
    reply: '😄 I am doing great, thanks for asking! How about you?'
  },
  {
    patterns: ['who are you', 'who r u', 'your name', 'tum kaun ho', 'ap kaun ho'],
    reply: '🤖 I am ADARSH BOT — a smart WhatsApp bot.\n\nType .menu to explore everything I can do!'
  },
  {
    patterns: ['menu', 'commands', 'cmds', 'features'],
    reply: '📜 Type .menu to see all commands.'
  },
  {
    patterns: ['ok', 'okay', 'hmm', 'ohh', 'oh', 'fine', 'nice', 'cool'],
    reply: '👍 Alright! Let me know if you need anything.'
  },
  {
    patterns: ['good', 'great', 'awesome', 'nice bot', 'good bot'],
    reply: '🥰 Thank you so much! You just made my day.'
  },
  {
    patterns: ['i love you', 'love you', 'luv u'],
    reply: '❤️ That is sweet! You are awesome.'
  },
  {
    patterns: ['sad', 'im sad', "i'm sad", 'i am sad', 'feeling sad'],
    reply: '🤗 Cheer up! Tough times do not last. Want to chat about it?'
  },
  {
    patterns: ['help', 'helpline'],
    reply: '🆘 Type .help for the help guide or .menu to see all commands.'
  }
];

export function autoReply(text) {
  const message = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[!.,?]+$/g, '')
    .replace(/\s+/g, ' ');

  if (!message) return null;

  for (const item of replies) {
    if (item.patterns.includes(message)) return item.reply;
  }

  return null;
}
