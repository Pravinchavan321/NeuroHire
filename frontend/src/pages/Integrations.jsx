import { useEffect, useState } from 'react';
import { integrations } from '../api/client';

export default function Integrations() {
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ provider: 'greenhouse', webhook_secret: '', job_mapping: '{}' });
  const [generatedUrl, setGeneratedUrl] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: res } = await integrations.getStatus();
      if (res.success) setActive(res.data);
    } catch (e) {
      console.error('Failed to fetch integrations:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        job_mapping: JSON.parse(form.job_mapping)
      };
      const { data: res } = await integrations.setup(payload);
      if (res.success) {
        setGeneratedUrl(res.data.webhook_url);
        fetchStatus();
      }
    } catch (e) {
      alert('Setup failed. Check your job mapping JSON format.');
    }
  };

  if (loading) return <div className="p-12 text-white animate-pulse">Loading...</div>;

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">ATS Integrations</h1>
        <p className="text-slate-500 font-medium">Connect NeuroHire to your existing applicant tracking system.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Active Connections</h3>
          {active.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-500 italic">No active integrations.</div>
          ) : (
            active.map((int, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold capitalize">{int.provider}</p>
                  <p className="text-[10px] text-slate-500">Connected on {new Date(int.created_at).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase">Active</span>
              </div>
            ))
          )}
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-white/5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">New Integration</h3>
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Provider</label>
              <select 
                value={form.provider}
                onChange={e => setForm({...form, provider: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="greenhouse" className="bg-slate-900">Greenhouse</option>
                <option value="lever" className="bg-slate-900">Lever</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Webhook Secret</label>
              <input 
                type="text"
                value={form.webhook_secret}
                onChange={e => setForm({...form, webhook_secret: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors"
                placeholder="Paste secret from ATS"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Job Mapping (JSON)</label>
              <textarea 
                value={form.job_mapping}
                onChange={e => setForm({...form, job_mapping: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors h-24 font-mono text-xs"
                placeholder='{ "ext_id_1": "internal_uuid_1" }'
              />
            </div>
            <button className="w-full py-4 bg-white text-slate-900 font-black rounded-xl hover:bg-indigo-500 hover:text-white transition-all">
              Initialize Connection
            </button>
          </form>

          {generatedUrl && (
            <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Your Webhook URL</p>
              <code className="text-xs text-white break-all">{generatedUrl}</code>
              <p className="text-[10px] text-slate-500 mt-2">Paste this URL into your {form.provider} settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
