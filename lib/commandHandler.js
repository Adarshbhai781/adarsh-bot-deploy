// ======================================
// COMMAND LOADER (commands/*.js)
// ======================================

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function loadCommands() {
  const commands = new Map();

  const commandsDir = path.resolve('./commands');

  if (!fs.existsSync(commandsDir)) {
    console.log('[bot] commands folder not found');
    return commands;
  }

  const files = fs.readdirSync(commandsDir)
    .filter(file => file.endsWith('.js'));

  for (const file of files) {
    try {
      const filePath = path.join(commandsDir, file);
      const module = await import(pathToFileURL(filePath).href);

      const def = module.default || module;
      const name =
        (typeof def === 'object' ? def.name : null) ||
        path.basename(file, '.js');

      const execute =
        (typeof def === 'object' ? def.execute : null) ||
        (typeof def === 'function' ? def : null);

      if (typeof execute !== 'function') {
        console.log(`[bot] skipped (no execute function): ${file}`);
        continue;
      }

      const meta = typeof def === 'object' ? def : {};

      commands.set(String(name).toLowerCase(), {
        name: String(name),
        category: meta.category || 'General',
        description: meta.description || '',
        usage: meta.usage || '',
        aliases: Array.isArray(meta.aliases) ? meta.aliases : [],
        ownerOnly: !!meta.ownerOnly,
        adminOnly: !!meta.adminOnly,
        groupOnly: !!meta.groupOnly,
        public: !!meta.public,
        execute
      });

      console.log(`[bot] loaded: ${name}`);
    } catch (error) {
      console.log(`[bot] failed: ${file} -> ${error.message}`);
    }
  }

  // Register aliases (points to the same command object)
  for (const [, cmd] of [...commands.entries()]) {
    for (const alias of cmd.aliases) {
      const key = String(alias).toLowerCase();
      if (!commands.has(key)) commands.set(key, cmd);
    }
  }

  console.log(`[bot] total commands: ${commands.size}`);

  return commands;
}
