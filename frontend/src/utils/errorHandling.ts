import { config } from '../config/api';

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN'
}

// Enhanced error interface
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
  timestamp: Date;
  context?: Record<string, any>;
}

// Error logging utility
export class ErrorLogger {
  private static instance: ErrorLogger;
  
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: AppError, context?: Record<string, any>): void {
    const logData = {
      ...error,
      context: { ...error.context, ...context },
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log based on severity and environment
    if (config.logging.level === 'debug' || import.meta.env.DEV) {
      console.group(`🚨 ${error.type} Error`);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Status:', error.status);
      console.error('Retryable:', error.retryable);
      console.error('Context:', logData.context);
      console.groupEnd();
    } else if (error.type !== ErrorType.VALIDATION) {
      // Only log non-validation errors in production
      console.error(`[${error.type}] ${error.message}`, {
        code: error.code,
        status: error.status,
        timestamp: error.timestamp
      });
    }

    // In a real app, you might send this to an error tracking service
    // this.sendToErrorService(logData);
  }

  // private sendToErrorService(error: any): void {
  //   // Implementation for sending to error tracking service
  //   // e.g., Sentry, LogRocket, etc.
  // }
}

// Error factory functions
export function createNetworkError(message: string, context?: Record<string, any>): AppError {
  return {
    type: ErrorType.NETWORK,
    message,
    code: 'NETWORK_ERROR',
    retryable: true,
    timestamp: new Date(),
    context
  };
}

export function createApiError(message: string, status?: number, code?: string, context?: Record<string, any>): AppError {
  return {
    type: ErrorType.API,
    message,
    status,
    code: code || `HTTP_${status}`,
    retryable: status ? status >= 500 : false,
    timestamp: new Date(),
    context
  };
}

export function createValidationError(message: string, code?: string, context?: Record<string, any>): AppError {
  return {
    type: ErrorType.VALIDATION,
    message,
    code: code || 'VALIDATION_ERROR',
    retryable: false,
    timestamp: new Date(),
    context
  };
}

export function createTimeoutError(message: string, context?: Record<string, any>): AppError {
  return {
    type: ErrorType.TIMEOUT,
    message,
    code: 'TIMEOUT_ERROR',
    retryable: true,
    timestamp: new Date(),
    context
  };
}

export function createCancelledError(message: string, context?: Record<string, any>): AppError {
  return {
    type: ErrorType.CANCELLED,
    message,
    code: 'CANCELLED_ERROR',
    retryable: false,
    timestamp: new Date(),
    context
  };
}

// Convert various error types to AppError
export function normalizeError(error: unknown, context?: Record<string, any>): AppError {
  if (error instanceof Error) {
    // Handle AbortError and related cancellation errors
    if (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('signal is aborted')) {
      return createCancelledError('Request was cancelled', { originalError: error.message, ...context });
    }

    // Handle TypeError (usually network issues)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return createNetworkError('Network connection failed. Please check your internet connection.', { originalError: error.message, ...context });
    }

    // Handle custom API errors
    if ('code' in error && 'status' in error) {
      const apiError = error as any;
      return createApiError(error.message, apiError.status, apiError.code, { ...context });
    }

    // Generic error
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      retryable: false,
      timestamp: new Date(),
      context: { originalError: error.toString(), ...context }
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
      code: 'STRING_ERROR',
      retryable: false,
      timestamp: new Date(),
      context
    };
  }

  // Handle unknown error types
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    retryable: false,
    timestamp: new Date(),
    context: { originalError: String(error), ...context }
  };
}

// User-friendly error messages
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case ErrorType.TIMEOUT:
      return 'The request took too long to complete. Please try again.';
    
    case ErrorType.CANCELLED:
      return 'The request was cancelled.';
    
    case ErrorType.API:
      if (error.status === 404) {
        return 'The requested ticker symbol was not found. Please check the symbol and try again.';
      }
      if (error.status === 429) {
        return 'Too many requests. Please wait a moment before trying again.';
      }
      if (error.status && error.status >= 500) {
        return 'The server is experiencing issues. Please try again in a few moments.';
      }
      return error.message || 'An error occurred while fetching data.';
    
    case ErrorType.VALIDATION:
      return error.message;
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// Retry logic utility
export class RetryManager {
  static shouldRetry(error: AppError, attempt: number, maxAttempts: number): boolean {
    return error.retryable && attempt < maxAttempts;
  }

  static getRetryDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton logger
export const errorLogger = ErrorLogger.getInstance();