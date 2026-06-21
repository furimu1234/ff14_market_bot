import {
	getGuildPanel,
	getHomeWorld,
	getMySetItems,
	upsertGuildPanel,
} from '@ff14_market/db';
import {
	fetchJapanPrices,
	fetchJapanWorlds,
	type ItemSearchResult,
	searchItem,
	type WorldEntry,
} from '@ff14_market/universalis';
import { container, Listener } from '@sapphire/framework';
import {
	ActionRowBuilder,
	type ButtonInteraction,
	type ChannelSelectMenuInteraction,
	type Interaction,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { DAILY_TOP_PRICE_CALCULATION_CUSTOM_ID } from '../dailyTopPriceMessage';
import { buildMarketMessage } from '../marketMessage';
import { buildMySetMessage } from '../mySetMessage';
import {
	buildPanelChannelSelectMessage,
	buildPanelMessage,
	createPanelMarketModalCustomId,
	DAILY_TOP_PRICE_ALLOWED_GUILD_ID,
	type PanelType,
	parsePanelCustomId,
} from '../panelMessage';

const PANEL_MARKET_ITEM_INPUT_ID = 'itemNames';

export class PanelInteractionsListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			event: 'interactionCreate',
		});
	}

	public override async run(interaction: Interaction) {
		if (interaction.isButton()) {
			await handlePanelButton(interaction);
			return;
		}

		if (interaction.isChannelSelectMenu()) {
			await handlePanelChannelSelect(interaction);
			return;
		}

		if (interaction.isModalSubmit()) {
			await handlePanelMarketModal(interaction);
		}
	}
}

/**
 * パネル管理/実行ボタンを処理します。
 */
const handlePanelButton = async (interaction: ButtonInteraction) => {
	if (interaction.customId === DAILY_TOP_PRICE_CALCULATION_CUSTOM_ID) {
		await interaction.reply({
			content: [
				'📈 **需要ランキングの計算方法**',
				'最安値が 1,000,000 gil 以下のアイテムを対象にします。',
				'その中から、最近の売れ行きが確認できるアイテムを優先します。',
				'ランキング順は「売れ行き」と「最安値」を組み合わせて決めています。',
				'売れ行きが高く、価格も高いアイテムほど上位になりやすいです。',
				'ランキング本文では見やすさを優先し、計算用の数値は表示していません。',
			].join('\n'),
			ephemeral: true,
		});
		return;
	}

	const parsed = parsePanelCustomId(interaction.customId);
	if (!parsed) return;

	if (
		parsed.panelType === 'dailyTop' &&
		interaction.guildId !== DAILY_TOP_PRICE_ALLOWED_GUILD_ID
	) {
		await interaction.reply({
			content: '⚠️ この機能はこのサーバーでは使用できません。',
			ephemeral: true,
		});
		return;
	}

	if (parsed.action === 'admin') {
		await interaction.reply(buildPanelChannelSelectMessage(parsed.panelType));
		return;
	}

	if (parsed.action === 'run' && parsed.panelType === 'myset') {
		await interaction.deferReply({ ephemeral: true });
		const [homeWorld, items] = await Promise.all([
			findHomeWorld(interaction.user.id),
			findMySetItems(interaction.user.id),
		]);
		await interaction.editReply(
			await buildMySetMessage(items, homeWorld?.worldName),
		);
		return;
	}

	if (parsed.action === 'run' && parsed.panelType === 'market') {
		await interaction.showModal(
			new ModalBuilder()
				.setCustomId(createPanelMarketModalCustomId())
				.setTitle('アイテム価格検索')
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId(PANEL_MARKET_ITEM_INPUT_ID)
							.setLabel('アイテム名')
							.setPlaceholder('例: シナモン または シナモン 鉄鉱')
							.setRequired(true)
							.setStyle(TextInputStyle.Short),
					),
				),
		);
	}
};

/**
 * パネル設置先チャンネル選択を保存し、指定チャンネルにパネルを設置します。
 */
const handlePanelChannelSelect = async (
	interaction: ChannelSelectMenuInteraction,
) => {
	const parsed = parsePanelCustomId(interaction.customId);
	if (parsed?.action !== 'channel' || !interaction.guildId) return;

	if (
		parsed.panelType === 'dailyTop' &&
		interaction.guildId !== DAILY_TOP_PRICE_ALLOWED_GUILD_ID
	) {
		await interaction.reply({
			content: '⚠️ この機能はこのサーバーでは使用できません。',
			ephemeral: true,
		});
		return;
	}

	const channelId = interaction.values[0];
	if (!channelId) return;

	await interaction.deferUpdate();
	await container.dataStore.do(async (db) => {
		return await upsertGuildPanel(
			db,
			interaction.guildId ?? '',
			parsed.panelType,
			channelId,
		);
	});

	if (parsed.panelType === 'dailyTop') {
		await interaction.editReply({
			content: `📈 <#${channelId}> を毎日 JST 0:30 の需要ランキング更新先に設定しました。`,
			components: [],
		});
		return;
	}

	await sendPanelMessage(interaction, parsed.panelType, channelId);
	await interaction.editReply({
		content: `✅ <#${channelId}> にパネルを設置しました。`,
		components: [],
	});
};

/**
 * パネルのアイテム価格検索 Modal を処理します。
 */
const handlePanelMarketModal = async (interaction: ModalSubmitInteraction) => {
	const parsed = parsePanelCustomId(interaction.customId);
	if (parsed?.action !== 'modal' || parsed.panelType !== 'market') return;

	await interaction.deferReply({ ephemeral: true });

	const itemNames = interaction.fields
		.getTextInputValue(PANEL_MARKET_ITEM_INPUT_ID)
		.split(/\s+/)
		.filter((itemName) => itemName.length > 0);
	const [homeWorld, worlds] = await Promise.all([
		findHomeWorld(interaction.user.id),
		fetchJapanWorlds(),
	]);
	const messages = await buildMarketMessages(
		itemNames,
		worlds,
		homeWorld?.worldName,
	);

	const [firstMessage, ...restMessages] = messages;
	if (firstMessage) await interaction.editReply(firstMessage);
	for (const message of restMessages) {
		await interaction.followUp({ ...message, ephemeral: true });
	}
};

/**
 * 指定チャンネルにパネルを送信し、DB の messageId を更新します。
 */
export const sendPanelMessage = async (
	interaction: Interaction,
	panelType: PanelType,
	channelId: string,
) => {
	const channel = await interaction.client.channels.fetch(channelId);
	if (!channel?.isSendable()) return;

	const previousPanel = await container.dataStore.do(async (db) => {
		return await getGuildPanel(db, interaction.guildId ?? '', panelType);
	});
	if (previousPanel?.messageId && 'messages' in channel) {
		await channel.messages.delete(previousPanel.messageId).catch(() => {});
	}

	const message = await channel.send(buildPanelMessage(panelType));
	await container.dataStore.do(async (db) => {
		await upsertGuildPanel(
			db,
			interaction.guildId ?? '',
			panelType,
			channelId,
			message.id,
		);
	});
};

/**
 * 複数アイテムの価格表示メッセージを生成します。
 */
const buildMarketMessages = async (
	itemNames: string[],
	worlds: WorldEntry[],
	homeWorldName: string | undefined,
) => {
	const messages = [];
	const missingItemNames: string[] = [];

	for (const itemName of itemNames) {
		const item = await searchItem(itemName);
		if (!item) {
			missingItemNames.push(itemName);
			continue;
		}

		messages.push(await buildSingleMarketMessage(item, worlds, homeWorldName));
	}

	if (missingItemNames.length > 0) {
		messages.push({
			content: `見つからなかったアイテム: ${missingItemNames
				.map((itemName) => `「${itemName}」`)
				.join('、')}`,
		});
	}

	if (messages.length === 0) {
		return [{ content: '一致するアイテムが見つかりませんでした。' }];
	}

	return messages;
};

/**
 * 1 アイテム分の価格表示メッセージを生成します。
 */
const buildSingleMarketMessage = async (
	item: ItemSearchResult,
	worlds: WorldEntry[],
	homeWorldName: string | undefined,
) => {
	const prices = await fetchJapanPrices(item.id, worlds);
	return buildMarketMessage(item, prices, homeWorldName);
};

const findHomeWorld = async (userId: string) => {
	return await container.dataStore.do(async (db) => {
		return await getHomeWorld(db, userId);
	});
};

const findMySetItems = async (userId: string) => {
	return await container.dataStore.do(async (db) => {
		return await getMySetItems(db, userId);
	});
};
