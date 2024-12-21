import { DateTime } from "luxon";

class TimeParser {
    constructor() {
        this.patterns = {
            universal: {
                twentyFourHour: /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/,
                twelveHour: /^(1[0-2]|0?[1-9]):([0-5][0-9])(?::([0-5][0-9]))?\s*(am|pm|AM|PM)$/,
                compactTime: /^(\d+)h(?:(\d+)m)?(?:(\d+)s)?$/i
            },
            en: {
                naturalMinutes: /^(?:in\s*)?(\d+)\s*min(?:ute)?s?$/i,
                naturalHours: /^(?:in\s*)?(\d+(?:\.\d+)?)\s*h(?:ou)?rs?$/i,
                naturalHalfHour: /^(?:in\s*)?(one|1)\s*and\s*(?:a\s*)?half\s*h(?:ou)?rs?$/i,
                oneHour: /^(?:in\s*)?(?:one|1)\s*h(?:ou)?r$/i,
                halfHour: /^(?:in\s*)?half\s*(?:an\s*)?h(?:ou)?r$/i,
                quarterHour: /^(?:in\s*)?(?:a\s*)?quarter\s*(?:of\s*an\s*)?h(?:ou)?r$/i,
                naturalSeconds: /^(?:in\s*)?(\d+)\s*sec(?:ond)?s?$/i
            },
            pt: {
                naturalMinutes: /^(?:em|daqui a)?\s*(\d+)\s*min(?:uto)?s?$/i,
                naturalHours: /^(?:em|daqui a)?\s*(\d+(?:\.\d+)?)\s*h(?:ora)?s?$/i,
                naturalHalfHour: /^(?:em|daqui a)?\s*(?:uma|1)\s*(?:hora\s*)?e\s*meia$/i,
                oneHour: /^(?:em|daqui a)?\s*(?:uma|1)\s*hora$/i,
                halfHour: /^(?:em|daqui a)?\s*meia\s*hora$/i,
                quarterHour: /^(?:em|daqui a)?\s*(?:um\s*)?quarto\s*de\s*hora$/i,
                naturalSeconds: /^(?:em|daqui a)?\s*(\d+)\s*seg(?:undo)?s?$/i
            }
        };

        this.languageIndicators = {
            pt: ['daqui', 'hora', 'horas', 'minuto', 'minutos', 'meia', 'quarto', 'em', 'segundo', 'segundos'],
            en: ['hour', 'hours', 'minute', 'minutes', 'quarter', 'half', 'in', 'second', 'seconds']
        };
    }

    detectLanguage(timeString) {
        timeString = timeString.toLowerCase();

        for (const [lang, indicators] of Object.entries(this.languageIndicators)) {
            if (indicators.some(indicator => timeString.includes(indicator))) {
                return lang;
            }
        }

        return 'en';
    }

    parse(timeString) {
        timeString = timeString.trim();
        const language = this.detectLanguage(timeString);

        const parsedTime =
            this.parseTwentyFourHour(timeString) ||
            this.parseTwelveHour(timeString) ||
            this.parseCompactTime(timeString) ||
            this.parseNaturalTime(timeString, language);

        if (!parsedTime) {
            throw new Error(language === 'pt' ? 'Formato de tempo inválido' : 'Invalid time format');
        }

        return parsedTime;
    }

    parseTwentyFourHour(timeString) {
        const match = timeString.match(this.patterns.universal.twentyFourHour);
        if (!match) return null;

        const [_, hours, minutes, seconds = 0] = match;
        const now = DateTime.now();
        let result = now.set({
            hour: parseInt(hours),
            minute: parseInt(minutes),
            second: parseInt(seconds),
            millisecond: 0
        });

        if (result < now) {
            result = result.plus({ days: 1 });
        }

        return result;
    }

    parseTwelveHour(timeString) {
        const match = timeString.match(this.patterns.universal.twelveHour);
        if (!match) return null;

        let [_, hours, minutes, seconds = 0, period] = match;
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        seconds = parseInt(seconds);
        period = period.toLowerCase();

        if (period === 'pm' && hours !== 12) {
            hours += 12;
        } else if (period === 'am' && hours === 12) {
            hours = 0;
        }

        const now = DateTime.now();
        let result = now.set({
            hour: hours,
            minute: minutes,
            second: seconds,
            millisecond: 0
        });

        if (result < now) {
            result = result.plus({ days: 1 });
        }

        return result;
    }

    parseCompactTime(timeString) {
        const match = timeString.match(this.patterns.universal.compactTime);
        if (!match) return null;

        const [_, hours, minutes = 0, seconds = 0] = match;
        return DateTime.now().plus({
            hours: parseInt(hours) || 0,
            minutes: parseInt(minutes) || 0,
            seconds: parseInt(seconds) || 0
        });
    }

    parseNaturalTime(timeString, language) {
        const now = DateTime.now();
        const patterns = this.patterns[language];

        let match;

        // Seconds
        match = timeString.match(patterns.naturalSeconds);
        if (match) {
            const seconds = parseInt(match[1]);
            return now.plus({ seconds });
        }

        // Minutes
        match = timeString.match(patterns.naturalMinutes);
        if (match) {
            const minutes = parseInt(match[1]);
            return now.plus({ minutes });
        }

        // Hours with decimal
        match = timeString.match(patterns.naturalHours);
        if (match) {
            const hours = parseFloat(match[1]);
            return now.plus({ hours });
        }

        // One and a half hours
        match = timeString.match(patterns.naturalHalfHour);
        if (match) {
            return now.plus({ hours: 1, minutes: 30 });
        }

        // One hour
        match = timeString.match(patterns.oneHour);
        if (match) {
            return now.plus({ hours: 1 });
        }

        // Half hour
        match = timeString.match(patterns.halfHour);
        if (match) {
            return now.plus({ minutes: 30 });
        }

        // Quarter hour
        match = timeString.match(patterns.quarterHour);
        if (match) {
            return now.plus({ minutes: 15 });
        }

        return null;
    }
}

export default new TimeParser();
