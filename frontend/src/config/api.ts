// API Configuration utility
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

// Get configuration from environment variables
export function getConfig(): AppConfig {
  return {
    api: {
      baseUrl: import.meta.env.VITE_PREDICTION_API_BASE_URL || 'https://42t4qwunq5.execute-api.us-east-1.amazonaws.com/dev',
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
      retryAttempts: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(import.meta.env.VITE_RETRY_DELAY) || 1000,
    },
    logging: {
      level: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
  };
}

// Validate configuration
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }

  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  if (config.api.retryAttempts < 1 || config.api.retryAttempts > 10) {
    errors.push('Retry attempts must be between 1 and 10');
  }

  if (config.api.retryDelay < 100) {
    errors.push('Retry delay must be at least 100ms');
  }

  return errors;
}

// Export singleton config
export const config = getConfig();

// Validate config on import
const configErrors = validateConfig(config);
if (configErrors.length > 0) {
  console.error('Configuration errors:', configErrors);
}