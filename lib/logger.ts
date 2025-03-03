// Different log levels in order of verbosity
export enum LogLevel {
  NONE = 0, // No logging
  ERROR = 1, // Only errors
  WARN = 2,  // Errors and warnings
  INFO = 3,  // Errors, warnings, and important info
  DEBUG = 4, // All logs including debug info
}

// Default log level - can be changed based on environment
let currentLogLevel = process.env.NODE_ENV === 'production' 
  ? LogLevel.ERROR 
  : (process.env.NEXT_PUBLIC_LOG_LEVEL ? 
      Number(process.env.NEXT_PUBLIC_LOG_LEVEL) : 
      LogLevel.INFO);

// Whether to add timestamps to logs
const addTimestamps = true;

// Get timestamp string
const getTimestamp = () => {
  if (!addTimestamps) return '';
  return `[${new Date().toISOString()}] `;
};

// Set the log level (can be called dynamically)
export const setLogLevel = (level: LogLevel) => {
  currentLogLevel = level;
  debug('Logger', `Log level set to ${LogLevel[level]}`);
};

// Get the current log level
export const getLogLevel = () => currentLogLevel;

// Log at different levels with category/module name
export const error = (category: string, message: string, ...args: any[]) => {
  if (currentLogLevel >= LogLevel.ERROR) {
    console.error(`${getTimestamp()}[ERROR][${category}] ${message}`, ...args);
  }
};

export const warn = (category: string, message: string, ...args: any[]) => {
  if (currentLogLevel >= LogLevel.WARN) {
    console.warn(`${getTimestamp()}[WARN][${category}] ${message}`, ...args);
  }
};

export const info = (category: string, message: string, ...args: any[]) => {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(`${getTimestamp()}[INFO][${category}] ${message}`, ...args);
  }
};

export const debug = (category: string, message: string, ...args: any[]) => {
  if (currentLogLevel >= LogLevel.DEBUG) {
    console.log(`${getTimestamp()}[DEBUG][${category}] ${message}`, ...args);
  }
};

// Shorthand for setting environment-specific log levels
export const configureLogger = () => {
  // Set from URL query param if available (useful for debugging in production)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const logLevelParam = params.get('logLevel');
    if (logLevelParam && !isNaN(Number(logLevelParam))) {
      setLogLevel(Number(logLevelParam));
      info('Logger', `Log level set from URL: ${LogLevel[currentLogLevel]}`);
      return;
    }
  }

  // Development: Full logs by default
  if (process.env.NODE_ENV === 'development') {
    setLogLevel(LogLevel.DEBUG);
    return;
  }

  // Production: Only errors by default
  setLogLevel(LogLevel.ERROR);
};

// Default export with all methods
export default {
  setLogLevel,
  getLogLevel,
  error,
  warn,
  info,
  debug,
  LogLevel,
  configureLogger,
}; 