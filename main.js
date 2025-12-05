import { loadAndValidateConfig } from './src/config.js';
import { StravaClient } from './src/stravaClient.js';
import { filterActivities } from './src/filters.js';
import { logger, LogLevel } from './src/logger.js';
import { parseArgs, showHelp, sleep } from './src/cli.js';

await main();

async function main() {
    try {
        const options = parseArgs();

        if (options.help) {
            showHelp();
            return;
        }

        if (options.verbose) logger.setLevel(LogLevel.DEBUG);

        logger.logScriptBoundary(true);

        const config = await loadAndValidateConfig();

        // Initialize Strava client
        const stravaClient = new StravaClient(config.stravaSessionCookie);
        await stravaClient.initialize();
        logger.logSession(config.stravaSessionCookie);
        logger.logCsrfToken(stravaClient.csrfToken);

        // Fetch activities
        const activities = await stravaClient.getActivitiesViaDashboard(config.athleteId);
        logger.info(`Found ${activities.length} activities`);

        // Filter activities based on rules
        const filteredActivities = filterActivities(activities, config, {
            dryRun: options.dryRun,
            verbose: options.verbose,
        });
        logger.logSummary(activities.length, filteredActivities.length, options.dryRun);

        // Send kudos (or simulate in dry run)
        if (options.dryRun) {
            logger.info('Dry run mode - no kudos will be sent');
            filteredActivities.forEach((activity) => {
                logger.info(`Would send kudos to: ${activity.athlete.athleteName} - ${activity.activityName}`);
            });
        } else {
            await sendKudos(stravaClient, filteredActivities, config);
        }

        logger.logScriptBoundary(false);
    } catch (error) {
        logger.error('Application error:', error.message);
        process.exit(1);
    }
}

/**
 * Send kudos to activities with basic rate limiting
 * @param {StravaClient} stravaClient - Strava client instance
 * @param {Array} activities - Activities to send kudos to
 * @param {Config} config - Configuration object
 */
async function sendKudos(stravaClient, activities, config) {
    let successCount = 0;
    let errorCount = 0;
    const minDelayMs = config.rateLimiting.minDelayMs;
    const maxDelayMs = config.rateLimiting.maxDelayMs;

    for (const [index, activity] of activities.entries()) {
        try {
            logger.info(`Sending kudos to activity ${index + 1}/${activities.length}: ${activity.athlete.athleteName} - ${activity.activityName}`);

            const response = await stravaClient.sendKudos(activity.id);
            logger.debug('Kudos response:', response);
            successCount++;

            // Rate limiting delay (except for last request)
            if (index < activities.length - 1) {
                const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
                logger.debug(`Waiting ${randomDelay}ms before next request...`);
                await sleep(randomDelay);
            }
        } catch (error) {
            logger.error(`Failed to send kudos to activity ${activity.id}:`, error.message);
            errorCount++;
            // Continue with other activities even if one fails
        }
    }

    logger.info(`Completed: ${successCount} kudos sent, ${errorCount} errors`);
}
