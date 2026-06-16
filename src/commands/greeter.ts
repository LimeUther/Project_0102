import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js'

export default {
  name: 'greeter',
  description: 'Generates an Embed within the channel',
  subgroups: [
    {
      name: 'set',
      description: 'Set greeter options.',
      subcommands: [
        {
          name: 'channel',
          description: 'Set greeter channel.',
          options: [
            {
              name: 'channel',
              description: 'The channel to be set',
              type: ApplicationCommandOptionType.Channel,
              required: true
            }
          ],
          execute: async (interaction: ChatInputCommandInteraction) => {
            const channel = interaction.options.getChannel('channel');
            interaction.reply(`greeter channel set to <#${channel?.id}>`)

          }
        },
        {
          name: 'common-roles',
          description: 'Set common roles.',
          options: [
            {
              name: 'roles',
              description: 'The channel to be set',
              type: ApplicationCommandOptionType.String,
              required: true
            }
          ],
          execute: async (interaction: ChatInputCommandInteraction) => {
            const commonRoles = interaction.options.getString('roles');
            const roleIDs = commonRoles?.match(/\d{17,19}/g) || [];

            if (roleIDs.length == 0) return interaction.reply({
              content: 'No valid roles found',
              flags: MessageFlags.Ephemeral
            })

            const validRoles = []
            for (const id of roleIDs) {
              const role = await interaction.guild?.roles.fetch(id).catch(() => null);
              if (role) validRoles.push(role);
            }

            const thing = validRoles.map(r => `<@&${r.id}>`).join('\n');
            await interaction.reply(`Found ${validRoles.length} valid roles.\n${thing}`);
          }
        }
      ]
    }
  ]
}

