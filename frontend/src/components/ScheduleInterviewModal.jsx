import { useState } from 'react';
import { interviews } from '../api/client';

export default function ScheduleInterviewModal({ applicationId, candidateId, jobId, candidateName, jobTitle, onClose }) {
  const [form, setForm] = useState({
    date: '',
    time: '',
    interviewerName: '',
    meetingLink: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await interviews.schedule({ applicationId, candidateId, jobId, ...form });
      setSuccess(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to schedule interview');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
      <div className="glass-card w-full max-w-2xl rounded-[2rem] p-6 lg:p-8 border border-white/10">
        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
            Interview scheduled & email sent!
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">Schedule Interview</p>
            <h2 className="mt-2 text-2xl font-black text-white">{candidateName}</h2>
            <p className="text-sm text-slate-400">{jobTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/5 text-slate-300 hover:bg-white/10"
            aria-label="Close schedule interview modal"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={(event) => updateField('date', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Time
            <input
              type="time"
              required
              value={form.time}
              onChange={(event) => updateField('time', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-widest text-slate-400 md:col-span-2">
            Interviewer Name
            <input
              type="text"
              required
              value={form.interviewerName}
              onChange={(event) => updateField('interviewerName', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="Recruiter or interviewer"
            />
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-widest text-slate-400 md:col-span-2">
            Meeting Link
            <input
              type="url"
              value={form.meetingLink}
              onChange={(event) => updateField('meetingLink', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="https://meet.example.com/interview"
            />
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-widest text-slate-400 md:col-span-2">
            Notes
            <textarea
              rows="4"
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="Agenda, prep notes, or logistics"
            />
          </label>

          {error && <p className="text-sm font-semibold text-rose-300 md:col-span-2">{error}</p>}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="premium-btn rounded-2xl px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Scheduling...' : 'Schedule & Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
