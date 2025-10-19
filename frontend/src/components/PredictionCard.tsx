import type { Prediction } from '../types';
import { InfoPill } from './InfoPill';

export function PredictionCard({ data }: { data: Prediction }) {
  const isUp = data.direction === 'UP';
  const probabilityPct = Math.round(data.probability * 100);
  const dirColor = isUp ? 'text-emerald-400' : 'text-rose-400';
  const barBg = isUp ? 'bg-emerald-500' : 'bg-rose-500';
  const dirRing = isUp ? 'ring-emerald-300/40' : 'ring-rose-300/40';
  const dirBg = isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10';

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-white/60">Prediction For</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">{data.ticker}</h2>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-bold ring-2 ring-inset ${dirColor} ${dirBg} ${dirRing}`}>
          <span aria-hidden="true">{isUp ? '▲' : '▼'}</span>
          <span>{data.direction}</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-8">
        <p className="text-sm font-medium uppercase tracking-wider text-white/70">
          Predicted Probability
        </p>
        <p className={`text-8xl font-extrabold tabular-nums ${dirColor}`}>
          {probabilityPct}%
        </p>
        <div className="w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-2.5 transition-all duration-500 ease-out ${barBg}`}
            style={{ width: `${probabilityPct}%` }}
          />
        </div>
        <p className="text-xs text-white/60">Confidence in the daily movement: <span className="font-semibold">{data.confidence}</span></p>
      </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
        <InfoPill label="Confidence" value={data.confidence} />
        <InfoPill label="Volatility" value={data.volatility} />
        <InfoPill label="Pred. Time" value={new Date(data.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <InfoPill label="Model Ver." value={data.model} />
      </footer>
    </div>
  );
}
