import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js'

export default {
  name: 'nick',
  description: 'Change nickname of user',
  options: [
    {
      name: 'target',
      description: 'Target of command.',
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: 'nick',
      description: 'Nickame to change',
      type: ApplicationCommandOptionType.String,
      required: true
    }

  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const target = interaction.options.getMember('target') as GuildMember
    const new_nick = interaction.options.getString('nick')

    target.setNickname(new_nick);

    interaction.reply(`Successfully changed nickname of <@${target.id}> to: ${new_nick}`)
  }
}
