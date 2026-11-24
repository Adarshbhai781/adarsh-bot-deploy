// ============================================
//  ADARSH BOT v5.1 - CONFIGURATION
// ============================================

// Phone number that CONTROLS the bot (owner).
// Country code + number, digits only. Example format: 91XXXXXXXXXX
// This must be the owner's personal WhatsApp number.
export const OWNER_NUMBER = '916200051781';

// Bot display name used in menus and replies
export const BOT_NAME = 'ADARSH BOT';

// Command prefixes - commands work with ALL of these
// Example: .menu  !menu  #menu  /menu
export const PREFIXES = ['.', '!', '#', '/'];

// OPTIONAL: Google Gemini API key for better AI replies.
// Get a free key at https://aistudio.google.com/apikey
// Leave it empty '' to use the built-in FREE AI (no key needed).
export const GEMINI_API_KEY = '';

// Auto AI replies in private chats.
// true  = bot chats with people in private chat using AI
// false = only .ai command works
export const AI_AUTO_PRIVATE = true;

// Number of warnings before a user is auto-removed from a group
export const WARN_LIMIT = 3;

// Anti-delete protection (deleted messages get shown again)
export const ANTI_DELETE = true;

// Maximum file size (MB) the downloader can fetch and send.
// WhatsApp handles documents up to ~2 GB, but big files are slow;
// 500 MB is a safe default. Change it if you want.
export const DOWNLOAD_MAX_MB = 500;

// Bot version
export const BOT_VERSION = '5.1.4';
