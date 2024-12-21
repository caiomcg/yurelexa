import { SlashCommandBuilder } from "discord.js";
import timeParser from '../../timeParser.js';
import alarm from '../../alarm.js';

export default {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('yurelexa')
        .setDescription('notify the user about an appointment')
        .addStringOption(option =>
            option
                .setMinLength(1)
                .setMaxLength(100)
                .setName('time')
                .setDescription('The time for the notification')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Message to show in the notification')
                .setRequired(false)
        ),
    async execute(interaction) {
        try {
            const timeInput = interaction.options.getString('time');
            // Parse the time
            const dateTime = timeParser.parse(timeInput);

            // Changed this part - now just passing interaction
            const { confirmationMessage } = alarm.scheduleAlarm(
                dateTime,
                interaction  // Only passing the interaction object
            );

            await interaction.reply(confirmationMessage);
        } catch (error) {
            await interaction.reply({
                content: `❌ Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
