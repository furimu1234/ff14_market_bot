import {
	ActionRowBuilder,
	type AnySelectMenuInteraction,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CacheType,
	type CommandInteraction,
	ComponentType,
	type EmbedBuilder,
	type LabelBuilder,
	type Message,
	type MessageActionRowComponentBuilder,
	MessageFlags,
	ModalBuilder,
	type ModalSubmitInteraction,
	type SendableChannels,
	type TextDisplayBuilder,
} from 'discord.js';
import { sendMessageThenDelete } from '.';
import { generateRandomString } from './random';

type ModalField =
	| { type: 'label'; builder: LabelBuilder }
	| { type: 'text'; builder: TextDisplayBuilder };

interface ModalProp {
	customId: string;
	title: string;
	fields: ModalField[];
}
export const confirmDialog = (sendableChannel?: SendableChannels) => {
	const okCustomId = generateRandomString();
	const noCustomId = generateRandomString();

	let okStyle = ButtonStyle.Success;
	let noStyle = ButtonStyle.Danger;
	let okLabel = '続行';
	let noLabel = 'キャンセル';
	let cancelMessage = 'キャンセルしました。処理を中断します。';

	const setOkStyle = (style: ButtonStyle) => {
		okStyle = style;
	};

	const setNoStyle = (style: ButtonStyle) => {
		noStyle = style;
	};

	const setOkLabel = (label: string) => {
		okLabel = label;
	};
	const setNoLabel = (label: string) => {
		noLabel = label;
	};
	const setCancelMessage = (message: string) => {
		cancelMessage = message;
	};

	const ephemeralReply = async (
		question: string,
		interaction:
			| ButtonInteraction
			| AnySelectMenuInteraction
			| ModalSubmitInteraction
			| CommandInteraction,
		cancel?: {
			sendMessage: boolean;
		},
	) => {
		const content = `${question}\n\n3分経過すると処理が中断します。`;

		const row =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(okCustomId)
					.setLabel(okLabel)
					.setStyle(okStyle),
				new ButtonBuilder()
					.setCustomId(noCustomId)
					.setLabel(noLabel)
					.setStyle(noStyle),
			);

		let reply: Message<boolean>;

		if (!interaction.deferred && !interaction.replied) {
			const response = await interaction.reply({
				content,
				components: [row],
				withResponse: true,
				flags: MessageFlags.Ephemeral,
			});

			const message = response.resource?.message;
			if (!message) {
				return { interaction, isSuccess: false };
			}

			reply = message;
		} else {
			reply = await interaction.followUp({
				content,
				components: [row],
				flags: MessageFlags.Ephemeral,
			});
		}

		try {
			interaction = await reply.awaitMessageComponent({
				componentType: ComponentType.Button,
				time: 3 * 60 * 1000,
			});
		} catch (e) {
			console.error(e);
			// timeout処理
			return { interaction, isSuccess: false };
		}

		const deleteReplyLater = () => {
			setTimeout(() => {
				reply.delete().catch(() => null);
			}, 60 * 1000);
		};

		if (interaction.customId === okCustomId) {
			deleteReplyLater();
			return { interaction, isSuccess: true };
		} else if (interaction.customId === noCustomId && cancel) {
			await interaction.deferUpdate();
			deleteReplyLater();

			if (cancel.sendMessage)
				sendMessageThenDelete(
					{
						content: cancelMessage,
						sleepSecond: 60,
						flags: MessageFlags.Ephemeral,
					},
					interaction,
				).catch(() => null);
			return { interaction: interaction, isSuccess: false };
		} else {
			await interaction.deferUpdate();
			deleteReplyLater();
			return { interaction: interaction, isSuccess: false };
		}
	};

	const send = async (question: string, isCancel: boolean) => {
		if (!sendableChannel) return;
		const row =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(okCustomId)
					.setLabel(okLabel)
					.setStyle(okStyle),
				new ButtonBuilder()
					.setCustomId(noCustomId)
					.setLabel(noLabel)
					.setStyle(noStyle),
			);

		const panel = await sendableChannel.send({
			content: `${question}\n3分経過すると処理が中断します。`,
			components: [row],
		});
		const reply = await panel.fetch();

		let interaction: ButtonInteraction<CacheType> | undefined;

		try {
			interaction = await reply.awaitMessageComponent({
				componentType: ComponentType.Button,
				time: 3 * 60 * 1000,
			});
		} catch {
			await sendMessageThenDelete({ sleepSecond: 15, content: cancelMessage });
			return undefined;
		}

		if (interaction.customId === okCustomId) {
			return interaction;
		} else if (interaction.customId === noCustomId && isCancel) {
			await interaction.deferUpdate();
			await interaction.deleteReply();

			await sendMessageThenDelete(
				{
					sleepSecond: 15,
					content: cancelMessage,
				},
				interaction,
			);
			return undefined;
		} else {
			await interaction.deferUpdate();
			await interaction.deleteReply();
			return undefined;
		}
	};
	const sendEmbed = async (embed: EmbedBuilder, isCancel: boolean) => {
		if (!sendableChannel) return;
		const row =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(okCustomId)
					.setLabel(okLabel)
					.setStyle(okStyle),
				new ButtonBuilder()
					.setCustomId(noCustomId)
					.setLabel(noLabel)
					.setStyle(noStyle),
			);

		const panel = await sendableChannel.send({
			content: `3分経過すると処理が中断します。`,
			embeds: [embed],
			components: [row],
		});
		const reply = await panel.fetch();

		let interaction: ButtonInteraction<CacheType> | undefined;

		try {
			interaction = await reply.awaitMessageComponent({
				componentType: ComponentType.Button,
				time: 3 * 60 * 1000,
			});
		} catch {
			await sendMessageThenDelete({ sleepSecond: 15, content: cancelMessage });
			return undefined;
		}

		if (interaction.customId === okCustomId) {
			return interaction;
		} else if (interaction.customId === noCustomId && isCancel) {
			await interaction.deferUpdate();
			await interaction.deleteReply();

			await sendMessageThenDelete(
				{
					sleepSecond: 15,
					content: cancelMessage,
				},
				interaction,
			);
			return undefined;
		} else {
			await interaction.deferUpdate();
			await interaction.deleteReply();
			return undefined;
		}
	};

	const modalBuild = (prop: ModalProp) => {
		const modalBuilder = new ModalBuilder()
			.setTitle(prop.title)
			.setCustomId(prop.customId);

		for (const f of prop.fields) {
			if (f.type === 'label') {
				modalBuilder.addLabelComponents(f.builder);
			} else {
				modalBuilder.addTextDisplayComponents(f.builder);
			}
		}

		return modalBuilder;
	};

	return {
		setCancelMessage,
		setOkLabel,
		setOkStyle,
		setNoLabel,
		setNoStyle,
		send,
		sendEmbed,
		modalBuild,
		ephemeralReply,
	};
};
