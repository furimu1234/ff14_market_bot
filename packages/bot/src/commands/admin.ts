import {
	type ApplicationCommandRegistry,
	Command,
	RegisterBehavior,
} from '@sapphire/framework';
import type { ChatInputCommandInteraction } from 'discord.js';
import { buildPanelAdminMessage } from '../panelMessage';

export class AdminCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: '管理',
			description: 'パネル管理メニューを表示します',
		});
	}

	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.setDMPermission(false),
			{
				behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			},
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		if (!interaction.guildId) {
			await interaction.reply({
				content: '⚠️ このコマンドはサーバー内で使用してください。',
				ephemeral: true,
			});
			return;
		}

		await interaction.reply(buildPanelAdminMessage(interaction.guildId));
	}
}
