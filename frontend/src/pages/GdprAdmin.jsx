import { useEffect, useState } from 'react';
import { gdpr } from '../api/client';

export default function GdprAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: res } = await gdpr.getRequests();
      if (res.success) setRequests(res.data);
    } catch (e) {
      console.error('Failed to fetch GDPR requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (email) => {
    try {
      const { data: res } = await gdpr.exportData(email);
      if (res.success) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-${email}.json`;
        a.click();
      }
    } catch (e) {
      alert('Export failed');
    }
  };

  const handleComplete = async (id) => {
    if (!confirm('This will PERMANENTLY delete all data for this candidate across all systems. Continue?')) return;
    try {
      await gdpr.completeRequest(id);
      fetchRequests();
    } catch (e) {
      alert('Deletion failed');
    }
  };

  if (loading) return <div className="p-12 text-white animate-pulse">Loading Compliance Data...</div>;

  return (
    <div className="p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Compliance Center</h1>
        <p className="text-slate-500 font-medium">Manage GDPR data deletion requests and consent logs.</p>
      </header>

      <div className="glass-card rounded-[2rem] border border-white/5 overflow-hidden">
        <h3 className="p-8 text-xs font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Pending Deletion Requests</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5">
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Candidate Email</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested At</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="p-6 text-sm font-bold text-white">{r.candidate_email}</td>
                <td className="p-6 text-xs text-slate-400">{new Date(r.requested_at).toLocaleDateString()}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${r.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-6 text-right space-x-2">
                  <button 
                    onClick={() => handleExport(r.candidate_email)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    Export Data
                  </button>
                  {r.status === 'pending' && (
                    <button 
                      onClick={() => handleComplete(r.id)}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-rose-500/20"
                    >
                      Delete All Data
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <div className="p-20 text-center text-slate-500 italic">No deletion requests found.</div>
        )}
      </div>
    </div>
  );
}
