import type { DataStoreInterface } from '@ff14_market/db';
import type {
	Interaction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import '@sapphire/pieces';

import type { MakeDataStore } from '@ff14_market/db';

type DataStore = ReturnType<typeof MakeDataStore>;

declare module '@sapphire/pieces' {
	interface Container {
		dataStore: DataStore;
	}
}

export type IContainer = {
	getDataStore: () => DataStoreInterface;
};

export type ContainerRef = { current: IContainer | undefined };
export type slashCommands = RESTPostAPIChatInputApplicationCommandsJSONBody[];

export type commandExecute = (interaction: Interaction) => Promise<void>;
