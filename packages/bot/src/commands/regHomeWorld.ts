import { createHomeWorld } from '@ff14_market/db';
import {
	type ApplicationCommandRegistry,
	Command,
	container,
	RegisterBehavior,
} from '@sapphire/framework';
import type { ChatInputCommandInteraction } from 'discord.js';

export class RegHomeWorldCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: 'ホーム登録',
			description: 'ホームワールドを登録します',
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
					.addStringOption((option) =>
						option
							.setName('ワールド名')
							.setDescription('登録するホームワールド名')
							.setRequired(true),
					),
			{
				behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
			},
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });

		const worldName = interaction.options.getString('ワールド名', true);

		await container.dataStore.do(async (db) => {
			await createHomeWorld(db, interaction.user.id, worldName);
		});

		await interaction.followUp(
			`ホームワールドを ${worldName} として登録しました。`,
		);
	}
}
