import type { Prediction } from '../types';
import { FactorList } from './FactorList';

export function EvidencePanel({ data }: { data: Prediction }) {
  const positiveFactors = data.factors.filter((f) => f.shap > 0).slice(0, 5);
  const negativeFactors = data.factors.filter((f) => f.shap < 0).map(f => ({ ...f, shap: Math.abs(f.shap) })).slice(0, 5);

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
      <h3 className="border-b border-white/10 pb-4 text-xl font-bold tracking-tight text-white">
        Explainability: Key Factors
      </h3>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <FactorList title="Positive Drivers" items={positiveFactors} color="emerald" />
        <FactorList title="Negative Drivers" items={negativeFactors} color="rose" />
      </div>
      <div className="mt-8 border-t border-white/10 pt-6">
        <h4 className="text-lg font-semibold text-white/95">Recent News Context</h4>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data.news.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
              <p className="text-sm font-semibold leading-snug text-white/90">{item.title}</p>
              <p className="text-xs leading-normal text-white/65 line-clamp-2">{item.summary}</p>
              <div className="flex justify-between pt-1 text-[11px] font-mono text-white/45">
                <span>Tone: <span className="font-semibold">{item.tone}</span></span>
                <span>Source: {item.source}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
