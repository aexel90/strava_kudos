import { readFile, access } from 'fs/promises';
import { logger } from './logger.js';
import yaml from 'js-yaml';

export async function loadAndValidateConfig() {
    const config = await loadConfig();
    validateConfig(config);
    return normalizeConfig(config);
}

async function loadConfig() {
    const candidates = ['config.json', 'config.yaml', 'config.yml'];
    const found = [];

    for (const file of candidates) {
        try {
            await access(file);
            found.push(file);
        } catch {}
    }

    if (found.length === 0) throw new Error('No configuration file found. Expected one of: config.json, config.yaml, config.yml');
    if (found.length > 1) throw new Error(`Multiple configuration files found: ${found.join(', ')}. Keep only one.`);

    const configFile = found[0];
    logger.info(`Using configuration file: ${configFile}`);

    let raw;
    try {
        raw = await readFile(configFile, 'utf8');
    } catch (err) {
        throw new Error(`Failed to read "${configFile}": ${err.message}`);
    }

    try {
        return configFile.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
    } catch (err) {
        throw new Error(`Failed to parse "${configFile}": ${err.message}`);
    }
}

function validateConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Config is missing or not an object.');
    if (!config.stravaSessionCookie || typeof config.stravaSessionCookie !== 'string') throw new Error("'stravaSessionCookie' is missing or not a string in config");
    if (!config.athleteId) throw new Error("'athleteId' is missing in config");
    if (isNaN(Number(config.athleteId))) throw new Error("'athleteId' must be a valid number");
    if (config.ignoreAthletes && !Array.isArray(config.ignoreAthletes)) throw new Error("'ignoreAthletes' must be an array if provided");

    if (config.kudoRules) {
        const { kudoRules } = config;
        if (kudoRules.minDistance && typeof kudoRules.minDistance !== 'object') throw new Error("'kudoRules.minDistance' must be an object if provided");
        if (kudoRules.minTime && typeof kudoRules.minTime !== 'object') throw new Error("'kudoRules.minTime' must be an object if provided");
        if (kudoRules.activityNames && !Array.isArray(kudoRules.activityNames)) throw new Error("'kudoRules.activityNames' must be an array if provided");
    }
}

function normalizeConfig(config) {
    return {
        stravaSessionCookie: config.stravaSessionCookie,
        athleteId: Number(config.athleteId),
        ignoreAthletes: config.ignoreAthletes || [],
        kudoRules: {
            minDistance: config.kudoRules?.minDistance || {},
            minTime: config.kudoRules?.minTime || {},
            activityNames: config.kudoRules?.activityNames || [],
        },
    };
}
