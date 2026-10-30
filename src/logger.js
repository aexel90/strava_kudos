import winston from 'winston';

export const LogLevel = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
};

const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}] ${message} ${metaStr}`.trim();
        })
    ),
    transports: [new winston.transports.Console({ handleExceptions: true, handleRejections: true })],
    exitOnError: false,
});

class Logger {
    constructor() {
        this.winston = winstonLogger;
    }

    setLevel(level) {
        this.winston.level = level;
    }

    #log(level, message, args) {
        const text = args.length
            ? `${message} ${args.map((a) => (a && typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`
            : message;
        this.winston[level](text);
    }

    error(message, ...args) { this.#log('error', message, args); }
    warn(message, ...args)  { this.#log('warn',  message, args); }
    info(message, ...args)  { this.#log('info',  message, args); }
    debug(message, ...args) { this.#log('debug', message, args); }

    logSession(sessionCookie) {
        const redacted = sessionCookie.length > 8 ? `${sessionCookie.substring(0, 8)}...` : '***REDACTED***';
        this.debug(`Strava Session: ${redacted}`);
    }

    logSummary(total, filtered, dryRun = false) {
        this.info(`${dryRun ? 'Would send' : 'Sending'} kudos to ${filtered} out of ${total} activities`);
    }

    logScriptBoundary(isStart) {
        this.info(`***** ${isStart ? 'SCRIPT START' : 'SCRIPT END'} *****`);
    }
}

export const logger = new Logger();
