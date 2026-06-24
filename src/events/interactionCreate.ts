import { BaseInteraction, ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, Events, GuildMember, LabelBuilder, MessageFlags, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'
import bot from '../structures/BotClient.js'

import { greeterDB } from '../databases/db_init.js'

export default {
  name: Events.InteractionCreate,
  execute: async (interaction: BaseInteraction) => {

    if (interaction.isChatInputCommand()) {

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
        if (!cmd) return (interaction as ChatInputCommandInteraction).reply({
          content: `${cmd.name} currently does nothing!`,
          flags: MessageFlags.Ephemeral
        });

        cmd.execute?.(interaction);
      }

    }

    if (interaction.isButton() && interaction.customId == 'enter_server') {

      const modal = new ModalBuilder().setCustomId('entrance_form').setTitle('Server Entry Form');

      const nickInput = new TextInputBuilder().setCustomId('user_nick').setPlaceholder('What would you like us to call you?').setRequired(true).setStyle(TextInputStyle.Short);
      const nickLabel = new LabelBuilder().setLabel('Your Nickname').setTextInputComponent(nickInput);

      const programData = new Map<string, string>(JSON.parse(getData('programData', interaction.guild?.id) ?? '[]'))
      const programOpt = Array.from(programData.entries()).filter(([K]) => K !== 'common').map(([K]) => {
        return new StringSelectMenuOptionBuilder().setLabel(K).setValue(K);
      }).slice(0, 25);

      const progMenu = new StringSelectMenuBuilder().setCustomId('user_program').setPlaceholder('Which program did you take at UPV?').setRequired(true).setOptions(programOpt);
      const roleLabel = new LabelBuilder().setLabel('Your Degree Program').setDescription('You will receive a role that corresponds to the faction your program belongs to.').setStringSelectMenuComponent(progMenu);

      modal.addLabelComponents(nickLabel, roleLabel);

      if (programOpt.length) {
        await interaction.showModal(modal);

      } else {
        await interaction.reply({
          content: 'missing values',
          flags: MessageFlags.Ephemeral
        })
      }

    }

    if (interaction.isModalSubmit()) {

      if (interaction.customId == 'message_edit') {

        interface EmbedConfig { color: ""; title: ""; description: ""; image: "" }
        interface FactionConfig { icon: string; programs: string[] }
        const embedData: EmbedConfig = JSON.parse(getData('embedData', interaction.guild?.id) ?? '{}');
        const factionData = new Map<string, FactionConfig>(JSON.parse(getData('factionData', interaction.guild?.id) ?? '[]'));

        const title = interaction.fields.getTextInputValue('message_title');
        const description = interaction.fields.getTextInputValue('message_desc');
        const color = interaction.fields.getTextInputValue('message_color');
        const del_opts = interaction.fields.getCheckboxGroup('delete_opts');

        const uploadedFiles = interaction.fields.getUploadedFiles('message_image');
        const image = uploadedFiles?.first();

        let imageUrl: string | null = null;
        if (image && image.contentType?.startsWith('image/')) {
          imageUrl = image.url;
        }

        const getFieldValues = (item: 'title' | 'description' | 'color' | 'image', input: string | null | undefined) => {
          if (del_opts.includes(item)) return null;
          if (!input || input.trim().length === 0) return embedData[item] ?? null;
          return input;
        };

        const message = {
          title: getFieldValues('title', title),
          description: getFieldValues('description', description),
          color: getFieldValues('color', color),
          image: getFieldValues('image', imageUrl)
        }

        greeterDB.prepare(
          `
          INSERT INTO greeter (guildId, embedData)
          VALUES (?, ?)
          ON CONFLICT(guildId) DO UPDATE SET embedData = excluded.embedData;
          `
        ).run(interaction.guild?.id, JSON.stringify(message));

        const embed = new EmbedBuilder()

        if (message.color) embed.setColor(message.color as ColorResolvable);
        if (message.description) embed.setDescription(message.description);
        if (message.title) embed.setTitle(message.title);
        if (message.image) embed.setThumbnail(message.image);

        const factions = Array.from(factionData.entries()).filter(([K]) => K !== 'common')

        for (const faction of factions) {
          const role = await interaction.guild?.roles.fetch(faction[0]).catch(() => null);

          embed.addFields({
            name: `${faction[1].icon} ${role?.name}`,
            value: faction[1].programs.join('\n'),
            inline: true
          })
        };

        interaction.reply({ content: 'Edits saved! Heres a preview: ', embeds: [embed], flags: MessageFlags.Ephemeral })

      } else if (interaction.customId == 'entrance_form') {

        const nickname = interaction.fields.getTextInputValue('user_nick');
        const program = interaction.fields.getStringSelectValues('user_program');
        const member = interaction.member as GuildMember

        const programData = new Map(JSON.parse(getData('programData', interaction.guild?.id) ?? '[]'))
        const factionData = new Map(JSON.parse(getData('factionData', interaction.guild?.id) ?? '[]'))

        let currRole = '';
        if (member.roles.cache.some(role => {currRole = role.id; return factionData.has(role.id)})) {
          return interaction.reply({
            content: `Whoa there, \`${nickname}\`! You're already assigned to <@&${currRole}>. Contact a staff member if there was a mistake.`,
            flags: MessageFlags.Ephemeral
          })
        }

        interface ProgramStruct {
          roleId: string[];
          alias: string;
          faction: string;
        }

        const choice = programData.get(program[0] ?? "") as ProgramStruct;
        const common_choice = programData.get("common") as ProgramStruct;

        if (!choice) return interaction.reply({
          content: "Theres no such option as that",
          flags: MessageFlags.Ephemeral
        });

        await member.setNickname(`${nickname} | ${choice.alias}`).catch(() => null)
        await member.roles.add([
          ...common_choice?.roleId || [],
          ...choice.roleId || []
        ].filter((id): id is string => !!id)).catch(() => null)

        interaction.reply({
          content: `Welcome to the Unoficial UPV Freshies Discord Server, \`${nickname}\`! You are now assigned to the role, ${choice?.roleId.map((r: string) => `<@&${r}>`).join(', ')}.`,
            flags: MessageFlags.Ephemeral
        })
      }

    }
  }
};

function getData(type: string, guildId: string | undefined): string {
  const row = greeterDB.prepare(
    `SELECT ${type} FROM greeter WHERE guildId = ?`
  ).get(guildId) as any

  return row?.[`${type}`]
}
