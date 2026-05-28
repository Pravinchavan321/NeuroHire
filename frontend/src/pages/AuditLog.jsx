import { useEffect, useState } from 'react';
import { audit } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      const { data: res } = await audit.list({ action: filter });
      if (res.success) setLogs(res.data);
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-white animate-pulse">Loading Audit Logs...</div>;

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Audit Trail</h1>
          <p className="text-slate-500 font-medium">Record of all significant security and data actions.</p>
        </div>
        
        <select 
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">All Actions</option>
          <option value="resume_uploaded">Resume Uploaded</option>
          <option value="candidates_viewed">Candidates Viewed</option>
          <option value="csv_exported">CSV Exported</option>
          <option value="reanalysis_triggered">Re-analysis Triggered</option>
          <option value="feedback_submitted">Feedback Submitted</option>
        </select>
      </header>

      <div className="glass-card rounded-[2rem] border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resource</th>
              <th className="p-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-6 text-xs text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="p-6">
                  <p className="text-xs font-bold text-white">{log.user_email}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{log.user_role}</p>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-6 text-xs text-slate-400">
                  {log.resource_type} <span className="text-[10px] opacity-50">({log.resource_id || 'N/A'})</span>
                </td>
                <td className="p-6 text-xs text-slate-500 font-mono">
                  {log.ip_address}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-20 text-center text-slate-500 italic">No audit logs found for this filter.</div>
        )}
      </div>
    </div>
  );
}

function getActionColor(action) {
  switch (action) {
    case 'resume_uploaded': return 'bg-indigo-500/20 text-indigo-400';
    case 'csv_exported': return 'bg-emerald-500/20 text-emerald-400';
    case 'reanalysis_triggered': return 'bg-amber-500/20 text-amber-400';
    case 'candidates_viewed': return 'bg-purple-500/20 text-purple-400';
    case 'feedback_submitted': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}
