/**
 * Structured Logger Utility
 * Replaces console.log/error/warn with structured logging
 * Debug logs are controlled by NODE_ENV
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = process.env.DEBUG === 'true' || isDevelopment;

interface LogContext {
  [key: string]: unknown;
}

/**
 * Structured logger
 */
export const logger = {
  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (isDebugEnabled || isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, context || '');
    }
  },

  /**
   * Error level logging with error object
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      message,
    };

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      // Include embedded details if present
      if ((error as any).details) {
        errorContext.details = (error as any).details;
      }
    } else if (error) {
      errorContext.error = error;
    }

    console.error(`❌ [ERROR] ${message}`, errorContext);
  },

  /**
   * Debug level logging (only in development or when DEBUG=true)
   */
  debug(message: string, data?: LogContext): void {
    if (isDebugEnabled) {
      console.log(`🔍 [DEBUG] ${message}`, data || '');
    }
  },

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`⚠️ [WARN] ${message}`, context || '');
  },
};

