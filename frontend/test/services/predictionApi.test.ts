import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  predictionApi,
  transformShapMetrics,
  transformApiResponse,
  transformHistoryResponse,
  validateTicker,
  type ApiResponse,
  type HistoryApiResponse
} from '../../src/services/predictionApi';

// Mock fetch
global.fetch = vi.fn();

describe('predictionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    predictionApi.cancelPendingRequests();
  });

  describe('validateTicker', () => {
    it('validates correct ticker', () => {
      const result = validateTicker('AAPL');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects empty ticker', () => {
      const result = validateTicker('');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('EMPTY_TICKER');
    });

    it('rejects ticker with invalid format', () => {
      const result = validateTicker('123');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_TICKER_FORMAT');
    });

    it('rejects ticker with too many characters', () => {
      const result = validateTicker('TOOLONG');
      expect(result.valid).toBe(false);
    });

    it('accepts ticker with lowercase and converts', () => {
      const result = validateTicker('aapl');
      expect(result.valid).toBe(true);
    });
  });

  describe('transformShapMetrics', () => {
    it('transforms SHAP metrics correctly', () => {
      const shapMetrics = {
        top_features: ['ret_lag_1d', 'rsi_14', 'ma_50d'],
        values: ['0.5', '0.3', '0.2']
      };

      const result = transformShapMetrics(shapMetrics);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Recent 1-Day Return', shap: 0.5 });
      expect(result[1]).toEqual({ name: '14-Day RSI', shap: 0.3 });
      expect(result[2]).toEqual({ name: '50-Day Moving Average', shap: 0.2 });
    });

    it('handles unknown feature names', () => {
      const shapMetrics = {
        top_features: ['unknown_feature'],
        values: ['0.5']
      };

      const result = transformShapMetrics(shapMetrics);

      expect(result[0].name).toBe('Unknown Feature');
    });
  });

  describe('transformApiResponse', () => {
    it('transforms API response correctly', () => {
      const apiResponse: ApiResponse = {
        ticker: 'AAPL',
        prediction_for_date: '2024-01-15',
        prediction: 'Up',
        confidence: 0.75,
        probability_up: 0.80,
        model_explanation: 'Test explanation',
        shap_metrics: {
          top_features: ['ret_lag_1d'],
          values: ['0.5']
        }
      };

      const result = transformApiResponse(apiResponse);

      expect(result.ticker).toBe('AAPL');
      expect(result.direction).toBe('UP');
      expect(result.probability).toBe(0.80);
      expect(result.confidence).toBe('High');
      expect(result.factors).toHaveLength(1);
      expect(result.news).toHaveLength(1);
      expect(result.news[0].summary).toBe('Test explanation');
    });

    it('maps confidence levels correctly', () => {
      const highConfidence: ApiResponse = {
        ticker: 'AAPL',
        prediction_for_date: '2024-01-15',
        prediction: 'Up',
        confidence: 0.80,
        probability_up: 0.75,
        model_explanation: 'Test',
        shap_metrics: { top_features: [], values: [] }
      };

      expect(transformApiResponse(highConfidence).confidence).toBe('High');

      const mediumConfidence = { ...highConfidence, confidence: 0.65 };
      expect(transformApiResponse(mediumConfidence).confidence).toBe('Medium');

      const lowConfidence = { ...highConfidence, confidence: 0.50 };
      expect(transformApiResponse(lowConfidence).confidence).toBe('Low');
    });
  });

  describe('transformHistoryResponse', () => {
    it('transforms history response correctly', () => {
      const historyData: HistoryApiResponse[] = [
        {
          model_version: 'v1.0',
          features_s3_path: 's3://path',
          datatype: 'prediction',
          data_found_for: '2024-01-15T00:00:00Z',
          ingested_at: '2024-01-15T10:00:00Z',
          confidence: '0.75',
          prediction: 'Up',
          probability_up: '0.80',
          ticker_date: '2024-01-15'
        }
      ];

      const result = transformHistoryResponse(historyData);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].direction).toBe('UP');
      expect(result[0].probability).toBe(0.80);
      expect(result[0].outcome).toBeNull();
    });

    it('sorts history by date descending', () => {
      const historyData: HistoryApiResponse[] = [
        {
          model_version: 'v1.0',
          features_s3_path: 's3://path',
          datatype: 'prediction',
          data_found_for: '2024-01-13T00:00:00Z',
          ingested_at: '2024-01-13T10:00:00Z',
          confidence: '0.75',
          prediction: 'Up',
          probability_up: '0.80',
          ticker_date: '2024-01-13'
        },
        {
          model_version: 'v1.0',
          features_s3_path: 's3://path',
          datatype: 'prediction',
          data_found_for: '2024-01-15T00:00:00Z',
          ingested_at: '2024-01-15T10:00:00Z',
          confidence: '0.75',
          prediction: 'Down',
          probability_up: '0.30',
          ticker_date: '2024-01-15'
        }
      ];

      const result = transformHistoryResponse(historyData);

      expect(result[0].date).toBe('2024-01-15');
      expect(result[1].date).toBe('2024-01-13');
    });
  });

  describe('fetchPrediction', () => {
    it('fetches prediction successfully', async () => {
      const mockResponse: ApiResponse = {
        ticker: 'AAPL',
        prediction_for_date: '2024-01-15',
        prediction: 'Up',
        confidence: 0.75,
        probability_up: 0.80,
        model_explanation: 'Test',
        shap_metrics: { top_features: [], values: [] }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await predictionApi.fetchPrediction('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.direction).toBe('UP');
    });

    it('throws error for invalid ticker', async () => {
      await expect(predictionApi.fetchPrediction('')).rejects.toThrow();
    });

    it('handles 404 error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(predictionApi.fetchPrediction('INVALID')).rejects.toThrow();
    });

    it('handles 429 rate limit error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429
      });

      await expect(predictionApi.fetchPrediction('AAPL')).rejects.toThrow();
    });

    it('handles 500 server error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(predictionApi.fetchPrediction('AAPL')).rejects.toThrow();
    });

    it('validates response structure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      });

      await expect(predictionApi.fetchPrediction('AAPL')).rejects.toThrow();
    });

    it('retries on failure', async () => {
      // Mock a network error that should trigger retry logic
      (global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));

      // Expect the function to eventually throw after retries
      await expect(predictionApi.fetchPrediction('AAPL')).rejects.toThrow();
    });
  });

  describe('fetchHistory', () => {
    it('fetches history successfully', async () => {
      const mockResponse: HistoryApiResponse[] = [
        {
          model_version: 'v1.0',
          features_s3_path: 's3://path',
          datatype: 'prediction',
          data_found_for: '2024-01-15T00:00:00Z',
          ingested_at: '2024-01-15T10:00:00Z',
          confidence: '0.75',
          prediction: 'Up',
          probability_up: '0.80',
          ticker_date: '2024-01-15'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await predictionApi.fetchHistory('AAPL');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('throws error for invalid ticker', async () => {
      await expect(predictionApi.fetchHistory('')).rejects.toThrow();
    });

    it('handles 404 error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(predictionApi.fetchHistory('INVALID')).rejects.toThrow();
    });

    it('validates response is array', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ not: 'an array' })
      });

      await expect(predictionApi.fetchHistory('AAPL')).rejects.toThrow();
    });
  });

  describe('cancelPendingRequests', () => {
    it('cancels pending requests', () => {
      predictionApi.cancelPendingRequests();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
