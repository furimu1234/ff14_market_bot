import {
	type ApplicationCommandRegistry,
	Command,
	RegisterBehavior,
} from '@sapphire/framework';
import { type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

const BOT_MENTION = '<@1516471838052712640>';

export class HelpCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: 'ヘルプ',
			description: 'BOTの使い方を表示します',
		});
	}

	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand(
			(builder) => builder.setName(this.name).setDescription(this.description),
			{
				behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			},
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle('📖 FF14 Market Bot ヘルプ')
					.setColor(0x3f8fcd)
					.setDescription(
						[
							'FF14 の日本DCマーケット価格を検索できます。',
							'価格は単価のみを表示します。',
						].join('\n'),
					)
					.addFields(
						{
							name: '🛒 価格検索',
							value: [
								`${BOT_MENTION} \`アイテム名\` で価格一覧を表示します。`,
								`${BOT_MENTION} \`アイテム1 アイテム2\` のように複数アイテムも検索できます。`,
							].join('\n'),
						},
						{
							name: '📌 マイセット',
							value: [
								`${BOT_MENTION} \`マイセット\` で登録済みアイテムの最安値一覧を表示します。`,
								'表示内の `マイセット登録` / `マイセット削除` ボタンからアイテム名を入力できます。',
								'件数が多い場合は `前へ` / `次へ` でページ移動できます。',
							].join('\n'),
						},
						{
							name: '🏠 ホームワールド',
							value: [
								'`/ホーム登録` でホームワールドを登録できます。',
								'価格一覧の `ホームワールド変更` ボタンからも DC 別メニューで登録できます。',
								'ホームワールド登録済みの場合、該当 DC とワールドが優先表示されます。',
							].join('\n'),
						},
						{
							name: '🔎 絞り込み',
							value: [
								'価格一覧のボタンで DC、金額以上/以下、出品ありのみを絞り込めます。',
								'金額絞り込みはボタン押下後の入力欄に金額を入れてください。',
							].join('\n'),
						},
						{
							name: '⚙️ 管理パネル',
							value: [
								'`/管理` でサーバーごとのパネル管理メニューを表示します。',
								'マイセット表示パネル、アイテム価格表示パネルを指定チャンネルに設置できます。',
								'高額ランキング投稿を設定すると、毎日 JST 0:00 に Top 10 を投稿します。',
								'設置先チャンネルに投稿があるたび、パネルは最新の位置へ作り直されます。',
							].join('\n'),
						},
					)
					.setFooter({ text: 'source: universalis / xivapi / cafemaker' }),
			],
			ephemeral: true,
		});
	}
}
