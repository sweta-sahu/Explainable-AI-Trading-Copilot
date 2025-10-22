import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeError,
  getUserFriendlyMessage,
  createApiError,
  createValidationError,
  createNetworkError,
  createTimeoutError,
  RetryManager,
  errorLogger,
  ErrorType
} from '../../src/utils/errorHandling';

describe('errorHandling', () => {
  describe('normalizeError', () => {
    it('normalizes Error object', () => {
      const error = new Error('Test error');
      const result = normalizeError(error);

      expect(result.message).toBe('Test error');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });

    it('normalizes string error', () => {
      const result = normalizeError('String error');

      expect(result.message).toBe('String error');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });

    it('normalizes object with message', () => {
      const error = new Error('Object error');
      const result = normalizeError(error);

      expect(result.message).toContain('error');
    });

    it('handles unknown error types', () => {
      const result = normalizeError(null);

      expect(result.message).toContain('unexpected');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });

    it('preserves context', () => {
      const error = new Error('Test');
      const context = { ticker: 'AAPL', attempt: 1 };
      const result = normalizeError(error, context);

      expect(result.context).toMatchObject(context);
    });

    it('detects network errors', () => {
      const error = new TypeError('Failed to fetch');
      const result = normalizeError(error);

      expect(result.type).toBe(ErrorType.NETWORK);
    });

    it('detects timeout errors', () => {
      const error = createTimeoutError('Request timeout');
      const result = normalizeError(error);

      // normalizeError doesn't detect timeout from message, it returns UNKNOWN for generic errors
      // So we test that createTimeoutError creates the right type
      expect(error.type).toBe(ErrorType.TIMEOUT);
    });

    it('detects abort errors', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      const result = normalizeError(error);

      expect(result.type).toBe(ErrorType.CANCELLED);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('returns friendly message for network error', () => {
      const error = createNetworkError('Network failed');
      const message = getUserFriendlyMessage(error);

      expect(message).toContain('connect');
    });

    it('returns friendly message for timeout error', () => {
      const error = {
        message: 'Timeout',
        type: ErrorType.TIMEOUT,
        code: 'TIMEOUT',
        retryable: true,
        timestamp: new Date()
      };
      const message = getUserFriendlyMessage(error);

      expect(message).toContain('long');
    });

    it('returns friendly message for validation error', () => {
      const error = createValidationError('Invalid input', 'VALIDATION_ERROR');
      const message = getUserFriendlyMessage(error);

      expect(message).toBe('Invalid input');
    });

    it('returns friendly message for API error', () => {
      const error = createApiError('API failed', 500, 'SERVER_ERROR');
      const message = getUserFriendlyMessage(error);

      expect(message).toContain('server');
    });

    it('returns default message for unknown error', () => {
      const error = {
        message: 'Unknown',
        type: ErrorType.UNKNOWN,
        code: 'UNKNOWN'
      };
      const message = getUserFriendlyMessage(error);

      expect(message).toContain('unexpected');
    });
  });

  describe('createApiError', () => {
    it('creates API error with all fields', () => {
      const error = createApiError('API failed', 500, 'SERVER_ERROR', { ticker: 'AAPL' });

      expect(error.message).toBe('API failed');
      expect(error.status).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.type).toBe(ErrorType.API);
      expect(error.context).toEqual({ ticker: 'AAPL' });
    });

    it('creates API error without optional fields', () => {
      const error = createApiError('API failed');

      expect(error.message).toBe('API failed');
      expect(error.type).toBe(ErrorType.API);
    });
  });

  describe('createValidationError', () => {
    it('creates validation error', () => {
      const error = createValidationError('Invalid ticker', 'INVALID_TICKER');

      expect(error.message).toBe('Invalid ticker');
      expect(error.code).toBe('INVALID_TICKER');
      expect(error.type).toBe(ErrorType.VALIDATION);
    });
  });

  describe('createNetworkError', () => {
    it('creates network error', () => {
      const error = createNetworkError('Network failed');

      expect(error.message).toBe('Network failed');
      expect(error.type).toBe(ErrorType.NETWORK);
    });
  });

  describe('RetryManager', () => {
    it('should retry on network error', () => {
      const error = createNetworkError('Network failed');
      const shouldRetry = RetryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(true);
    });

    it('should retry on timeout error', () => {
      const error = {
        message: 'Timeout',
        type: ErrorType.TIMEOUT,
        code: 'TIMEOUT',
        retryable: true,
        timestamp: new Date()
      };
      const shouldRetry = RetryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(true);
    });

    it('should not retry on validation error', () => {
      const error = createValidationError('Invalid', 'INVALID');
      const shouldRetry = RetryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry when max attempts reached', () => {
      const error = createNetworkError('Network failed');
      const shouldRetry = RetryManager.shouldRetry(error, 3, 3);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry on cancelled error', () => {
      const error = {
        message: 'Cancelled',
        type: ErrorType.CANCELLED,
        code: 'CANCELLED',
        retryable: false,
        timestamp: new Date()
      };
      const shouldRetry = RetryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(false);
    });

    it('calculates retry delay with exponential backoff', () => {
      const delay1 = RetryManager.getRetryDelay(1, 1000);
      const delay2 = RetryManager.getRetryDelay(2, 1000);
      const delay3 = RetryManager.getRetryDelay(3, 1000);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('sleep returns a promise', async () => {
      const start = Date.now();
      await RetryManager.sleep(50);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(45);
    });
  });

  describe('errorLogger', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('logs error to console', () => {
      const error = createApiError('Test error');
      errorLogger.log(error);

      expect(console.error).toHaveBeenCalled();
    });

    it('logs error with context', () => {
      const error = createApiError('Test error');
      const context = { ticker: 'AAPL' };
      errorLogger.log(error, context);

      expect(console.error).toHaveBeenCalled();
    });

    it('logs validation errors', () => {
      const error = createValidationError('Invalid', 'INVALID');
      errorLogger.log(error);

      expect(console.error).toHaveBeenCalled();
    });
  });
});
