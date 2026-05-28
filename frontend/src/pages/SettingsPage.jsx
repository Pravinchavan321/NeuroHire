import { useEffect, useMemo, useState } from 'react';
import { settings, system } from '../api/client';
import { useToast } from '../components/ToastProvider';

const tabs = ['Company Profile', 'API Config', 'Team', 'System Status'];
const serviceLabels = {
  postgres: 'PostgreSQL',
  mongo: 'MongoDB',
  chroma: 'ChromaDB',
  aiService: 'AI Service'
};

const initialCompany = {
  companyName: '',
  logoUrl: '',
  website: '',
  contactEmail: '',
  industry: '',
  companySize: ''
};

function StatusPill({ up }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${up ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
      <span className={`h-2 w-2 rounded-full ${up ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {up ? 'Configured' : 'Not Set'}
    </span>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [company, setCompany] = useState(initialCompany);
  const [config, setConfig] = useState({ geminiConfigured: false, smtpConfigured: false, aiModel: 'gemini-2.5-flash' });
  const [health, setHealth] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { toast } = useToast();

  const user = useMemo(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : {};
  }, []);

  const loadSettings = async () => {
    const { data } = await settings.getCompany();
    if (data.success) {
      setCompany({ ...initialCompany, ...data.data.settings });
      setConfig(data.data.config);
    }
  };

  const loadHealth = async () => {
    const started = performance.now();
    const { data } = await system.health();
    setHealth({ ...data, totalResponseTime: Math.round(performance.now() - started) });
    setLastUpdated(new Date());
  };

  useEffect(() => {
    let active = true;
    Promise.all([loadSettings(), loadHealth()])
      .catch(() => {
        if (active) toast('Unable to load settings', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const interval = setInterval(() => {
      loadHealth().catch(() => setHealth((current) => current || { status: 'down', services: {}, responseTimes: {} }));
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [toast]);

  const updateCompany = (field, value) => setCompany((current) => ({ ...current, [field]: value }));

  const saveCompany = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await settings.updateCompany(company);
      if (data.success) {
        setCompany({ ...initialCompany, ...data.data.settings });
        toast('Company profile saved');
      }
    } catch (error) {
      toast('Unable to save company profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const secondsAgo = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000)) : null;

  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="glass-card rounded-[2rem] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">Admin Settings</p>
          <h1 className="mt-2 text-3xl font-black text-white">Settings</h1>
          <p className="mt-2 text-sm text-slate-400">Last updated: {secondsAgo === null ? 'checking...' : `${secondsAgo} seconds ago`}</p>
        </header>

        <div className="glass-card rounded-[2rem] p-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-2xl px-4 py-3 text-xs font-bold transition-colors ${activeTab === tab ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="glass-card h-96 animate-pulse rounded-[2rem]" />
        ) : activeTab === 'Company Profile' ? (
          <form onSubmit={saveCompany} className="glass-card rounded-[2rem] p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ['companyName', 'Company Name'],
                ['logoUrl', 'Logo URL'],
                ['website', 'Website'],
                ['contactEmail', 'Contact Email'],
                ['industry', 'Industry'],
                ['companySize', 'Company Size']
              ].map(([field, label]) => (
                <label key={field} className="space-y-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  {label}
                  <input
                    type={field === 'contactEmail' ? 'email' : field === 'website' || field === 'logoUrl' ? 'url' : 'text'}
                    value={company[field]}
                    onChange={(event) => updateCompany(field, event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
                  />
                </label>
              ))}
            </div>
            <button disabled={saving} className="premium-btn mt-6 rounded-2xl px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Company Profile'}
            </button>
          </form>
        ) : activeTab === 'API Config' ? (
          <section className="glass-card rounded-[2rem] p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Gemini API Key</p>
                <div className="mt-3"><StatusPill up={config.geminiConfigured} /></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">SMTP</p>
                <div className="mt-3"><StatusPill up={config.smtpConfigured} /></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">AI Model</p>
                <p className="mt-2 text-lg font-black text-white">{config.aiModel}</p>
                <p className="mt-3 text-sm text-slate-400">API keys are managed via environment variables on the server. Contact your admin to update them.</p>
                <button onClick={() => loadHealth().then(() => toast('Connection checked'))} className="mt-5 rounded-2xl bg-white/5 px-5 py-3 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20">
                  Test Connection
                </button>
              </div>
            </div>
          </section>
        ) : activeTab === 'Team' ? (
          <section className="glass-card rounded-[2rem] p-6 lg:p-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-black text-white">Team management coming soon</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div><p className="text-xs text-slate-500">Name</p><p className="font-bold text-white">{user.name || 'Current User'}</p></div>
                <div><p className="text-xs text-slate-500">Email</p><p className="font-bold text-white">{user.email || 'Unavailable'}</p></div>
                <div><p className="text-xs text-slate-500">Role</p><p className="font-bold text-white">{user.role || 'recruiter'}</p></div>
              </div>
            </div>
          </section>
        ) : (
          <section className="glass-card rounded-[2rem] p-6 lg:p-8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-slate-500">
                    <th className="pb-4">Service</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Response Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {Object.entries(serviceLabels).map(([key, label]) => {
                    const isUp = health?.services?.[key] === 'up';
                    return (
                      <tr key={key}>
                        <td className="py-4 text-sm font-bold text-white">{label}</td>
                        <td className={`py-4 text-sm font-bold ${isUp ? 'text-emerald-300' : 'text-rose-300'}`}>{isUp ? 'Up' : 'Down'}</td>
                        <td className="py-4 text-sm text-slate-300">{health?.responseTimes?.[key] ?? '-'}ms</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-4 text-sm font-bold text-white">Email (SMTP)</td>
                    <td className="py-4 text-sm font-bold text-amber-300">{config.smtpConfigured ? 'Configured' : 'Unchecked'}</td>
                    <td className="py-4 text-sm text-slate-300">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
