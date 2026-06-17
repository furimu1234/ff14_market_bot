import {
	fetchJapanPrices,
	fetchJapanWorlds,
	type WorldPrice,
} from '@ff14_market/universalis';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	type MessageActionRowComponentBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
} from 'discord.js';

export const MY_SET_CUSTOM_ID_PREFIX = 'myset';
export const MY_SET_ITEM_INPUT_ID = 'itemName';
const MY_SET_PAGE_SIZE = 20;
const SOURCE_FOOTER_TEXT = 'source: universalis / xivapi / cafemaker';

type MySetItem = {
	itemId: number;
	itemName: string;
};

type MySetSummary = {
	itemName: string;
	lowestPrice: WorldPrice | undefined;
	homeWorldPrice: WorldPrice | undefined;
};

/**
 * マイセット価格一覧 Embed と登録/削除ボタンを生成します。
 */
export const buildMySetMessage = async (
	items: MySetItem[],
	homeWorldName: string | undefined,
	page: number = 0,
) => {
	const summaries = await fetchMySetSummaries(items, homeWorldName);
	const totalPages = Math.max(
		1,
		Math.ceil(summaries.length / MY_SET_PAGE_SIZE),
	);
	const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
	const pageSummaries = summaries.slice(
		currentPage * MY_SET_PAGE_SIZE,
		(currentPage + 1) * MY_SET_PAGE_SIZE,
	);
	const container = new ContainerBuilder()
		.setAccentColor(0x3f8fcd)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					`## 📌 マイセット 価格一覧${homeWorldName ? ` | 🏠 ${homeWorldName}` : ''}`,
					'🏆 全ワールド最安値と 🏠 ホームワールド最安値を表示します。',
					`ページ: ${currentPage + 1} / ${totalPages}`,
				].join('\n'),
			),
		);

	if (items.length === 0) {
		container
			.addSeparatorComponents(createItemSeparator())
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						'### 📭 未登録',
						'➕ 登録ボタンからアイテムを追加してください。',
					].join('\n'),
				),
			);
	} else {
		for (const summary of pageSummaries) {
			container
				.addSeparatorComponents(createItemSeparator())
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						[
							`### 📦 ${summary.itemName}`,
							`🏆 全ワールド: ${formatWorldPrice(summary.lowestPrice)}`,
							...(homeWorldName
								? [
										`🏠 ホームワールド: ${formatWorldPrice(summary.homeWorldPrice)}`,
									]
								: []),
						].join('\n'),
					),
				);
		}
	}

	container
		.addSeparatorComponents(createItemSeparator())
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`_${SOURCE_FOOTER_TEXT}_`),
		)
		.addActionRowComponents(buildMySetActionRow(currentPage, totalPages));

	return {
		flags: ['IsComponentsV2'] as const,
		components: [container],
	};
};

/**
 * マイセット登録ボタンの customId を作ります。
 */
export const createMySetAddCustomId = () => {
	return `${MY_SET_CUSTOM_ID_PREFIX}:add`;
};

/**
 * マイセット削除ボタンの customId を作ります。
 */
export const createMySetDeleteCustomId = () => {
	return `${MY_SET_CUSTOM_ID_PREFIX}:delete`;
};

/**
 * マイセットページ操作ボタンの customId を作ります。
 */
export const createMySetPageCustomId = (
	page: number,
	direction: 'prev' | 'next',
) => {
	return `${MY_SET_CUSTOM_ID_PREFIX}:page:${page}:${direction}`;
};

/**
 * マイセット登録/削除 Modal の customId を作ります。
 */
export const createMySetModalCustomId = (action: 'add' | 'delete') => {
	return `${MY_SET_CUSTOM_ID_PREFIX}:modal:${action}`;
};

/**
 * customId からマイセット操作の内容を取り出します。
 */
export const parseMySetCustomId = (customId: string) => {
	const [prefix, action, mode] = customId.split(':');
	if (prefix !== MY_SET_CUSTOM_ID_PREFIX) return undefined;

	if (action === 'add' || action === 'delete') {
		return { action } as const;
	}

	if (action === 'page') {
		const page = Number(mode);
		if (!Number.isSafeInteger(page) || page < 0) return undefined;
		return { action, page } as const;
	}

	if (action === 'modal' && (mode === 'add' || mode === 'delete')) {
		return { action, mode } as const;
	}

	return undefined;
};

/**
 * 登録アイテムごとの最安値情報を取得します。
 */
const fetchMySetSummaries = async (
	items: MySetItem[],
	homeWorldName: string | undefined,
): Promise<MySetSummary[]> => {
	const worlds = await fetchJapanWorlds();
	const normalizedHomeWorldName = homeWorldName?.toLowerCase();

	return await Promise.all(
		items.map(async (item) => {
			const prices = await fetchJapanPrices(item.itemId, worlds);
			const listedPrices = prices.filter(
				(price) => price.pricePerUnit !== undefined,
			);
			const lowestPrice = [...listedPrices].sort(
				(a, b) => (a.pricePerUnit ?? 0) - (b.pricePerUnit ?? 0),
			)[0];
			const homeWorldPrice = prices.find(
				(price) => price.name.toLowerCase() === normalizedHomeWorldName,
			);

			return {
				itemName: item.itemName,
				lowestPrice,
				homeWorldPrice,
			};
		}),
	);
};

/**
 * マイセット操作用のボタン行を生成します。
 */
const buildMySetActionRow = (currentPage: number, totalPages: number) => {
	return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(
				createMySetPageCustomId(Math.max(0, currentPage - 1), 'prev'),
			)
			.setLabel('⬅️ 前へ')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(currentPage <= 0),
		new ButtonBuilder()
			.setCustomId(
				createMySetPageCustomId(
					Math.min(totalPages - 1, currentPage + 1),
					'next',
				),
			)
			.setLabel('➡️ 次へ')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(currentPage >= totalPages - 1),
		new ButtonBuilder()
			.setCustomId(createMySetAddCustomId())
			.setLabel('➕ マイセット登録')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId(createMySetDeleteCustomId())
			.setLabel('🗑️ マイセット削除')
			.setStyle(ButtonStyle.Danger),
	);
};

/**
 * アイテムごとの区切り線を生成します。
 */
const createItemSeparator = () => {
	return new SeparatorBuilder()
		.setDivider(true)
		.setSpacing(SeparatorSpacingSize.Small);
};

/**
 * 単価情報を表示用文字列にします。
 */
const formatWorldPrice = (price: WorldPrice | undefined) => {
	if (!price || price.pricePerUnit === undefined) return '出品なし';

	return `${price.dataCenter} / ${price.name}: ${price.pricePerUnit.toLocaleString('ja-JP')} gil${
		price.hq ? ' HQ' : ''
	}`;
};
