import { useEffect, useState } from 'react';
import { applications } from '../api/client';
import { normalizeStatus, STATUSES } from './StatusBadge';

export default function CandidateStatusDropdown({ applicationId, value, onChange, className = '' }) {
  const [current, setCurrent] = useState(normalizeStatus(value));
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setCurrent(normalizeStatus(value));
  }, [value]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  const handleChange = async (event) => {
    const nextStatus = event.target.value;
    const previousStatus = current;
    setCurrent(nextStatus);
    onChange?.({ status: nextStatus, optimistic: true });
    setUpdating(true);

    try {
      const { data } = await applications.updateStatus(applicationId, nextStatus);
      const savedStatus = normalizeStatus(data.data.status);
      setCurrent(savedStatus);
      onChange?.({ ...data.data, applicationId: data.data.application_id, status: savedStatus });
      showToast('Status updated');
    } catch (error) {
      setCurrent(previousStatus);
      onChange?.({ status: previousStatus, error: true });
      showToast('Update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={current}
        onChange={handleChange}
        disabled={updating || !applicationId}
        className="bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 disabled:opacity-50"
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      {updating && <span className="ml-2 text-[10px] font-bold text-indigo-300">Saving...</span>}
      {toast && (
        <div className="absolute left-0 top-full mt-2 z-20 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-[10px] font-bold text-slate-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
