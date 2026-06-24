import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  CheckboxGroupBuilder,
  EmbedBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SendableChannels,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

import { greeterDB } from '../databases/db_init.js'

export default {
  name: 'greeter',
  description: 'Generates an Embed within the channel',
  default_member_permissions: "14",

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

            const inputChannel = interaction.options.getChannel('channel');

            const guild = interaction.guild
            const channel = await guild?.channels.fetch(`${inputChannel?.id}`).catch(() => null);

            if (!channel || !guild) return

              const saveChannel = greeterDB.prepare(
                `
                INSERT INTO greeter (guildId, channelId)
                VALUES (?, ?)
                ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId;
                `
              )
              saveChannel.run(guild?.id, channel.id);

              interaction.reply(`greeter channel set to <#${channel.id}>`);
          }

        },

        {
          name: 'faction-icon',
          description: 'Edit factions',
          options: [
            {
              name: 'role',
              description: 'role to add the icon to.',
              type: ApplicationCommandOptionType.Role,
              required: true
            },
            {
              name: 'icon',
              description: 'the icon itself.',
              type: ApplicationCommandOptionType.String,
              required: true
            }
          ],
          execute: async (interaction: ChatInputCommandInteraction) => {

            const role = interaction.options.getRole('role');
            const icon = interaction.options.getString('icon');

            if (!role || !icon) return

              interface FactionConfig { icon: string; programs: string[] }
              const factionData = new Map<string, FactionConfig>(JSON.parse(getData('factionData', interaction.guild?.id) ?? '[]'))

              const currFaction = factionData.get(role.id);
              if (!currFaction) return interaction.reply({
                content: 'no such faction exists yet.',
                flags: MessageFlags.Ephemeral
              })

              factionData.set(role.id, { ...currFaction, icon: icon });

              greeterDB.prepare(
                `
                INSERT INTO greeter (guildId, factionData)
                VALUES (?, ?)
                ON CONFLICT(guildId) DO UPDATE SET
                factionData = excluded.factionData;
                `
              ).run( interaction.guild?.id, JSON.stringify(Array.from(factionData.entries())));

              interaction.reply({
                content: `${icon} added to ${role.name}`,
                flags: MessageFlags.Ephemeral
              })
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

            const validRoles = []
            for (const id of roleIDs) {
              const role = await interaction.guild?.roles.fetch(id).catch(() => null);
              if (role) validRoles.push(role.id);
            }

            if (validRoles.length == 0) return interaction.reply({
              content: 'No valid roles found',
              flags: MessageFlags.Ephemeral
            })

            const programData = new Map(JSON.parse(getData('programData', interaction.guild?.id) ?? '[]'))

            programData.set('common', {
              roleId: validRoles,
              alias: 'none',
              faction: 'everyone'
            })

            const saveOptions = greeterDB.prepare(
              `
              INSERT INTO greeter (guildId, programData)
              VALUES (?, ?)
              ON CONFLICT(guildId) DO UPDATE SET
              programData = excluded.programData;
              `
            );
            saveOptions.run(
              interaction.guild?.id,
              JSON.stringify(Array.from(programData.entries())),
            );

            interaction.reply({
              content: `Added common roles: ${validRoles.map(r => `<@&${r}>`).join(' ')}`,
                flags: MessageFlags.Ephemeral
            });
          }
        },

        {
          name: 'program',
          description: 'Set a role unique to a faction',
          options: [
            {
              name: 'program',
              description: 'the degree program itself',
              type: ApplicationCommandOptionType.String,
              required: true
            },
            {
              name: 'role',
              description: 'The unique role',
              type: ApplicationCommandOptionType.Role,
              required: true
            },
            {
              name: 'alias',
              description: 'An alias for the program (set to delete to delete program)',
              type: ApplicationCommandOptionType.String,
              required: true
            },
          ],
          execute: async (interaction: ChatInputCommandInteraction) => {
            const role = interaction.options.getRole('role');
            const program = interaction.options.getString('program');
            const alias = interaction.options.getString('alias')

            if (!role || !program || !alias) return

              interface ProgramConfig { roleId: string[]; alias: string; faction: string; }
              interface FactionConfig { icon: string; programs: string[] }

              const programData = new Map<string, ProgramConfig>(JSON.parse(getData('programData', interaction.guild?.id) ?? '[]'))
              const factionData = new Map<string, FactionConfig>(JSON.parse(getData('factionData', interaction.guild?.id) ?? '[]'))

              const existingProgram = programData.get(program);
              const oldRoleId = existingProgram?.roleId?.[0];

              if (oldRoleId && (oldRoleId !== role?.id || alias === 'delete')) {
                const oldFactionData = factionData.get(oldRoleId);

                if (oldFactionData) {
                  oldFactionData.programs = oldFactionData.programs.filter(p => p !== program);
                  oldFactionData.programs.length == 0 ? factionData.delete(oldRoleId) : factionData.set(oldRoleId, oldFactionData);
                }
              }

              programData.set(program, {
                roleId: [role.id],
                alias: alias,
                faction: role.name
              })

              if (alias !== 'delete') {

                const targetFaction = factionData.get(role.id) ?? { icon: '', programs: [] };
                if (!targetFaction.programs.includes(program)) targetFaction.programs.push(program);

                factionData.set(role.id, targetFaction)

                interaction.reply({
                  content: `${program} with the alias: ${alias} has been set to <@&${role?.id}>`,
                  flags: MessageFlags.Ephemeral
                });

              } else {

                programData.delete(program)

                interaction.reply({
                  content: `${program} has been deleted.`,
                  flags: MessageFlags.Ephemeral
                });

              }

              greeterDB.prepare(
                `
                INSERT INTO greeter (guildId, programData, factionData)
                VALUES (?, ?, ?)
                ON CONFLICT(guildId) DO UPDATE SET
                programData = excluded.programData,
                  factionData = excluded.factionData;
                `
              ).run(
              interaction.guild?.id,
              JSON.stringify(Array.from(programData.entries())),
              JSON.stringify(Array.from(factionData.entries()))
              );

          }
        }

      ]
    },

    {
      name: 'message',
      description: 'Greeter message options.',
      subcommands: [

        {
          name: 'edit',
          description: 'Edits the greeter message.',
          execute: async (interaction: ChatInputCommandInteraction) => {

            const modal = new ModalBuilder().setCustomId('message_edit').setTitle('Greeter Message Editor');

            const titleInput = new TextInputBuilder().setCustomId('message_title').setPlaceholder('leave blank to leave unchanged').setStyle(TextInputStyle.Short).setRequired(false);
            const descInput = new TextInputBuilder().setCustomId('message_desc').setPlaceholder('leave blank to leave unchanged').setStyle(TextInputStyle.Paragraph).setRequired(false);
            const colorInput = new TextInputBuilder().setCustomId('message_color').setPlaceholder('leave blank to leave unchanged').setStyle(TextInputStyle.Short).setRequired(false);
            const imageInput = new FileUploadBuilder().setCustomId('message_image').setRequired(false);

            const deleteOpts = new CheckboxGroupBuilder().setCustomId('delete_opts').addOptions(
              { label: 'Title',       value: 'title',       default: false },
              { label: 'Description', value: 'description', default: false },
              { label: 'Color',       value: 'color',       default: false },
              { label: 'Image',       value: 'image',       default: false },
            ).setRequired(false);

            const titleLabel = new LabelBuilder().setLabel('Title').setTextInputComponent(titleInput);
            const descLabel = new LabelBuilder().setLabel('Message').setTextInputComponent(descInput);
            const colorLabel = new LabelBuilder().setLabel('Color').setTextInputComponent(colorInput);
            const imageLabel = new LabelBuilder().setLabel('Image').setFileUploadComponent(imageInput);
            const deleteLabel = new LabelBuilder().setLabel('Delete?').setCheckboxGroupComponent(deleteOpts)

            modal.addLabelComponents(titleLabel, descLabel, colorLabel, imageLabel, deleteLabel);
            interaction.showModal(modal);
          }
        },

        {
          name: 'load',
          description: 'Load/reloads the greeter message.',
          execute: async (interaction: ChatInputCommandInteraction) => {
            const guild = interaction.guild;

            const channelId = getData('channelId', guild?.id)
            if (!channelId) return interaction.reply('No channel id was saved in the database.');

            try {
              const channel = await guild?.channels.fetch(channelId).catch() as SendableChannels

              const embed = new EmbedBuilder()

              interface FactionConfig { icon: string; programs: string[] }
              interface EmbedConfig { color: ""; title: ""; description: ""; image: "" }

              const factionData = new Map<string, FactionConfig>(JSON.parse(getData('factionData', interaction.guild?.id) ?? '[]'));
              const embedData: EmbedConfig = JSON.parse(getData('embedData', interaction.guild?.id) ?? '{}');

              if (embedData?.color) embed.setColor(embedData.color);
              if (embedData?.description) embed.setDescription(embedData.description);
              if (embedData?.title) embed.setTitle(embedData.title);
              if (embedData?.image) embed.setThumbnail(embedData.image);

              Array.from(factionData.entries()).filter(([K]) => K !== 'common').forEach(async ([K, V]) => {
                const role = await interaction.guild?.roles.fetch(K).catch(() => null);

                embed.addFields({
                  name: `${V.icon} ${role?.name}`,
                  value: V.programs.join('\n'),
                  inline: true
                })
              });

              const messageId = getData('messageId', guild?.id);
              const message = (channelId && messageId) ? await channel.messages.fetch(messageId).catch(() => null) : null;
              const enterBtn = new ButtonBuilder().setCustomId('enter_server').setLabel('Enter').setStyle(ButtonStyle.Success);
              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(enterBtn);

              if (message) {

                message.edit({ embeds: [embed], components: [row] })
                interaction.reply({ content: `Message found and updated in <#${channel.id}>`, flags: MessageFlags.Ephemeral });

              } else {

                const message = await channel.send({ embeds: [embed], components: [row] });

                greeterDB.prepare(
                  `
                  INSERT INTO greeter (guildId, messageId)
                  VALUES (?, ?)
                  ON CONFLICT(guildId) DO UPDATE SET messageId = excluded.messageId;
                  `
                ).run(guild?.id, message.id);

                interaction.reply({ content: `Message sent to <#${channel.id}>`, flags: MessageFlags.Ephemeral });

              }
            } catch (e) { console.log(e) }
          }
        },

      ]
    },

  ]
}

function getData(type: string, guildId: string | undefined): string {
  const row = greeterDB.prepare(
    `SELECT ${type} FROM greeter WHERE guildId = ?`
  ).get(guildId) as any

  return row?.[`${type}`]
}
