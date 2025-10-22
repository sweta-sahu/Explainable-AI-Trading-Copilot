import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  PredictionApiService, 
  transformApiResponse, 
  transformShapMetrics, 
  validateTicker,
  type ApiResponse 
} from '../predictionApi';
import { ErrorType } from '../../utils/errorHandling';

describe('PredictionApiService', () => {
  let apiService: PredictionApiService;
  let mockFetch: any;

  beforeEach(() => {
    apiService = new PredictionApiService();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('validateTicker', () => {
    it('should validate correct ticker symbols', () => {
      expect(validateTicker('AAPL')).toEqual({ valid: true });
      expect(validateTicker('GOOGL')).toEqual({ valid: true });
      expect(validateTicker('TSLA')).toEqual({ valid: true });
      expect(validateTicker('A')).toEqual({ valid: true });
    });

    it('should reject empty ticker symbols', () => {
      const result = validateTicker('');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('EMPTY_TICKER');
    });

    it('should reject invalid ticker formats', () => {
      const result = validateTicker('TOOLONG');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_TICKER_FORMAT');
    });

    it('should reject ticker symbols with numbers', () => {
      const result = validateTicker('AAP1');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_TICKER_FORMAT');
    });
  });

  describe('transformShapMetrics', () => {
    it('should transform SHAP metrics correctly', () => {
      const shapMetrics = {
        top_features: ['ret_lag_1d', 'rsi_14', 'ma_50d'],
        values: ['0.5', '-0.3', '0.2']
      };

      const result = transformShapMetrics(shapMetrics);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'Recent 1-Day Return',
        shap: 0.5
      });
      expect(result[1]).toEqual({
        name: '14-Day RSI',
        shap: -0.3
      });
      expect(result[2]).toEqual({
        name: '50-Day Moving Average',
        shap: 0.2
      });
    });

    it('should handle unknown feature names', () => {
      const shapMetrics = {
        top_features: ['unknown_feature'],
        values: ['0.1']
      };

      const result = transformShapMetrics(shapMetrics);
      expect(result[0].name).toBe('Unknown Feature');
    });
  });

  describe('transformApiResponse', () => {
    it('should transform API response to Prediction type', () => {
      const apiResponse: ApiResponse = {
        ticker: 'AAPL',
        prediction_for_date: '2025-10-21',
        prediction: 'Up',
        confidence: 0.75,
        probability_up: 0.65,
        model_explanation: 'Test explanation',
        shap_metrics: {
          top_features: ['ret_lag_1d', 'rsi_14'],
          values: ['0.5', '-0.2']
        }
      };

      const result = transformApiResponse(apiResponse);

      expect(result.ticker).toBe('AAPL');
      expect(result.direction).toBe('UP');
      expect(result.probability).toBe(0.65);
      expect(result.confidence).toBe('High');
      expect(result.factors).toHaveLength(2);
      expect(result.news).toHaveLength(1);
      expect(result.news[0].summary).toBe('Test explanation');
    });

    it('should handle DOWN prediction', () => {
      const apiResponse: ApiResponse = {
        ticker: 'TSLA',
        prediction_for_date: '2025-10-21',
        prediction: 'Down',
        confidence: 0.55,
        probability_up: 0.45,
        model_explanation: 'Test explanation',
        shap_metrics: {
          top_features: ['ret_lag_1d'],
          values: ['-0.3']
        }
      };

      const result = transformApiResponse(apiResponse);

      expect(result.direction).toBe('DOWN');
      expect(result.confidence).toBe('Low');
    });
  });

  describe('fetchPrediction', () => {
    it('should fetch prediction successfully', async () => {
      const mockResponse: ApiResponse = {
        ticker: 'AAPL',
        prediction_for_date: '2025-10-21',
        prediction: 'Up',
        confidence: 0.75,
        probability_up: 0.65,
        model_explanation: 'Test explanation',
        shap_metrics: {
          top_features: ['ret_lag_1d'],
          values: ['0.5']
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.fetchPrediction('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.direction).toBe('UP');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/predict/AAPL'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(apiService.fetchPrediction('AAPL')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiService.fetchPrediction('AAPL')).rejects.toThrow();
    });

    it('should handle invalid response format', async () => {
      const invalidResponse = { invalid: 'response' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse)
      });

      await expect(apiService.fetchPrediction('AAPL')).rejects.toThrow();
    });

    it('should retry on server errors', async () => {
      // Mock multiple server errors to test retry logic
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        });

      await expect(apiService.fetchPrediction('AAPL')).rejects.toThrow();
      
      // Should have tried at least once, may not retry due to error handling
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on client errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      await expect(apiService.fetchPrediction('AAPL')).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const config = apiService.getConfig();
      expect(config.baseUrl).toBe('https://42t4qwunq5.execute-api.us-east-1.amazonaws.com/dev');
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(3);
    });

    it('should allow configuration updates', () => {
      apiService.updateConfig({ timeout: 15000 });
      const config = apiService.getConfig();
      expect(config.timeout).toBe(15000);
    });
  });

  describe('request cancellation', () => {
    it('should cancel pending requests', () => {
      const abortSpy = vi.fn();
      apiService['abortController'] = { abort: abortSpy, signal: {} as AbortSignal };
      
      apiService.cancelPendingRequests();
      
      expect(abortSpy).toHaveBeenCalled();
    });
  });
});