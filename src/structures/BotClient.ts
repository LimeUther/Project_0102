import { Client, GatewayIntentBits } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import 'dotenv/config';

class Bot extends Client {
  constructor() {
    super({
      intents: [ GatewayIntentBits.Guilds ]
    });
  }

  commands = new Map();

  async start(token: string) {
    try {
      this.handleFiles(join(__dirname, '../commands/'), (file) => {
        this.commands.set(file.name, file)
      })

      this.handleFiles(join(__dirname, '../events/'), (file) => {
        this[file.once ? 'once' : 'on'](file.name, (...args) => {
          file.execute(...args)
        })
      })

      await this.login(token);

    } catch (e) {
      console.error('Error during startup: ', e);
    }
  }

  async handleFiles(dir: string, callback: (file: any) => void) {
    const files = fs.readdirSync(dir).filter(f => {
      return f.endsWith('.ts') || f.endsWith('.js')
    });

    for (const file of files) {
      const filePath = join(dir, file);
      const fileUrl = pathToFileURL(filePath).href;

      try {
        const imported = await import(fileUrl)
        callback(imported.default);
      } catch (e) {
        console.error(`Failed to load ${file}: `, e);
      }
    }
  }
}

export default new Bot();
