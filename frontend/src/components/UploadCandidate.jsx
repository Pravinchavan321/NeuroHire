import { useState } from 'react';
import { candidates } from '../api/client';

export default function UploadCandidate({ jobId, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', resume: null });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.resume) return setError('Please select a resume file.');

    setLoading(true);
    setError('');
    
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('email', form.email);
    fd.append('phone', form.phone);
    fd.append('job_id', jobId);
    fd.append('resume', form.resume);

    try {
      await candidates.upload(fd);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload candidate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-[2.5rem] p-10 w-full relative">
      <div className="absolute top-0 right-0 p-8">
        <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors text-2xl">×</button>
      </div>

      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
          <span className="text-2xl">📄</span>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">Upload Candidate</h2>
        <p className="text-slate-400 text-sm">Submit resume text or PDF for AI pre-screening.</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-5">
          <input 
            className="input-premium"
            placeholder="Candidate's Full Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <input 
            className="input-premium"
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
          <input 
            className="input-premium"
            placeholder="Phone Number (optional)"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div className="relative group">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">Resume File (PDF / DOCX)</label>
          <div className="relative h-32 w-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center group-hover:border-indigo-500/30 transition-all bg-white/[0.02]">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={e => setForm({ ...form, resume: e.target.files[0] })}
              accept=".pdf,.docx,.doc,.txt"
              required
            />
            {form.resume ? (
              <div className="flex flex-col items-center">
                <span className="text-indigo-400 font-bold text-sm mb-1">{form.resume.name}</span>
                <span className="text-[10px] text-slate-600 uppercase">File ready for analysis</span>
              </div>
            ) : (
              <div className="flex flex-col items-center pointer-events-none">
                <span className="text-slate-500 text-xs mb-1 font-medium">Click or drag resume here</span>
                <span className="text-[10px] text-slate-700 font-bold uppercase tracking-tighter">MAX SIZE 10MB</span>
              </div>
            )}
          </div>
        </div>

        <button 
          className="premium-btn w-full py-4 rounded-2xl text-white font-bold text-sm mt-4 shadow-xl shadow-indigo-500/20 group"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Intelligence...</span>
            </div>
          ) : (
            'Initiate AI Screening'
          )}
        </button>
      </form>
    </div>
  );
}
