import { useMemo, useState } from 'react';
import { HealthBadge } from './components/HealthBadge';
import { TickerInput } from './components/TickerInput';
import { PredictionCard } from './components/PredictionCard';
import { EvidencePanel } from './components/EvidencePanel';
import { HistoryTable } from './components/HistoryTable';
import { MOCK_HEALTH, MOCK_HISTORY, makeMockPrediction } from './data/mock';

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [seed, setSeed] = useState(1);

  const prediction = useMemo(() => makeMockPrediction(ticker, seed), [ticker, seed]);
  const history = useMemo(() => MOCK_HISTORY(ticker), [ticker]);

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
          <TickerInput
            value={ticker}
            onChange={setTicker}
            onPredict={() => setSeed(s => (s % 99) + 1)} // Cycle through seeds
          />
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-7">
          <div className="lg:col-span-3">
            <PredictionCard data={prediction} />
          </div>
          <div className="lg:col-span-4">
            <EvidencePanel data={prediction} />
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
