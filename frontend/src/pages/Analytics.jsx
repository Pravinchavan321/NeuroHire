import { useEffect, useState } from 'react';
import { analytics } from '../api/client';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: res } = await analytics.get();
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error);
        }
      } catch (err) {
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 space-y-12 animate-pulse">
        <div className="h-12 w-64 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-[2rem]" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-[2rem]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-12">
        <div className="glass-card p-12 text-center border-rose-500/20 bg-rose-500/5">
          <p className="text-rose-400 font-bold mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-xs text-indigo-400 hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Jobs', value: data.total_jobs, icon: '💼', color: 'text-indigo-400' },
    { label: 'Total Candidates', value: data.total_candidates, icon: '👥', color: 'text-purple-400' },
    { label: 'Avg AI Score', value: `${data.avg_ai_score}%`, icon: '🎯', color: 'text-emerald-400' },
    { label: 'Top Job', value: data.top_job, icon: '🏆', color: 'text-amber-400' },
    { label: 'Avg Processing Time', value: `${data.avg_processing_time_seconds}s`, icon: '⚡', color: 'text-blue-400' },
    { label: 'Hire Rate', value: `${data.hire_rate_pct}%`, icon: '📈', color: 'text-rose-400' },
  ];

  const distribution = data.score_distribution;
  const maxVal = Math.max(...Object.values(distribution), 1);

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Intelligence Analytics</h1>
        <p className="text-slate-500 font-medium">Real-time recruitment performance metrics for your organization.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="glass-card p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${s.color}`}>{s.label}</span>
            </div>
            <p className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left truncate">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-10 rounded-[3rem] border border-white/5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">AI Score Distribution</h3>
        <div className="space-y-6">
          {Object.entries(distribution).map(([band, count]) => {
            const width = (count / maxVal) * 100;
            return (
              <div key={band} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span>Score Band: {band}</span>
                  <span>{count} Candidates</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden flex items-center">
                  <svg width="100%" height="100%" className="rounded-full">
                    <rect 
                      width={`${width}%`} 
                      height="100%" 
                      fill="url(#barGradient)" 
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
