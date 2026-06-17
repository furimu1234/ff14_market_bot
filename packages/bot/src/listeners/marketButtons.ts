import {
	createHomeWorld,
	createMySetItem,
	deleteMySetItem,
	getHomeWorld,
	getMySetItems,
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
	type Interaction,
	ModalBuilder,
	type ModalSubmitInteraction,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import {
	buildMarketMessage,
	createMarketAmountModalCustomId,
	createMarketHomeWorldSelectCustomId,
	getMarketItemNameFromTitle,
	MARKET_AMOUNT_INPUT_ID,
	parseMarketCustomId,
} from '../marketMessage';
import {
	buildMySetMessage,
	createMySetModalCustomId,
	MY_SET_ITEM_INPUT_ID,
	parseMySetCustomId,
} from '../mySetMessage';

export class MarketButtonsListener extends Listener {
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
			await handleMarketButton(interaction);
			await handleMySetButton(interaction);
			return;
		}

		if (interaction.isModalSubmit()) {
			await handleMarketAmountModal(interaction);
			await handleMySetModal(interaction);
			return;
		}

		if (interaction.isStringSelectMenu()) {
			await handleHomeWorldSelect(interaction);
		}
	}
}

/**
 * 価格一覧 Embed のボタン操作を処理します。
 */
const handleMarketButton = async (interaction: ButtonInteraction) => {
	const parsed = parseMarketCustomId(interaction.customId);
	if (!parsed) return;

	if (parsed.action === 'amount') {
		await interaction.showModal(
			new ModalBuilder()
				.setCustomId(
					createMarketAmountModalCustomId(parsed.itemId, parsed.comparison),
				)
				.setTitle(
					parsed.comparison === 'gte'
						? '指定金額以上に絞り込み'
						: '指定金額以下に絞り込み',
				)
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId(MARKET_AMOUNT_INPUT_ID)
							.setLabel('金額')
							.setPlaceholder('例: 1000')
							.setRequired(true)
							.setStyle(TextInputStyle.Short),
					),
				),
		);
		return;
	}

	if (parsed.action === 'home') {
		await showHomeWorldSelectMenus(interaction);
		return;
	}

	if (parsed.action === 'home-select') return;

	await interaction.deferUpdate();

	const filter =
		parsed.action === 'dc'
			? { type: 'dataCenter' as const, dataCenter: parsed.dataCenter }
			: parsed.action === 'listed'
				? { type: 'listed' as const }
				: { type: 'all' as const };

	await updateMarketMessage(interaction, parsed.itemId, filter);
};

/**
 * ホームワールド選択用の DC 別セレクトメニューを表示します。
 */
const showHomeWorldSelectMenus = async (interaction: ButtonInteraction) => {
	const worlds = await fetchJapanWorlds();
	const worldsByDataCenter = groupWorldsByDataCenter(worlds);

	await interaction.reply({
		content: '🏠 ホームワールドに登録するワールドを選択してください。',
		components: [...worldsByDataCenter.entries()].map(
			([dataCenter, dataCenterWorlds]) =>
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(createMarketHomeWorldSelectCustomId(dataCenter))
						.setPlaceholder(`🗺️ ${dataCenter} から選択`)
						.addOptions(
							dataCenterWorlds.map((world) => ({
								label: world.name,
								value: world.name,
								description: `${dataCenter} / ${world.name}`,
							})),
						),
				),
		),
		ephemeral: true,
	});
};

/**
 * ホームワールド選択メニューの内容を保存します。
 */
const handleHomeWorldSelect = async (
	interaction: StringSelectMenuInteraction,
) => {
	const parsed = parseMarketCustomId(interaction.customId);
	if (parsed?.action !== 'home-select') return;

	const worldName = interaction.values[0];
	if (!worldName) return;

	await container.dataStore.do(async (db) => {
		await createHomeWorld(db, interaction.user.id, worldName);
	});

	await interaction.update({
		content: `✅ ホームワールドを ${worldName} に登録しました。価格一覧を再表示すると反映されます。`,
		components: [],
	});
};

/**
 * マイセット Embed のボタン操作を処理します。
 */
const handleMySetButton = async (interaction: ButtonInteraction) => {
	const parsed = parseMySetCustomId(interaction.customId);
	if (!parsed || (parsed.action !== 'add' && parsed.action !== 'delete')) {
		if (parsed?.action === 'page') {
			await interaction.deferUpdate();
			await updateMySetMessage(interaction, parsed.page);
		}
		return;
	}

	await interaction.showModal(
		new ModalBuilder()
			.setCustomId(createMySetModalCustomId(parsed.action))
			.setTitle(parsed.action === 'add' ? 'マイセット登録' : 'マイセット削除')
			.addComponents(
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId(MY_SET_ITEM_INPUT_ID)
						.setLabel('アイテム名')
						.setPlaceholder('例: シナモン')
						.setRequired(true)
						.setStyle(TextInputStyle.Short),
				),
			),
	);
};

/**
 * 金額入力 Modal の送信内容で価格一覧を絞り込みます。
 */
const handleMarketAmountModal = async (interaction: ModalSubmitInteraction) => {
	const parsed = parseMarketCustomId(interaction.customId);
	if (parsed?.action !== 'amount-modal') return;

	const amountText = interaction.fields.getTextInputValue(
		MARKET_AMOUNT_INPUT_ID,
	);
	const amount = Number(amountText.split(',').join(''));
	if (!Number.isSafeInteger(amount) || amount < 0) {
		await interaction.reply({
			content: '金額は 0 以上の整数で入力してください。',
			ephemeral: true,
		});
		return;
	}

	await interaction.deferUpdate();
	await updateMarketMessage(interaction, parsed.itemId, {
		type: 'price',
		comparison: parsed.comparison,
		amount,
	});
};

/**
 * マイセット登録/削除 Modal の送信内容を処理します。
 */
const handleMySetModal = async (interaction: ModalSubmitInteraction) => {
	const parsed = parseMySetCustomId(interaction.customId);
	if (parsed?.action !== 'modal') return;

	const itemName = interaction.fields.getTextInputValue(MY_SET_ITEM_INPUT_ID);
	const item = await searchItem(itemName);
	if (!item) {
		await interaction.reply({
			content: `「${itemName}」に一致するアイテムが見つかりませんでした。`,
			ephemeral: true,
		});
		return;
	}

	await interaction.deferUpdate();

	if (parsed.mode === 'add') {
		await container.dataStore.do(async (db) => {
			await createMySetItem(db, interaction.user.id, item.id, item.name);
		});
	} else {
		await container.dataStore.do(async (db) => {
			await deleteMySetItem(db, interaction.user.id, item.id);
		});
	}

	await updateMySetMessage(interaction);
};

/**
 * 操作された価格一覧メッセージを最新価格で更新します。
 */
const updateMarketMessage = async (
	interaction: ButtonInteraction | ModalSubmitInteraction,
	itemId: number,
	filter: Parameters<typeof buildMarketMessage>[3],
) => {
	const itemName =
		getMarketItemNameFromTitle(interaction.message?.embeds[0]?.title ?? null) ??
		`Item ${itemId}`;
	const item: ItemSearchResult = { id: itemId, name: itemName };
	const [homeWorld, worlds] = await Promise.all([
		findHomeWorld(interaction.user.id),
		fetchJapanWorlds(),
	]);
	const prices = await fetchJapanPrices(itemId, worlds);

	await interaction.editReply(
		buildMarketMessage(item, prices, homeWorld?.worldName, filter),
	);
};

/**
 * 操作されたマイセットメッセージを更新します。
 */
const updateMySetMessage = async (
	interaction: ButtonInteraction | ModalSubmitInteraction,
	page: number = 0,
) => {
	const [homeWorld, items] = await Promise.all([
		findHomeWorld(interaction.user.id),
		findMySetItems(interaction.user.id),
	]);

	await interaction.editReply(
		await buildMySetMessage(items, homeWorld?.worldName, page),
	);
};

/**
 * ユーザーに登録されているホームワールドを取得します。
 */
const findHomeWorld = async (userId: string) => {
	return await container.dataStore.do(async (db) => {
		return await getHomeWorld(db, userId);
	});
};

/**
 * ユーザーのマイセット登録アイテムを取得します。
 */
const findMySetItems = async (userId: string) => {
	return await container.dataStore.do(async (db) => {
		return await getMySetItems(db, userId);
	});
};

/**
 * ワールド一覧を DC ごとにまとめます。
 */
const groupWorldsByDataCenter = (worlds: WorldEntry[]) => {
	const worldsByDataCenter = new Map<string, WorldEntry[]>();

	for (const world of worlds) {
		const dataCenterWorlds = worldsByDataCenter.get(world.dataCenter);
		if (dataCenterWorlds) {
			dataCenterWorlds.push(world);
		} else {
			worldsByDataCenter.set(world.dataCenter, [world]);
		}
	}

	const entries: [string, WorldEntry[]][] = [...worldsByDataCenter.entries()]
		.map(([dataCenter, dataCenterWorlds]): [string, WorldEntry[]] => [
			dataCenter,
			dataCenterWorlds.sort((a, b) => a.name.localeCompare(b.name)),
		])
		.sort(([a], [b]) => a.localeCompare(b));

	return new Map<string, WorldEntry[]>(entries);
};
