import { Client, GatewayIntentBits } from 'discord.js';
import util from 'util';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import 'dotenv/config';

class Bot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
      ]
    });
  }

  commands = new Map();

  async start(token: string) {
    try {
      await this.handleFiles(join(__dirname, '../commands/'), async (file) => {
        file.subgroups ??= [{
          name: 'default',
          subcommands: file.subcommands ?? []
        }];

        this.commands.set(file.name, {
          ...file,
          subgroups: new Map(
            file.subgroups.map((sg: any) => [
              sg.name,
              {
                ...sg,
                subcommands: new Map(
                  sg.subcommands.map( (sc: { name: string }) => [sc.name, sc])
                ),
              }
            ])
          ),
        });
      })

      await this.handleFiles(join(__dirname, '../events/'), (file) => {
        this[file.once ? 'once' : 'on'](file.name, (...args) => {
          file.execute(...args)
        });
      });

      await this.login(token);

    } catch (e) {
      console.error('Error during startup: ', e);
    };
  };

  async handleFiles(dir: string, callback: (file: any) => void) {
    const files = fs.readdirSync(dir).filter(f => {
      return f.endsWith('.ts') || f.endsWith('.js');
    });

    for (const file of files) {
      const filePath = join(dir, file);
      const fileUrl = pathToFileURL(filePath).href;

      try {
        const imported = await import(fileUrl)
        callback(imported.default);
      } catch (e) {
        console.error(`Failed to load ${file}: `, e);
      };
    };
  };
};

export default new Bot();
