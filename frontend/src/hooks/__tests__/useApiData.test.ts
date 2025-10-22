import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiData } from '../useApiData';
import { predictionApi } from '../../services/predictionApi';
import { ErrorType } from '../../utils/errorHandling';

// Mock the API service
vi.mock('../../services/predictionApi', () => ({
  predictionApi: {
    fetchPrediction: vi.fn(),
    cancelPendingRequests: vi.fn(),
  }
}));

describe('useApiData', () => {
  const mockPrediction = {
    ticker: 'AAPL',
    direction: 'UP' as const,
    probability: 0.65,
    confidence: 'High',
    volatility: 'Medium',
    asOf: '2025-10-21T10:00:00Z',
    model: 'Production v1.0',
    factors: [
      { name: 'Recent 1-Day Return', shap: 0.5 }
    ],
    news: [
      { title: 'Test', summary: 'Test news', tone: 'Positive' as const, source: 'Test' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useApiData());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });

  it('should fetch data successfully', async () => {
    vi.mocked(predictionApi.fetchPrediction).mockResolvedValueOnce(mockPrediction);

    const { result } = renderHook(() => useApiData());

    act(() => {
      result.current.fetchData('AAPL');
    });

    expect(result.current.loading).toBe('loading');

    await waitFor(() => {
      expect(result.current.loading).toBe('idle');
    });

    expect(result.current.data).toEqual(mockPrediction);
    expect(result.current.error).toBeNull();
    expect(predictionApi.fetchPrediction).toHaveBeenCalledWith('AAPL');
  });

  it('should handle API errors', async () => {
    const mockError = {
      type: ErrorType.API,
      message: 'Ticker not found',
      code: 'TICKER_NOT_FOUND',
      status: 404,
      retryable: false,
      timestamp: new Date()
    };

    vi.mocked(predictionApi.fetchPrediction).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useApiData());

    act(() => {
      result.current.fetchData('AAPL');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe('error');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBeDefined();
    expect(result.current.data).toBeNull();
  });

  it('should show refreshing state when data exists', async () => {
    vi.mocked(predictionApi.fetchPrediction).mockResolvedValue(mockPrediction);

    const { result } = renderHook(() => useApiData());

    // First fetch
    act(() => {
      result.current.fetchData('AAPL');
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockPrediction);
    });

    // Second fetch should show refreshing
    act(() => {
      result.current.fetchData('AAPL');
    });

    expect(result.current.loading).toBe('refreshing');
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.data).toEqual(mockPrediction); // Previous data still visible
  });

  it('should retry with last ticker', async () => {
    vi.mocked(predictionApi.fetchPrediction).mockResolvedValueOnce(mockPrediction);

    const { result } = renderHook(() => useApiData());

    act(() => {
      result.current.fetchData('AAPL');
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockPrediction);
    });

    // Clear the mock and set up for retry
    vi.clearAllMocks();
    vi.mocked(predictionApi.fetchPrediction).mockResolvedValueOnce(mockPrediction);

    act(() => {
      result.current.retry();
    });

    expect(predictionApi.fetchPrediction).toHaveBeenCalledWith('AAPL');
  });

  it('should clear error', async () => {
    const mockError = {
      type: ErrorType.VALIDATION,
      message: 'Invalid ticker',
      code: 'INVALID_TICKER',
      retryable: false,
      timestamp: new Date()
    };

    vi.mocked(predictionApi.fetchPrediction).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useApiData());

    act(() => {
      result.current.fetchData('INVALID');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe('idle');
  });

  it('should cancel requests on unmount', () => {
    const { unmount } = renderHook(() => useApiData());

    unmount();

    expect(predictionApi.cancelPendingRequests).toHaveBeenCalled();
  });

  it('should not update state if component is unmounted', async () => {
    vi.mocked(predictionApi.fetchPrediction).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPrediction), 100))
    );

    const { result, unmount } = renderHook(() => useApiData());

    act(() => {
      result.current.fetchData('AAPL');
    });

    // Unmount before the promise resolves
    unmount();

    // Wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 150));

    // State should not have been updated
    expect(result.current.data).toBeNull();
  });

  it('should ignore stale requests', async () => {
    let resolveFirst: (value: any) => void;
    let resolveSecond: (value: any) => void;

    const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
    const secondPromise = new Promise(resolve => { resolveSecond = resolve; });

    vi.mocked(predictionApi.fetchPrediction)
      .mockReturnValueOnce(firstPromise as any)
      .mockReturnValueOnce(secondPromise as any);

    const { result } = renderHook(() => useApiData());

    // Start first request
    act(() => {
      result.current.fetchData('AAPL');
    });

    // Start second request before first completes
    act(() => {
      result.current.fetchData('GOOGL');
    });

    // Resolve first request (should be ignored)
    resolveFirst!({ ...mockPrediction, ticker: 'AAPL' });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Resolve second request (should be used)
    resolveSecond!({ ...mockPrediction, ticker: 'GOOGL' });
    await waitFor(() => {
      expect(result.current.data?.ticker).toBe('GOOGL');
    });

    expect(result.current.data?.ticker).toBe('GOOGL');
  });
});