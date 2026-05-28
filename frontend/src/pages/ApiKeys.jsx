import { useEffect, useState } from 'react';
import { apikeys } from '../api/client';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [showKey, setShowKey] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data: res } = await apikeys.list();
      if (res.success) setKeys(res.data);
    } catch (e) {
      console.error('Failed to fetch keys:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!newName) return;
    try {
      const { data: res } = await apikeys.generate(newName);
      if (res.success) {
        setShowKey(res.data.key);
        setNewName('');
        fetchKeys();
      }
    } catch (e) {
      alert('Failed to generate key');
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Are you sure you want to revoke this key?')) return;
    try {
      await apikeys.revoke(id);
      fetchKeys();
    } catch (e) {
      alert('Revocation failed');
    }
  };

  if (loading) return <div className="p-12 text-white animate-pulse">Loading API Keys...</div>;

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Developer API</h1>
        <p className="text-slate-500 font-medium">Generate keys to access NeuroHire programmatically.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Active Keys</h3>
          {keys.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-500 italic">No keys generated yet.</div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{k.name}</p>
                  <p className="text-xs text-indigo-400 font-mono mt-1">{k.key_prefix}••••••••</p>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Used: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <button 
                  onClick={() => handleRevoke(k.id)}
                  className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Revoke Key"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>

        <div className="glass-card p-8 rounded-[2rem] border border-white/5 h-fit">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Create New Key</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <input 
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-indigo-500 transition-colors"
              placeholder="Key Name (e.g., Production ATS)"
            />
            <button className="w-full py-4 bg-indigo-500 text-white font-black rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
              Generate Key
            </button>
          </form>

          {showKey && (
            <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in zoom-in-95">
              <p className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Your New API Key</p>
              <div className="flex items-center gap-2 mb-4">
                <code className="text-sm text-white bg-black/40 p-3 rounded-lg flex-1 break-all select-all font-mono">
                  {showKey}
                </code>
              </div>
              <p className="text-[10px] text-emerald-500/80 leading-relaxed italic">
                ⚠️ Store this key securely. It will not be shown again.
              </p>
              <button 
                onClick={() => setShowKey(null)}
                className="mt-4 text-[10px] text-slate-400 uppercase font-bold hover:text-white"
              >
                I've Saved It
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
