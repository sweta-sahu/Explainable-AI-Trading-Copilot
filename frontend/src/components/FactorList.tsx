import type { Factor } from '../types';

type FactorListProps = {
  title: string;
  items: Factor[];
  color: 'emerald' | 'rose';
};

export function FactorList({ title, items, color }: FactorListProps) {
  const titleColor = color === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
  const valueColor = color === 'emerald' ? 'text-emerald-300' : 'text-rose-300';
  const ringColor = color === 'emerald' ? 'ring-emerald-300/30' : 'ring-rose-300/30';
  const bgColor = color === 'emerald' ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const icon = color === 'emerald' ? '↑' : '↓';

  return (
    <div>
      <h4 className={`border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-wider ${titleColor}`}>{title}</h4>
      <div className="mt-4 space-y-3">
        {items.map((factor, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className={`rounded-md px-1.5 py-0.5 text-xs font-mono ring-1 ring-inset ${valueColor} ${ringColor} ${bgColor} tabular-nums`}>
              {factor.shap.toFixed(2)}
            </div>
            <div className="truncate text-sm text-white/85" title={factor.name}>{factor.name}</div>
            <div className={`text-lg font-bold ${titleColor}`}>{icon}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
