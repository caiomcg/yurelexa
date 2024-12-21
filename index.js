import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes, Client, Collection, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
const commands = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

const prepareCommands = async (client) => {
    for (const folder of commandFolders) {
        const commandsPath = join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = `file:///${join(commandsPath, file).replace(/\\/g, '/')}`;
            try {
                const command = await import(filePath);
                if (command.default && 'data' in command.default && 'execute' in command.default) {
                    client.commands.set(command.default.data.name, command.default);
                    commands.push(command.default.data.toJSON());
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            } catch (error) {
                console.log(`[ERROR] Failed to load command at ${filePath}:`, error);
            }
        }
    }
};

const loadEvents = async () => {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = `file:///${path.join(eventsPath, file).replace(/\\/g, '/')}`;
        try {
            const event = await import(filePath);
            if (event.default.once) {
                client.once(event.default.name, (...args) => event.default.execute(...args));
            } else {
                client.on(event.default.name, (...args) => event.default.execute(...args));
            }
        } catch (error) {
            console.log(`[ERROR] Failed to load event at ${filePath}:`, error);
        }
    }
};

const rest = new REST().setToken(DISCORD_TOKEN);

const init = async () => {
    await prepareCommands(client);
    await loadEvents();
    try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
    await client.login(DISCORD_TOKEN);
};

init().catch(console.error);

