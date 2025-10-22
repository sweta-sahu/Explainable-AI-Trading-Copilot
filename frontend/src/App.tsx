import { useMemo, useState, useEffect } from 'react';
import { HealthBadge } from './components/HealthBadge';
import { TickerInput } from './components/TickerInput';
import { PredictionCard } from './components/PredictionCard';
import { EvidencePanel } from './components/EvidencePanel';
import { HistoryTable } from './components/HistoryTable';
import { SkeletonLoader } from './components/SkeletonLoader';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useApiData } from './hooks/useApiData';
import { MOCK_HEALTH, MOCK_HISTORY } from './data/mock';

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const { data: prediction, loading, error, isRefreshing, fetchData, retry, clearError } = useApiData();
  const history = useMemo(() => MOCK_HISTORY(ticker), [ticker]);

  // Debug logging
  console.log('🔍 App render - loading:', loading, 'prediction:', !!prediction, 'error:', !!error);

  // Fetch initial data on mount
  useEffect(() => {
    console.log('🚀 App mounted, fetching initial data for:', ticker);
    fetchData(ticker);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ticker changes
  const handleTickerChange = (newTicker: string) => {
    setTicker(newTicker);
    if (newTicker.trim()) {
      fetchData(newTicker);
    }
  };

  // Handle predict button click (refresh current ticker)
  const handlePredict = () => {
    if (ticker.trim()) {
      fetchData(ticker);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      
      {/* Background ambient lighting effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-20vw] top-[-20vh] h-[80vh] w-[80vw] rounded-full bg-blue-900/30 opacity-50 blur-[150px]"></div>
        <div className="absolute bottom-[-30vh] right-[-10vw] h-[70vh] w-[70vw] rounded-full bg-emerald-900/30 opacity-50 blur-[150px]"></div>
      </div>

      <header className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <h1 className="text-xl font-bold tracking-tight">AI Trading Copilot</h1>
          <HealthBadge status={MOCK_HEALTH} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="flex justify-center">
          <div className="relative">
            <TickerInput
              value={ticker}
              onChange={handleTickerChange}
              onPredict={handlePredict}
              disabled={loading === 'loading'}
              error={error?.code === 'INVALID_TICKER' || error?.code === 'EMPTY_TICKER' ? error.message : undefined}
            />
            {isRefreshing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="small" position="inline" />
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-7">
          <div className="lg:col-span-3">
            <ErrorBoundary>
              {loading === 'loading' ? (
                <SkeletonLoader variant="prediction-card" />
              ) : (
                <PredictionCard 
                  data={prediction} 
                  loading={loading}
                  error={error}
                  onRetry={retry}
                  onClearError={clearError}
                />
              )}
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-4">
            <ErrorBoundary>
              {loading === 'loading' ? (
                <SkeletonLoader variant="evidence-panel" />
              ) : (
                <EvidencePanel 
                  data={prediction}
                  loading={loading}
                  error={error}
                />
              )}
            </ErrorBoundary>
          </div>
        </section>

        <section>
          <HistoryTable rows={history} />
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-white/50">
        <p>Explainable AI Trading Copilot • Demo UI • Not financial advice</p>
      </footer>
    </div>
  );
}

export default App;
