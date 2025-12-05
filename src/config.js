import { readFile, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { logger } from './logger.js';
import path from 'path';
import yaml from 'js-yaml';

/**
 * @typedef {Object} Config
 * @property {string} stravaSessionCookie - Strava session cookie
 * @property {string|number} athleteId - User's athlete ID
 * @property {number[]} [ignoreAthletes] - Array of athlete IDs to ignore
 * @property {Object} [kudoRules] - Rules for giving kudos
 * @property {Object} [kudoRules.minDistance] - Minimum distance by activity type
 * @property {Object} [kudoRules.minTime] - Minimum time by activity type
 * @property {string[]} [kudoRules.activityNames] - Activity name patterns to always give kudos
 * @property {Object} [rateLimiting] - Rate limiting configuration
 * @property {number} [rateLimiting.minDelayMs] - Minimum delay between requests in milliseconds
 * @property {number} [rateLimiting.maxDelayMs] - Maximum delay between requests in milliseconds
 */

/**
 * Loads and validates configuration from config files
 * @returns {Promise<Config>} Validated configuration object
 */
export async function loadAndValidateConfig() {
    const config = await loadConfig();
    validateConfig(config);
    return normalizeConfig(config);
}

/**
 * Loads configuration from config.json, config.yaml, or config.yml in the project root.
 * Enforces exclusivity: throws if more than one config file is present.
 * @returns {Promise<Object>} Parsed config object
 */
async function loadConfig() {
    const configFiles = ['config.json', 'config.yaml', 'config.yml'];
    const found = [];

    for (const file of configFiles) {
        try {
            await access(file, fsConstants.F_OK);
            found.push(file);
        } catch {} // File doesn't exist, continue to next
    }

    if (found.length === 0) throw new Error('No configuration file found. Please provide one of: config.json, config.yaml, or config.yml in the project root.');

    const configFile = found[0];
    logger.info(`Using configuration file: ${configFile}`);

    let configRaw;
    try {
        configRaw = await readFile(configFile, 'utf8');
    } catch (err) {
        throw new Error(`Failed to read configuration file "${configFile}": ${err.message}`);
    }

    try {
        if (configFile.endsWith('.json')) return JSON.parse(configRaw);
        else if (configFile.endsWith('.yaml') || configFile.endsWith('.yml')) return yaml.load(configRaw);
        else throw new Error(`Unsupported config file extension: ${configFile}`);
    } catch (err) {
        throw new Error(`Failed to parse configuration file "${configFile}": ${err.message}`);
    }
}

/**
 * Validates the loaded config object for required fields and correct types
 * @param {Object} config - Configuration object to validate
 */
function validateConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Config is missing or not an object.');
    if (!config.stravaSessionCookie || typeof config.stravaSessionCookie !== 'string') throw new Error("'stravaSessionCookie' is missing or not a string in config");
    if (!config.athleteId) throw new Error("'athleteId' is missing in config");

    // Validate athleteId can be converted to number
    if (isNaN(Number(config.athleteId))) throw new Error("'athleteId' must be a valid number");

    // Validate optional arrays
    if (config.ignoreAthletes && !Array.isArray(config.ignoreAthletes)) throw new Error("'ignoreAthletes' must be an array if provided");

    // Validate kudoRules structure if present
    if (config.kudoRules) {
        const { kudoRules } = config;

        if (kudoRules.minDistance && typeof kudoRules.minDistance !== 'object') throw new Error("'kudoRules.minDistance' must be an object if provided");
        if (kudoRules.minTime && typeof kudoRules.minTime !== 'object') throw new Error("'kudoRules.minTime' must be an object if provided");
        if (kudoRules.activityNames && !Array.isArray(kudoRules.activityNames)) throw new Error("'kudoRules.activityNames' must be an array if provided");
    }

    // Validate rateLimiting structure if present
    if (config.rateLimiting) {
        const { rateLimiting } = config;

        if (rateLimiting.minDelayMs !== undefined && (typeof rateLimiting.minDelayMs !== 'number' || rateLimiting.minDelayMs < 0)) {
            throw new Error("'rateLimiting.minDelayMs' must be a non-negative number if provided");
        }
        if (rateLimiting.maxDelayMs !== undefined && (typeof rateLimiting.maxDelayMs !== 'number' || rateLimiting.maxDelayMs < 0)) {
            throw new Error("'rateLimiting.maxDelayMs' must be a non-negative number if provided");
        }
        if (rateLimiting.minDelayMs !== undefined && rateLimiting.maxDelayMs !== undefined && rateLimiting.minDelayMs > rateLimiting.maxDelayMs) {
            throw new Error("'rateLimiting.minDelayMs' cannot be greater than 'rateLimiting.maxDelayMs'");
        }
    }
}

/**
 * Normalizes configuration values and provides defaults
 * @param {Object} config - Raw configuration object
 * @returns {Config} Normalized configuration
 */
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
        rateLimiting: {
            minDelayMs: config.rateLimiting?.minDelayMs ?? 1000,
            maxDelayMs: config.rateLimiting?.maxDelayMs ?? 1000,
        },
    };
}
