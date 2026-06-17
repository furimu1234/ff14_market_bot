import { MakeDataStore, schema } from '@ff14_market/db';
import { container, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

dotenv.config({ path: '../../.env' });

export class BotClient extends SapphireClient {
	public constructor() {
		super({
			baseUserDirectory: __dirname,
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildPresences,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMessageReactions,
			],
			partials: [
				Partials.GuildMember,
				Partials.User,
				Partials.Message,
				Partials.Channel,
				Partials.Reaction,
			],
			loadMessageCommandListeners: true,
			defaultPrefix: 'fm!',
		});

		this.setMaxListeners(0);
	}

	public async setup() {
		const pool = new Pool({
			connectionString: process.env.PG_URL,
		});

		const db = drizzle<typeof schema>(pool, { schema });
		const dataStore = MakeDataStore(db);

		container.dataStore = dataStore;
		// const migrationsFolder = '../db/drizzle';
		// await migrate(db, { migrationsFolder: migrationsFolder });
		// console.log('migrate done');
	}

	public async start() {
		await this.setup();

		const token = process.env.TOKEN;
		if (!token) throw new Error('TOKEN is not set');

		return this.login(token);
	}
}

const client = new BotClient();
client
	.start()
	.then(() => console.log('login'))
	.catch((e) => console.log('error', e));
