import {
  CommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SendableChannels,
  SlashCommandBuilder
} from 'discord.js'

export default {

  name: 'embed',
  description: 'Generates an Embed within the channel',

  execute: async (interaction: CommandInteraction) => {
    const channel = interaction.channel as SendableChannels;

    const embed = new EmbedBuilder()
    .setColor("Aqua")
    .setTitle("Test title")
    .setDescription('Test Descriptino here lmao uhhhhhhh')

    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: "message was sent",
      flags: MessageFlags.Ephemeral
    });
  },

  subcommands: [
    {
      name: 'test',
      description: 'what',
      options: [],
      execute: () => {
      },
    },
  ]
}


