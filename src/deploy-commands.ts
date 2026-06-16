import { REST, Routes } from 'discord.js';
import bot from './structures/BotClient.js';
import 'dotenv/config';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands: any[] = [];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

try {
  console.log('Started refreshing application (/) commands.');

  await bot.handleFiles(join(__dirname, './commands/'), (file) => {

    const mapped_subgroups = file.subgroups?.map((sg: any) => ({
      ...sg,
      type: 2,
      options: sg.subcommands?.map((sc: any) => ({ ...sc, type: 1}))
    }));

    const mapped_subcommands = file.subcommands?.map((sc: any) => ({
      ...sc,
      type: 1,
    }));

    file.options = mapped_subgroups ?? mapped_subcommands ?? file.options ?? [];

    delete file.subcommands
    delete file.subgroups
    file.options.forEach((opt: any) => delete opt.subcommands);

    commands.push(file);
  })

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log('Successfully reloaded application (/) commands.');

} catch (error) {
  console.error(error);
}
