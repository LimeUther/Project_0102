import { Client, GatewayIntentBits } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path'
import fs from 'fs'

import { initDatabase } from '../databases/db_init.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import 'dotenv/config';

class Bot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
      ]
    });
  }

  commands = new Map();

  async start(token: string) {
    try {
      await this.handleFiles(join(__dirname, '../commands/'), async (file) => {

        const subgroupsMap = new Map();
        const subgroupList = file.subgroups ?? [{
          name: 'default',
          subcommands: file.subcommands ?? []
        }];

        let subcommandSize = 0;
        for (const subgroup of subgroupList) {
          const subcommandsMap = new Map();

          for (const subcommand of subgroup.subcommands ?? []) {
            subcommandsMap.set(subcommand.name, subcommand);
            subcommandSize++;
          };

          subgroupsMap.set(subgroup.name, {
            ...subgroup,
            subcommands: subcommandsMap
          });
        };

        if (subcommandSize > 0) {
          file.subgroups = subgroupsMap;
        };

        delete file.subcommands;
        this.commands.set(file.name, file);

      })
      // console.log(util.inspect(this.commands, { depth: null, colors: true }));

      await this.handleFiles(join(__dirname, '../events/'), (file) => {

        this[file.once ? 'once' : 'on'](file.name, (...args) => {
          file.execute(...args)
        });

      });

      initDatabase();
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
