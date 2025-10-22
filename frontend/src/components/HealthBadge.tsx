import type { Health } from '../types';

export function HealthBadge({ status }: { status: Health }) {
  const isHealthy = status.api === 'up' && status.model === 'hot' && status.data === 'fresh';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        {isHealthy && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
      </span>
      <span className="text-white/80 tracking-wide">{isHealthy ? 'SYSTEMS OPERATIONAL' : 'DEGRADED'}</span>
    </div>
  );
}
