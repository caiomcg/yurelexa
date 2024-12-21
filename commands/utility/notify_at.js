import { SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('notify_at')
        .setDescription('notify the user about an appointment after a specific amount of time')
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription('The time for the notification')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.reply(`${interaction.user.username} notifying your ass`);
    }
};
