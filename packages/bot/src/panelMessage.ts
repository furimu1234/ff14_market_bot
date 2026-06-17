import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ContainerBuilder,
	type MessageActionRowComponentBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
} from 'discord.js';

export const PANEL_CUSTOM_ID_PREFIX = 'panel';
export const DAILY_TOP_PRICE_ALLOWED_GUILD_ID = '1516635142150422538';

export type PanelType = 'myset' | 'market';
export type PanelSettingType = PanelType | 'dailyTop';

/**
 * 管理メニューを生成します。
 */
export const buildPanelAdminMessage = (guildId: string) => {
	const showDailyTopPrice = guildId === DAILY_TOP_PRICE_ALLOWED_GUILD_ID;
	const fields = [
		{
			name: '📌 マイセット表示パネル',
			value: 'ユーザーごとのマイセット価格一覧を表示するボタンを設置します。',
		},
		{
			name: '🛒 アイテム価格表示パネル',
			value: 'アイテム名を入力して価格一覧を表示するボタンを設置します。',
		},
		...(showDailyTopPrice
			? [
					{
						name: '🏆 高額ランキング投稿',
						value:
							'毎日 JST 0:00 に全ワールド最高価格ランキング Top 10 を投稿します。',
					},
				]
			: []),
	];
	const buttons = [
		new ButtonBuilder()
			.setCustomId(createPanelAdminButtonCustomId('myset'))
			.setLabel('📌 マイセット表示パネル')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(createPanelAdminButtonCustomId('market'))
			.setLabel('🛒 アイテム価格表示パネル')
			.setStyle(ButtonStyle.Primary),
		...(showDailyTopPrice
			? [
					new ButtonBuilder()
						.setCustomId(createPanelAdminButtonCustomId('dailyTop'))
						.setLabel('🏆 高額ランキング投稿')
						.setStyle(ButtonStyle.Primary),
				]
			: []),
	];

	return {
		embeds: [
			{
				title: '⚙️ パネル管理',
				description:
					'設置したいパネルを選択してください。次に表示されるチャンネル選択から設置先を選びます。',
				color: 0x3f8fcd,
				fields,
				footer: { text: 'source: universalis / xivapi / cafemaker' },
			},
		],
		components: [
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				...buttons,
			),
		],
		ephemeral: true,
	};
};

/**
 * パネル設置先チャンネル選択 UI を生成します。
 */
export const buildPanelChannelSelectMessage = (panelType: PanelSettingType) => {
	return {
		content: `${getPanelEmoji(panelType)} ${getPanelLabel(panelType)} の設置先チャンネルを選択してください。`,
		components: [
			new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
				new ChannelSelectMenuBuilder()
					.setCustomId(createPanelChannelSelectCustomId(panelType))
					.setPlaceholder('テキストチャンネルを選択')
					.setChannelTypes(ChannelType.GuildText),
			),
		],
		ephemeral: true,
	};
};

/**
 * 指定された種類のパネルメッセージを生成します。
 */
export const buildPanelMessage = (panelType: PanelType) => {
	const container = new ContainerBuilder()
		.setAccentColor(0x3f8fcd)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				panelType === 'myset'
					? [
							'## 📌 マイセット表示パネル',
							'ボタンを押すと、あなたのマイセット価格一覧を表示します。',
						].join('\n')
					: [
							'## 🛒 アイテム価格表示パネル',
							'ボタンを押してアイテム名を入力すると、価格一覧を表示します。',
						].join('\n'),
			),
		)
		.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Small),
		)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				'_source: universalis / xivapi / cafemaker_',
			),
		)
		.addActionRowComponents(
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(createPanelRunButtonCustomId(panelType))
					.setLabel(
						panelType === 'myset' ? '📌 マイセットを表示' : '🛒 価格検索',
					)
					.setStyle(ButtonStyle.Success),
			),
		);

	return {
		flags: ['IsComponentsV2'] as const,
		components: [container],
	};
};

/**
 * パネル管理ボタンの customId を作ります。
 */
export const createPanelAdminButtonCustomId = (panelType: PanelSettingType) => {
	return `${PANEL_CUSTOM_ID_PREFIX}:admin:${panelType}`;
};

/**
 * パネル設置先チャンネル選択の customId を作ります。
 */
export const createPanelChannelSelectCustomId = (
	panelType: PanelSettingType,
) => {
	return `${PANEL_CUSTOM_ID_PREFIX}:channel:${panelType}`;
};

/**
 * パネル実行ボタンの customId を作ります。
 */
export const createPanelRunButtonCustomId = (panelType: PanelType) => {
	return `${PANEL_CUSTOM_ID_PREFIX}:run:${panelType}`;
};

/**
 * パネル価格検索 Modal の customId を作ります。
 */
export const createPanelMarketModalCustomId = () => {
	return `${PANEL_CUSTOM_ID_PREFIX}:modal:market`;
};

/**
 * customId からパネル操作を取り出します。
 */
export const parsePanelCustomId = (customId: string) => {
	const [prefix, action, panelType] = customId.split(':');
	if (prefix !== PANEL_CUSTOM_ID_PREFIX) return undefined;

	if (
		(action === 'admin' || action === 'channel' || action === 'run') &&
		isPanelSettingType(panelType)
	) {
		return { action, panelType } as const;
	}

	if (action === 'modal' && panelType === 'market') {
		return { action, panelType } as const;
	}

	return undefined;
};

const isPanelType = (value: string | undefined): value is PanelType => {
	return value === 'myset' || value === 'market';
};

const isPanelSettingType = (
	value: string | undefined,
): value is PanelSettingType => {
	return isPanelType(value) || value === 'dailyTop';
};

const getPanelEmoji = (panelType: PanelSettingType) => {
	if (panelType === 'myset') return '📌';
	if (panelType === 'market') return '🛒';
	return '🏆';
};

const getPanelLabel = (panelType: PanelSettingType) => {
	if (panelType === 'myset') return 'マイセット表示パネル';
	if (panelType === 'market') return 'アイテム価格表示パネル';
	return '高額ランキング投稿';
};
