import { logger } from './logger.js';

export function filterActivities(activities, config, options = {}) {
    const { dryRun = false } = options;
    const filteredActivities = [];

    activities.forEach((activity) => {
        const stats = extractActivityStats(activity);
        const reason = shouldSkipActivity(activity, config, stats);

        logger.debug(`Athlete: ${activity.athlete.athleteName}, Activity: ${activity.activityName}, Type: ${activity.type}, Has Kudoed: ${activity.kudosAndComments.hasKudoed}, Stats:`, stats);

        if (reason) {
            logger.debug(`--- ${reason}`);
            return;
        }

        logger.debug(`+++ ${dryRun ? 'Would give kudos' : 'Will give kudos'}`);
        filteredActivities.push(activity);
    });

    return filteredActivities;
}

function shouldSkipActivity(activity, config, stats) {
    if (activity.athlete.athleteId == config.athleteId) return "It's my own activity 😎";
    if (activity.kudosAndComments.hasKudoed) return 'Already kudoed this activity';
    if (config.ignoreAthletes.includes(activity.athlete.athleteId)) return 'Athlete is in ignore list';
    if (config.kudoRules && shouldSkipForStats(stats, activity.type, activity.activityName, config.kudoRules)) return 'Activity stats do not meet criteria';
    return null;
}

function shouldSkipForStats(stats, activityType, activityName, kudoRules) {
    if (kudoRules.activityNames.some((pattern) => new RegExp(pattern, 'i').test(activityName))) return false;

    if (kudoRules.minDistance[activityType]) {
        if (!stats.Distance || parseDistance(stats.Distance) < kudoRules.minDistance[activityType]) return true;
    }

    if (kudoRules.minTime[activityType]) {
        if (!stats.Time || parseTimeToMinutes(stats.Time) < kudoRules.minTime[activityType]) return true;
    }

    return false;
}

function extractActivityStats(activity) {
    if (!Array.isArray(activity.stats)) return {};

    const subtitles = Object.fromEntries(
        activity.stats
            .filter((s) => s.key.endsWith('_subtitle'))
            .map((s) => [s.key.replace('_subtitle', ''), s.value])
    );

    return Object.fromEntries(
        activity.stats
            .filter((s) => !s.key.endsWith('_subtitle') && s.value && subtitles[s.key])
            .map((s) => [subtitles[s.key], s.value.replace(/<[^>]*>/g, '').trim()])
    );
}

function parseTimeToMinutes(timeStr) {
    const h = timeStr.match(/(\d+)\s*h/i);
    const m = timeStr.match(/(\d+)\s*m/i);
    return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

function parseDistance(distanceStr) {
    const match = distanceStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
}
