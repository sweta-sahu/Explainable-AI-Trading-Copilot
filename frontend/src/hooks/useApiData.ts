import { useState, useCallback, useRef, useEffect } from 'react';
import { predictionApi } from '../services/predictionApi';
import { normalizeError, errorLogger, getUserFriendlyMessage, type AppError } from '../utils/errorHandling';
import type { Prediction, LoadingState } from '../types';

export interface UseApiDataReturn {
  data: Prediction | null;
  loading: LoadingState;
  error: AppError | null;
  isRefreshing: boolean;
  fetchData: (ticker: string) => Promise<void>;
  retry: () => void;
  clearError: () => void;
}

export function useApiData(): UseApiDataReturn {
  const [data, setData] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const lastTickerRef = useRef<string>('');
  const mountedRef = useRef(true);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Don't cancel requests on unmount to avoid the abort error
    };
  }, []);

  const fetchData = useCallback(async (ticker: string) => {
    const context = { ticker, component: 'useApiData' };
    
    console.log('🚀 Starting fetchData for ticker:', ticker);
    
    // Clear previous error and set loading
    setError(null);
    setLoading(prevData => {
      const newState = prevData ? 'refreshing' : 'loading';
      console.log('🔄 Setting loading state to:', newState);
      return newState;
    });
    
    lastTickerRef.current = ticker;

    try {
      console.log('📡 Calling API for ticker:', ticker);
      const prediction = await predictionApi.fetchPrediction(ticker);
      console.log('✅ API response received:', prediction);
      
      // Always update state if we get here (remove complex conditions for now)
      console.log('🔄 Updating state with prediction data');
      setData(prediction);
      setLoading('idle');
      setError(null);
      console.log('✅ State updated successfully');
      
    } catch (err) {
      console.log('❌ API error:', err);
      
      setLoading('error');
      
      // Don't show error if request was just cancelled
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
        setLoading('idle');
        return;
      }
      
      // Normalize the error and log it
      const normalizedError = normalizeError(err, context);
      errorLogger.log(normalizedError, context);
      
      // Set user-friendly error message
      const userFriendlyError = {
        ...normalizedError,
        message: getUserFriendlyMessage(normalizedError)
      };
      
      setError(userFriendlyError);
    }
  }, []);

  const retry = useCallback(() => {
    if (lastTickerRef.current) {
      fetchData(lastTickerRef.current);
    }
  }, [fetchData]);

  const clearError = useCallback(() => {
    setError(null);
    if (loading === 'error') {
      setLoading('idle');
    }
  }, [loading]);

  return {
    data,
    loading,
    error,
    isRefreshing: loading === 'refreshing',
    fetchData,
    retry,
    clearError,
  };
}