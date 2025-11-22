// Enhanced Logging System with Colors and Levels
// Save original console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

// ANSI Color Codes
export const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    purple: '\x1b[95m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
};

// Log Levels
const LOG_LEVELS = {
    ERROR: { level: 0, color: colors.red, bgColor: colors.bgRed, symbol: 'ERROR' },
    WARN: { level: 1, color: colors.yellow, bgColor: colors.bgYellow, symbol: 'WARN' },
    INFO: { level: 2, color: colors.blue, bgColor: colors.bgBlue, symbol: 'INFO' },
    SUCCESS: { level: 2, color: colors.green, bgColor: colors.bgGreen, symbol: 'SUCCESS' },
    DEBUG: { level: 3, color: colors.cyan, bgColor: colors.bgCyan, symbol: 'DEBUG' },
    HTTP: { level: 2, color: colors.magenta, bgColor: colors.bgMagenta, symbol: 'HTTP' }
};

// Current log level (can be set via environment variable)
const currentLogLevel = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]?.level || 3 : 3;

// Format timestamp
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
}

// Format log message with colors and structure
function formatLogMessage(level, category, message, ...args) {
    const timestamp = getTimestamp();
    const levelConfig = LOG_LEVELS[level];
    
    if (!levelConfig || levelConfig.level > currentLogLevel) {
        return null; // Don't log if level is too high
    }

    const coloredTimestamp = `${colors.dim}[${timestamp}]${colors.reset}`;
    const coloredLevel = `${levelConfig.color}${colors.bright}${levelConfig.symbol}${colors.reset}`;
    const coloredCategory = category ? `${colors.white}${colors.bright}[${category}]${colors.reset}` : '';
    
    return {
        formatted: `${coloredTimestamp} ${coloredLevel}${coloredCategory ? ' ' + coloredCategory : ''} ${message}`,
        args: args
    };
}

// Enhanced logging functions
const logger = {
    error: (category, message, ...args) => {
        const formatted = formatLogMessage('ERROR', category, message, ...args);
        if (formatted) {
            originalError(formatted.formatted, ...formatted.args);
        }
    },
    
    warn: (category, message, ...args) => {
        const formatted = formatLogMessage('WARN', category, message, ...args);
        if (formatted) {
            originalWarn(formatted.formatted, ...formatted.args);
        }
    },
    
    info: (category, message, ...args) => {
        const formatted = formatLogMessage('INFO', category, message, ...args);
        if (formatted) {
            originalInfo(formatted.formatted, ...formatted.args);
        }
    },
    
    success: (category, message, ...args) => {
        const formatted = formatLogMessage('SUCCESS', category, message, ...args);
        if (formatted) {
            originalLog(formatted.formatted, ...formatted.args);
        }
    },
    
    debug: (category, message, ...args) => {
        const formatted = formatLogMessage('DEBUG', category, message, ...args);
        if (formatted) {
            originalLog(formatted.formatted, ...formatted.args);
        }
    },
    
    http: (category, message, ...args) => {
        const formatted = formatLogMessage('HTTP', category, message, ...args);
        if (formatted) {
            originalLog(formatted.formatted, ...formatted.args);
        }
    },
    
    // Raw log without category or level
    log: (...args) => {
        if (args.length === 0) return;
        const timestamp = getTimestamp();
        originalLog(`${colors.dim}[${timestamp}]${colors.reset}`, ...args);
    }
};

// Export both logger and console for different use cases
export { logger };
export default console;