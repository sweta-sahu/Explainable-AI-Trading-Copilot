import type { Prediction, Factor } from '../types';
import { config } from '../config/api';
import { 
  normalizeError, 
  errorLogger, 
  RetryManager, 
  createValidationError,
  createApiError,
  type AppError 
} from '../utils/errorHandling';

// API Response interface matching the actual API structure
export interface ApiResponse {
  ticker: string;
  prediction_for_date: string;
  prediction: "Up" | "Down";
  confidence: number;
  probability_up: number;
  model_explanation: string;
  shap_metrics: {
    top_features: string[];
    values: string[];
  };
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: config.api.baseUrl,
  timeout: config.api.timeout,
  retryAttempts: config.api.retryAttempts,
  retryDelay: config.api.retryDelay,
};

// Legacy error types for backward compatibility
export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Feature name mapping for better display
const FEATURE_NAME_MAP: Record<string, string> = {
  'ret_lag_1d': 'Recent 1-Day Return',
  'rsi_14': '14-Day RSI',
  'ma_50d': '50-Day Moving Average',
  'month_of_year': 'Seasonal Factor',
  'abn_volume': 'Abnormal Volume',
  'volatility': 'Price Volatility',
  'momentum': 'Price Momentum',
  'earnings': 'Earnings Impact'
};

// Transform feature name to human-readable format
function formatFeatureName(feature: string): string {
  return FEATURE_NAME_MAP[feature] || feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Map confidence score to categorical level
function mapConfidenceLevel(confidence: number): string {
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
}

// Transform SHAP metrics to Factor array
export function transformShapMetrics(shapMetrics: ApiResponse['shap_metrics']): Factor[] {
  return shapMetrics.top_features.map((feature, index) => ({
    name: formatFeatureName(feature),
    shap: parseFloat(shapMetrics.values[index])
  }));
}

// Transform API response to Prediction type
export function transformApiResponse(response: ApiResponse): Prediction {
  return {
    ticker: response.ticker,
    direction: response.prediction.toUpperCase() as 'UP' | 'DOWN',
    probability: response.probability_up,
    confidence: mapConfidenceLevel(response.confidence),
    volatility: 'Medium', // Default value, can be enhanced later
    asOf: new Date().toISOString(),
    model: 'Production v1.0',
    factors: transformShapMetrics(response.shap_metrics),
    news: [{
      title: 'Model Analysis',
      summary: response.model_explanation,
      tone: 'Neutral' as const,
      source: 'AI Model'
    }] // Include model explanation as news item
  };
}

// Validate ticker symbol format
export function validateTicker(ticker: string): { valid: boolean; error?: AppError } {
  const trimmed = ticker.trim().toUpperCase();
  
  if (!trimmed) {
    return { 
      valid: false, 
      error: createValidationError('Please enter a ticker symbol', 'EMPTY_TICKER') 
    };
  }
  
  if (!/^[A-Z]{1,5}$/.test(trimmed)) {
    return { 
      valid: false, 
      error: createValidationError(
        'Ticker symbol must be 1-5 letters (e.g., AAPL, GOOGL)', 
        'INVALID_TICKER_FORMAT',
        { ticker: trimmed }
      ) 
    };
  }
  
  return { valid: true };
}

// Main API service class
export class PredictionApiService {
  private config: ApiConfig;
  private activeRequests: Set<AbortController> = new Set();

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Cancel any pending requests
  cancelPendingRequests(): void {
    this.activeRequests.forEach(controller => {
      controller.abort();
    });
    this.activeRequests.clear();
  }

  // Fetch prediction with enhanced error handling and retry logic
  async fetchPrediction(ticker: string): Promise<Prediction> {
    const context = { ticker, timestamp: new Date().toISOString() };
    
    // Validate ticker format
    const validation = validateTicker(ticker);
    if (!validation.valid && validation.error) {
      errorLogger.log(validation.error, context);
      throw validation.error;
    }

    // Create a new AbortController for this request
    const abortController = new AbortController();
    this.activeRequests.add(abortController);

    const cleanTicker = ticker.trim().toUpperCase();
    const url = `${this.config.baseUrl}/predict/${cleanTicker}`;
    let lastError: AppError;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const attemptContext = { ...context, attempt, maxAttempts: this.config.retryAttempts };
      
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeout);
        });

        // Make the fetch request
        const fetchPromise = fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          let error: AppError;
          
          if (response.status === 404) {
            error = createApiError(`Ticker symbol "${cleanTicker}" not found`, 404, 'TICKER_NOT_FOUND', attemptContext);
          } else if (response.status === 429) {
            error = createApiError('Too many requests. Please wait before trying again.', 429, 'RATE_LIMITED', attemptContext);
          } else if (response.status >= 500) {
            error = createApiError(`Server error (${response.status}). Please try again.`, response.status, 'SERVER_ERROR', attemptContext);
          } else {
            error = createApiError(`Request failed with status ${response.status}`, response.status, 'HTTP_ERROR', attemptContext);
          }
          
          throw error;
        }

        const data: ApiResponse = await response.json();
        console.log('📦 Raw API response:', data);
        
        // Validate response structure
        if (!data.ticker || !data.prediction || typeof data.confidence !== 'number') {
          console.log('❌ Invalid response structure:', data);
          const error = createApiError('Invalid response format from server', 500, 'INVALID_RESPONSE', { ...attemptContext, responseData: data });
          throw error;
        }

        // Success - cleanup and return transformed data
        this.activeRequests.delete(abortController);
        const transformedData = transformApiResponse(data);
        console.log('🔄 Transformed data:', transformedData);
        return transformedData;

      } catch (error) {
        const normalizedError = normalizeError(error, attemptContext);
        lastError = normalizedError;

        // Log the error
        errorLogger.log(normalizedError, attemptContext);

        // Don't retry if request was cancelled or if it's a non-retryable error
        if (normalizedError.type === ErrorType.CANCELLED || !RetryManager.shouldRetry(normalizedError, attempt, this.config.retryAttempts)) {
          this.activeRequests.delete(abortController);
          throw normalizedError;
        }

        // If this is the last attempt, cleanup and throw the error
        if (attempt === this.config.retryAttempts) {
          this.activeRequests.delete(abortController);
          throw normalizedError;
        }

        // Wait before retrying with exponential backoff
        const delay = RetryManager.getRetryDelay(attempt, this.config.retryDelay);
        await RetryManager.sleep(delay);
      }
    }

    // Cleanup and throw the last error
    this.activeRequests.delete(abortController);
    throw lastError!;
  }

  // Update configuration
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const predictionApi = new PredictionApiService();