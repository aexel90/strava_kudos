import { loadAndValidateConfig } from './src/config.js';
import { StravaClient } from './src/stravaClient.js';
import { filterActivities } from './src/filters.js';
import { logger, LogLevel } from './src/logger.js';
import { parseArgs, showHelp } from './src/cli.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        logger.logSession(config.stravaSessionCookie);

        const stravaClient = await StravaClient.create(config.stravaSessionCookie);

        const activities = await stravaClient.getActivitiesViaDashboard();
        logger.info(`Found ${activities.length} activities`);

        const filteredActivities = filterActivities(activities, config, { dryRun: options.dryRun });
        logger.logSummary(activities.length, filteredActivities.length, options.dryRun);

        if (options.dryRun) {
            logger.info('Dry run mode - no kudos will be sent');
            filteredActivities.forEach((activity) => {
                logger.info(`Would send kudos to: ${activity.athlete.athleteName} - ${activity.activityName}`);
            });
        } else {
            await sendKudos(stravaClient, filteredActivities);
        }

        logger.logScriptBoundary(false);
    } catch (error) {
        logger.error('Application error:', error.message);
        process.exit(1);
    }
}

async function sendKudos(stravaClient, activities) {
    let successCount = 0;
    let errorCount = 0;
    const delayMs = 1000;

    for (const [index, activity] of activities.entries()) {
        try {
            logger.info(`Sending kudos to activity ${index + 1}/${activities.length}: ${activity.athlete.athleteName} - ${activity.activityName}`);
            logger.debug('Kudos response:', await stravaClient.sendKudos(activity.id));
            successCount++;

            if (index < activities.length - 1) {
                logger.debug(`Waiting ${delayMs}ms before next request...`);
                await sleep(delayMs);
            }
        } catch (error) {
            logger.error(`Failed to send kudos to activity ${activity.id}:`, error.message);
            errorCount++;
        }
    }

    logger.info(`Completed: ${successCount} kudos sent, ${errorCount} errors`);
}
