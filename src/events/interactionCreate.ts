import { ChatInputCommandInteraction, Events, MessageFlags } from 'discord.js'
import bot from '../structures/BotClient.js'

export default {
  name: Events.InteractionCreate,
  execute: async (interaction: ChatInputCommandInteraction) => {

    if (!interaction.isChatInputCommand()) return;

    const command = await bot.commands.get(interaction.commandName);
    await runCommand(command);

    const subGroupName = interaction.options.getSubcommandGroup(false);
    const subCommandName = interaction.options.getSubcommand(false);

    const { subgroups } = command

    if (subCommandName && subgroups) {
      const subgroup = await (subgroups.get(subGroupName) ?? subgroups.get('default'));
      const subcommand = await subgroup.subcommands.get(subCommandName);
      await runCommand(subcommand);

    }

    function runCommand(cmd: any) {
      if (!cmd) return interaction.reply({
        content: `${cmd.name} currently does nothing!`,
        flags: MessageFlags.Ephemeral
      });

      cmd.execute?.(interaction);

    }
  }
}

