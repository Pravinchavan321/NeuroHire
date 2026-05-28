import { useEffect, useMemo, useState } from 'react';
import { analytics } from '../api/client';
import ActivityFeed from '../components/ActivityFeed';
import StatCard from '../components/StatCard';

function BarChart({ data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return (
    <div className="glass-card rounded-[2rem] p-6 h-full">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-300 mb-6">Score Distribution</h2>
      <div className="h-64 flex items-end gap-4">
        {entries.map(([bucket, count]) => (
          <div key={bucket} className="flex-1 h-full flex flex-col justify-end gap-3">
            <div className="relative flex-1 rounded-xl bg-white/5 overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-gradient-to-t from-indigo-500 to-emerald-400 transition-all"
                style={{ height: `${(count / max) * 100}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-white">{count}</p>
              <p className="text-[10px] text-slate-500 font-bold">{bucket}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data }) {
  const points = data || [];
  const max = Math.max(...points.map((point) => point.count), 1);
  const path = points.map((point, index) => {
    const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
    const y = 100 - (point.count / max) * 90;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="glass-card rounded-[2rem] p-6 h-full">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-300 mb-6">Jobs Posted</h2>
      <svg viewBox="0 0 100 110" className="w-full h-64 overflow-visible">
        <path d={path} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((point, index) => {
          const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
          const y = 100 - (point.count / max) * 90;
          return <circle key={`${point.date}-${index}`} cx={x} cy={y} r="1.8" fill="#a7f3d0" />;
        })}
      </svg>
    </div>
  );
}

function StatusFunnel({ overview }) {
  const rows = [
    ['Total', overview.totalApplications],
    ['Screened', overview.screenedCount],
    ['Shortlisted', overview.shortlistedCount],
    ['Interview', overview.interviewCount],
    ['Hired', overview.hiredCount]
  ];
  const max = Math.max(...rows.map(([, value]) => value || 0), 1);

  return (
    <div className="glass-card rounded-[2rem] p-6 h-full">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-300 mb-6">Status Funnel</h2>
      <div className="space-y-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">{label}</span>
              <span className="text-xs font-black text-white">{value || 0}</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${((value || 0) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState({});
  const [jobsOverTime, setJobsOverTime] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(Date.now());

  const fetchData = async () => {
    try {
      const [overviewRes, distributionRes, jobsRes, activityRes] = await Promise.all([
        analytics.overview(),
        analytics.scoreDistribution(),
        analytics.jobsOverTime(),
        analytics.recentActivity()
      ]);
      setOverview(overviewRes.data.data);
      setDistribution(distributionRes.data.data);
      setJobsOverTime(jobsRes.data.data);
      setActivity(activityRes.data.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const refresh = window.setInterval(fetchData, 60000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const updatedText = useMemo(() => {
    if (!lastUpdated) return 'Never';
    const seconds = Math.max(Math.round((now - lastUpdated.getTime()) / 1000), 0);
    return `${seconds}s ago`;
  }, [lastUpdated, now]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 lg:p-12 space-y-6 animate-pulse">
        <div className="h-16 rounded-2xl bg-white/5 max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-[1.5rem] bg-white/5" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="h-80 rounded-[2rem] bg-white/5" /><div className="h-80 rounded-[2rem] bg-white/5" /></div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 lg:p-12 flex items-center justify-center">
        <div className="glass-card rounded-[2rem] p-10 text-center border-rose-500/20">
          <h1 className="text-2xl font-black text-white mb-3">Dashboard unavailable</h1>
          <p className="text-sm text-rose-300 mb-6">{error}</p>
          <button onClick={fetchData} className="premium-btn px-6 py-3 rounded-2xl text-white text-sm font-bold">Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300 mb-2">Admin Dashboard</p>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Recruitment Analytics</h1>
          </div>
          <p className="text-xs font-bold text-slate-500">Last updated: {updatedText}</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="JB" label="Jobs" value={overview.totalJobs} color="text-indigo-300" />
          <StatCard icon="CV" label="Candidates" value={overview.totalCandidates} color="text-purple-300" />
          <StatCard icon="SL" label="Shortlisted" value={overview.shortlistedCount} color="text-blue-300" />
          <StatCard icon="AI" label="Avg Score" value={overview.avgAiScore} color="text-emerald-300" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <BarChart data={distribution} />
          <StatusFunnel overview={overview} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <LineChart data={jobsOverTime} />
          <ActivityFeed items={activity} />
        </section>
      </div>
    </main>
  );
}
