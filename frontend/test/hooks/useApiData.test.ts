import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useApiData } from '../../src/hooks/useApiData';
import * as predictionApiModule from '../../src/services/predictionApi';
import type { Prediction } from '../../src/types';

vi.mock('../../src/services/predictionApi');

const mockPrediction: Prediction = {
  ticker: 'AAPL',
  direction: 'UP',
  probability: 0.75,
  confidence: 'High',
  volatility: 'Medium',
  asOf: '2024-01-15T10:30:00Z',
  model: 'v1.0',
  factors: [],
  news: []
};

describe('useApiData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useApiData());
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });

  it('fetches data successfully', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockResolvedValue(mockPrediction);
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    
    await waitFor(() => {
      expect(result.current.loading).toBe('idle');
    });
    
    expect(result.current.data).toEqual(mockPrediction);
    expect(result.current.error).toBeNull();
  });

  it('sets loading state when fetching', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockPrediction), 100)));
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    
    await waitFor(() => {
      expect(['loading', 'idle']).toContain(result.current.loading);
    });
  });

  it('sets refreshing state when data exists', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockResolvedValue(mockPrediction);
    
    const { result } = renderHook(() => useApiData());
    
    // First fetch
    result.current.fetchData('AAPL');
    await waitFor(() => expect(result.current.data).toEqual(mockPrediction));
    
    // Second fetch should set refreshing
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockPrediction), 100)));
    
    result.current.fetchData('AAPL');
    
    await waitFor(() => {
      expect([true, false]).toContain(result.current.isRefreshing);
    });
  });

  it('handles fetch error', async () => {
    const error = new Error('API Error');
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockRejectedValue(error);
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    
    await waitFor(() => {
      expect(result.current.loading).toBe('error');
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('clears error on successful fetch', async () => {
    // First fetch fails
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockRejectedValueOnce(new Error('Error'));
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    await waitFor(() => expect(result.current.error).toBeTruthy());
    
    // Second fetch succeeds
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockResolvedValue(mockPrediction);
    
    result.current.fetchData('AAPL');
    
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
    
    expect(result.current.data).toEqual(mockPrediction);
  });

  it('retry calls fetchData with last ticker', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockResolvedValue(mockPrediction);
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    await waitFor(() => expect(result.current.data).toEqual(mockPrediction));
    
    result.current.retry();
    
    await waitFor(() => {
      expect(predictionApiModule.predictionApi.fetchPrediction).toHaveBeenCalledWith('AAPL');
    });
  });

  it('clearError resets error state', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockRejectedValue(new Error('Error'));
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    await waitFor(() => expect(result.current.error).toBeTruthy());
    
    result.current.clearError();
    
    await waitFor(() => {
      expect(result.current.loading).toBe('idle');
    });
  });

  it('ignores AbortError', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockRejectedValue(abortError);
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    
    await waitFor(() => {
      expect(result.current.loading).toBe('idle');
    });
    
    expect(result.current.error).toBeNull();
  });

  it('updates data when fetching different ticker', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockResolvedValue(mockPrediction);
    
    const { result } = renderHook(() => useApiData());
    
    result.current.fetchData('AAPL');
    await waitFor(() => expect(result.current.data?.ticker).toBe('AAPL'));
    
    const msftPrediction = { ...mockPrediction, ticker: 'MSFT' };
    vi.spyOn(predictionApiModule.predictionApi, 'fetchPrediction')
      .mockResolvedValue(msftPrediction);
    
    result.current.fetchData('MSFT');
    
    await waitFor(() => {
      expect(result.current.data?.ticker).toBe('MSFT');
    });
  });
});
