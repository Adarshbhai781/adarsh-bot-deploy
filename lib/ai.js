// ======================================
// AI ENGINE (Gemini optional + Free no-key AI)
// ======================================

import { GEMINI_API_KEY, BOT_NAME } from '../config.js';
import { cleanMarkdown } from './util.js';

const history = new Map(); // chatId -> [{ role, text }]
const MAX_TURNS = 8;

const SYSTEM_PROMPT =
  `You are ${BOT_NAME}, a friendly and helpful WhatsApp assistant created by Adarsh. ` +
  'Keep replies short (max 8 lines), use simple words, and light emojis when it fits. ' +
  'Always answer in the same language the user writes in. ' +
  'You are inside WhatsApp, so avoid markdown tables and code blocks unless the user asks for code.';

function getHistory(chatId) {
  if (!history.has(chatId)) history.set(chatId, []);
  return history.get(chatId);
}

export function resetHistory(chatId) {
  if (chatId) history.delete(chatId);
  else history.clear();
}

function pushHistory(chatId, role, text) {
  const arr = getHistory(chatId);
  arr.push({ role, text });
  while (arr.length > MAX_TURNS) arr.shift();
}

export function aiEngineName() {
  return GEMINI_API_KEY ? 'Google Gemini' : 'Free AI (no key)';
}

export async function askAI(chatId, prompt) {
  pushHistory(chatId, 'user', prompt);

  let answer;

  if (GEMINI_API_KEY) {
    answer = await askGemini(chatId, prompt);
  } else {
    answer = await askFreeAI(chatId, prompt);
  }

  answer = cleanMarkdown(answer);

  if (!answer) throw new Error('AI returned an empty reply');

  pushHistory(chatId, 'assistant', answer);

  return answer;
}

// ---------- FREE AI (Pollinations, no API key needed) ----------

async function askFreeAI(chatId, prompt) {
  const turns = getHistory(chatId).slice(-MAX_TURNS);
  const convo = turns
    .map(t => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`)
    .join('\n');

  const fullPrompt = `${SYSTEM_PROMPT}\n\nConversation so far:\n${convo}\n\nAssistant:`;

  const response = await fetch(
    `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`,
    {
      headers: { 'User-Agent': 'ADARSH-BOT/5.0' },
      signal: AbortSignal.timeout(60000)
    }
  );

  if (!response.ok) {
    throw new Error(`AI server returned HTTP ${response.status}`);
  }

  const text = await response.text();

  if (!text || !text.trim()) {
    throw new Error('AI server sent an empty reply');
  }

  return text;
}

// ---------- GEMINI (optional, needs API key in config.js) ----------

async function askGemini(chatId, prompt) {
  const pastTurns = getHistory(chatId)
    .slice(0, -1)
    .slice(-MAX_TURNS)
    .map(t => ({
      role: t.role === 'user' ? 'user' : 'model',
      parts: [{ text: t.text }]
    }));

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [...pastTurns, { role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
  };

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000)
    }
  );

  const data = await response.json().catch(() => null);

  const answer = (data?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text)
    .filter(Boolean)
    .join('\n');

  if (!response.ok || !answer) {
    throw new Error(data?.error?.message || 'Gemini request failed');
  }

  return answer;
}
