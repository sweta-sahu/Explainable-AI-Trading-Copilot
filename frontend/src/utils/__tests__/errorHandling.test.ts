import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorType,
  ErrorLogger,
  createNetworkError,
  createApiError,
  createValidationError,
  normalizeError,
  getUserFriendlyMessage,
  RetryManager
} from '../errorHandling';

describe('Error Handling Utilities', () => {
  describe('Error Factory Functions', () => {
    it('should create network error correctly', () => {
      const error = createNetworkError('Connection failed');
      
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create API error correctly', () => {
      const error = createApiError('Server error', 500, 'SERVER_ERROR');
      
      expect(error.type).toBe(ErrorType.API);
      expect(error.message).toBe('Server error');
      expect(error.status).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.retryable).toBe(true); // 5xx errors are retryable
    });

    it('should create validation error correctly', () => {
      const error = createValidationError('Invalid input', 'INVALID_INPUT');
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.retryable).toBe(false);
    });
  });

  describe('normalizeError', () => {
    it('should normalize AbortError', () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      const normalized = normalizeError(abortError);
      
      expect(normalized.type).toBe(ErrorType.CANCELLED);
      expect(normalized.code).toBe('CANCELLED_ERROR');
      expect(normalized.retryable).toBe(false);
    });

    it('should normalize TypeError as network error', () => {
      const typeError = new TypeError('Failed to fetch');
      
      const normalized = normalizeError(typeError);
      
      expect(normalized.type).toBe(ErrorType.NETWORK);
      expect(normalized.retryable).toBe(true);
    });

    it('should normalize custom API errors', () => {
      const apiError = new Error('Not found') as any;
      apiError.code = 'NOT_FOUND';
      apiError.status = 404;
      
      const normalized = normalizeError(apiError);
      
      expect(normalized.type).toBe(ErrorType.API);
      expect(normalized.status).toBe(404);
      expect(normalized.code).toBe('NOT_FOUND');
    });

    it('should normalize string errors', () => {
      const normalized = normalizeError('Something went wrong');
      
      expect(normalized.type).toBe(ErrorType.UNKNOWN);
      expect(normalized.message).toBe('Something went wrong');
      expect(normalized.code).toBe('STRING_ERROR');
    });

    it('should normalize unknown error types', () => {
      const normalized = normalizeError({ weird: 'object' });
      
      expect(normalized.type).toBe(ErrorType.UNKNOWN);
      expect(normalized.code).toBe('UNKNOWN_ERROR');
      expect(normalized.retryable).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for network errors', () => {
      const error = createNetworkError('Connection failed');
      const message = getUserFriendlyMessage(error);
      
      expect(message).toContain('Unable to connect');
      expect(message).toContain('internet connection');
    });

    it('should return friendly message for 404 errors', () => {
      const error = createApiError('Not found', 404);
      const message = getUserFriendlyMessage(error);
      
      expect(message).toContain('ticker symbol was not found');
    });

    it('should return friendly message for 429 errors', () => {
      const error = createApiError('Too many requests', 429);
      const message = getUserFriendlyMessage(error);
      
      expect(message).toContain('Too many requests');
    });

    it('should return friendly message for server errors', () => {
      const error = createApiError('Internal server error', 500);
      const message = getUserFriendlyMessage(error);
      
      expect(message).toContain('server is experiencing issues');
    });

    it('should return validation message as-is', () => {
      const error = createValidationError('Please enter a valid ticker');
      const message = getUserFriendlyMessage(error);
      
      expect(message).toBe('Please enter a valid ticker');
    });
  });

  describe('RetryManager', () => {
    it('should determine if error is retryable', () => {
      const retryableError = createNetworkError('Connection failed');
      const nonRetryableError = createValidationError('Invalid input');
      
      expect(RetryManager.shouldRetry(retryableError, 1, 3)).toBe(true);
      expect(RetryManager.shouldRetry(nonRetryableError, 1, 3)).toBe(false);
      expect(RetryManager.shouldRetry(retryableError, 3, 3)).toBe(false);
    });

    it('should calculate exponential backoff delay', () => {
      const delay1 = RetryManager.getRetryDelay(1, 1000);
      const delay2 = RetryManager.getRetryDelay(2, 1000);
      const delay3 = RetryManager.getRetryDelay(3, 1000);
      
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(1200); // With jitter
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(2400);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(4800);
    });

    it('should cap delay at maximum', () => {
      const delay = RetryManager.getRetryDelay(10, 1000);
      expect(delay).toBeLessThanOrEqual(30000);
    });

    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await RetryManager.sleep(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });

  describe('ErrorLogger', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should be a singleton', () => {
      const logger1 = ErrorLogger.getInstance();
      const logger2 = ErrorLogger.getInstance();
      
      expect(logger1).toBe(logger2);
    });

    it('should log errors to console', () => {
      const logger = ErrorLogger.getInstance();
      const error = createApiError('Test error', 500);
      
      logger.log(error);
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log validation errors in production', () => {
      const logger = ErrorLogger.getInstance();
      const error = createValidationError('Invalid input');
      
      // Mock production environment
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = false;
      
      logger.log(error);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Restore environment
      (import.meta.env as any).DEV = originalEnv;
    });
  });
});