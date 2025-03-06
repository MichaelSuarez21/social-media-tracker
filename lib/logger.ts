/**
 * Simple logger utility for application logging
 * Supports both string and object parameters
 */
const logger = {
  /**
   * Log an informational message
   * @param message The message to log
   * @param data Optional data to include with the log
   */
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '')
  },

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional data to include with the log
   */
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '')
  },

  /**
   * Log an error message
   * @param message The message to log
   * @param data Optional data to include with the log
   */
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, data || '')
  },

  /**
   * Log a debug message (only in development)
   * @param message The message to log
   * @param data Optional data to include with the log
   */
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '')
    }
  }
}

/**
 * For backward compatibility with the old logger
 * This function doesn't need to do anything as configuration happens automatically
 */
export const configureLogger = () => {
  // Nothing to do, just for backward compatibility
  return;
}

// For backward compatibility with the old logger format 
// that required a category parameter
export const info = (category: string, message: string, ...args: any[]) => {
  logger.info(`[${category}] ${message}`, args.length ? args : undefined);
};

export const warn = (category: string, message: string, ...args: any[]) => {
  logger.warn(`[${category}] ${message}`, args.length ? args : undefined);
};

export const error = (category: string, message: string, ...args: any[]) => {
  logger.error(`[${category}] ${message}`, args.length ? args : undefined);
};

export const debug = (category: string, message: string, ...args: any[]) => {
  logger.debug(`[${category}] ${message}`, args.length ? args : undefined);
};

export default logger 