import { useEffect, useState } from 'react';
import { billing } from '../api/client';

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: res } = await billing.getStatus();
      if (res.success) setStatus(res.data);
    } catch (e) {
      console.error('Failed to fetch billing status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setSubmitting(true);
    try {
      const { data: res } = await billing.createCheckout();
      if (res.success) {
        window.location.href = res.data.checkout_url;
      }
    } catch (e) {
      alert('Failed to initiate checkout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 space-y-12 animate-pulse">
        <div className="h-12 w-64 bg-white/5 rounded-2xl" />
        <div className="h-64 bg-white/5 rounded-[3rem]" />
      </div>
    );
  }

  const isPro = status?.plan === 'pro';

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Billing & Subscription</h1>
        <p className="text-slate-500 font-medium">Manage your plan and resource usage.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={`glass-card p-10 rounded-[3rem] border transition-all ${isPro ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Current Plan</h3>
              <p className={`text-4xl font-black tracking-tighter ${isPro ? 'text-emerald-400' : 'text-white'}`}>
                {isPro ? 'Pro Plan' : 'Free Tier'}
              </p>
            </div>
            <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isPro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'}`}>
              {status?.status}
            </span>
          </div>

          {!isPro && (
            <button 
              onClick={handleUpgrade}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Upgrade to Pro — Unlimited'}
            </button>
          )}

          {isPro && status?.current_period_end && (
            <p className="text-xs text-slate-500 mt-4">
              Next billing date: {new Date(status.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="glass-card p-10 rounded-[3rem] border border-white/5 space-y-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Resource Usage</h3>
          
          <div className="space-y-6">
            <UsageRow 
              label="Active Jobs" 
              current={status?.usage.jobs} 
              limit={isPro ? null : 3} 
              color="bg-indigo-500"
            />
            <UsageRow 
              label="Candidates Analyzed" 
              current={status?.usage.candidates} 
              limit={isPro ? null : 10} 
              color="bg-purple-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageRow({ label, current, limit, color }) {
  const pct = limit ? (current / limit) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{current} / {limit || '∞'}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000`} 
          style={{ width: `${limit ? Math.min(pct, 100) : 0}%` }}
        />
      </div>
    </div>
  );
}
