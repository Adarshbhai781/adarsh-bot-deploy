// ======================================
// .ai - ask the AI anything
// ======================================

import { askAI, aiEngineName } from '../lib/ai.js';

export default {
  name: 'ai',
  aliases: ['ask', 'gpt', 'chatgpt'],
  category: 'AI',
  description: 'Ask the AI anything',
  usage: '.ai <question>',
  public: true,

  async execute(ctx) {
    const { reply, text, jid, sock } = ctx;

    if (!text) {
      await reply(
        '🤖 *AI ASSISTANT*\n\n' +
        'Ask me anything!\n\n' +
        'Example: .ai explain gravity in simple words'
      );
      return;
    }

    try {
      await sock.sendPresenceUpdate('composing', jid);
    } catch {
      // presence is optional
    }

    try {
      const answer = await askAI(jid, text);
      await reply(answer);
    } catch (error) {
      console.error('[bot] .ai error:', error.message);
      await reply(
        '🤖 My AI brain is busy right now. Please try again in a minute!'
      );
    }
  }
};
