import { REST, Routes } from 'discord.js';
import bot from './structures/BotClient.js';
import 'dotenv/config';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands: { name: string, description: string, options: any[] }[] = [];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

try {
  console.log('Started refreshing application (/) commands.');

  await bot.handleFiles(join(__dirname, './commands/'), (file) => {

    file.options ??= []
    file.subcommands ??= []

    if (file.subcommands.length > 0) {
      for (const { name, description, options } of file.subcommands) {
        file.options.push({ name, description, options, type: 1 })
      }
    }

    commands.push({
      name: file.name,
      description: file.description,
      options: file.options
    });
  })

  console.log(commands)

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}
