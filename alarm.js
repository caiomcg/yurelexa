import { DateTime } from 'luxon';
import {
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    getVoiceConnection,
    AudioPlayerStatus
} from '@discordjs/voice';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Alarm {
    constructor() {
        this.alarms = new Map();
        this.checkInterval = 1000;
        this.audioPlayer = createAudioPlayer();
        this.startChecking();

        this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            this.cleanupVoiceConnections();
        });
    }

    scheduleAlarm(dateTime, interaction) {
        const alarmId = this.generateId();

        // Store all necessary information at creation time
        this.alarms.set(alarmId, {
            dateTime,
            userId: interaction.user.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            message: interaction.options.getString('message') || 'Time is up!',
            created: DateTime.now(),
            client: interaction.client,
            // Store guild and channel objects
            guild: interaction.guild,
            channel: interaction.channel
        });

        const timeUntilAlarm = dateTime.diff(DateTime.now());
        const duration = this.formatDuration(timeUntilAlarm);

        return {
            alarmId,
            confirmationMessage: `✅ Alarm set! I'll notify you in ${duration}`
        };
    }

    async findUserVoiceChannel(alarm) {
        try {
            const guild = alarm.guild;
            if (!guild) return null;

            const member = await guild.members.fetch(alarm.userId);
            return member?.voice?.channel;
        } catch (error) {
            console.error('Error finding voice channel:', error);
            return null;
        }
    }

    async playAlarmSound(voiceChannel) {
        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            // Try to load the alarm sound with error handling
            try {
                const resource = createAudioResource(join(__dirname, 'assets', 'alarm.mp3'), {
                    inlineVolume: true
                });

                // Set a reasonable volume
                if (resource.volume) {
                    resource.volume.setVolume(0.5);
                }

                connection.subscribe(this.audioPlayer);
                this.audioPlayer.play(resource);
            } catch (audioError) {
                console.error('Error creating audio resource:', audioError);
                connection.destroy();
            }

        } catch (error) {
            console.error('Error connecting to voice channel:', error);
        }
    }

    cleanupVoiceConnections() {
        for (const [_, alarm] of this.alarms) {
            if (alarm.guild) {
                const connection = getVoiceConnection(alarm.guild.id);
                if (connection) {
                    connection.destroy();
                }
            }
        }
    }

    async checkAlarms() {
        const now = DateTime.now();

        for (const [alarmId, alarm] of this.alarms.entries()) {
            if (now >= alarm.dateTime) {
                try {
                    await this.triggerAlarm(alarmId, alarm);
                } catch (error) {
                    console.error(`Failed to trigger alarm ${alarmId}:`, error);
                }
                this.alarms.delete(alarmId);
            }
        }
    }

    async triggerAlarm(alarmId, alarm) {
        try {
            // Try voice channel
            try {
                const voiceChannel = await this.findUserVoiceChannel(alarm);
                if (voiceChannel && voiceChannel.joinable) {
                    await this.playAlarmSound(voiceChannel);
                }
            } catch (voiceError) {
                console.warn('Could not play voice notification:', voiceError.message);
            }

            // Try DM as last resort
            try {
                const user = await alarm.client.users.fetch(alarm.userId);
                await user.send(`🔔 **Alarm!** ${alarm.message}`);
            } catch (dmError) {
                console.warn('Could not send DM:', dmError.message);
            }
        } catch (error) {
            console.error('Error in triggerAlarm:', error);
        } finally {
            // Always clean up the alarm
            this.alarms.delete(alarmId);
        }
    }
    startChecking() {
        setInterval(() => this.checkAlarms(), this.checkInterval);
    }

    generateId() {
        return `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatDuration(duration) {
        const hours = Math.floor(duration.as('hours'));
        const minutes = Math.floor(duration.as('minutes') % 60);
        const seconds = Math.floor(duration.as('seconds') % 60);

        const parts = [];
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (hours === 0 && minutes === 0 && seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

        return parts.join(' and ');
    }

    getUserAlarms(userId) {
        return Array.from(this.alarms.entries())
            .filter(([_, alarm]) => alarm.userId === userId)
            .map(([id, alarm]) => ({
                id,
                time: alarm.dateTime,
                message: alarm.message
            }));
    }

    cancelAlarm(alarmId, userId) {
        const alarm = this.alarms.get(alarmId);
        if (!alarm || alarm.userId !== userId) {
            return false;
        }

        this.alarms.delete(alarmId);
        return true;
    }
}

export default new Alarm();
