import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_PREDICTION_API_BASE_URL: 'https://test-api.example.com',
    VITE_API_TIMEOUT: '5000',
    VITE_RETRY_ATTEMPTS: '2',
    VITE_RETRY_DELAY: '500',
    VITE_LOG_LEVEL: 'error',
    DEV: false,
  },
  writable: true,
});

// Mock fetch globally
global.fetch = vi.fn();

// Setup cleanup
afterEach(() => {
  vi.clearAllMocks();
});