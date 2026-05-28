import { useState } from 'react';

export default function JobForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', location: '',
    required_skills: '', experience_min: 0
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        required_skills: form.required_skills.split(',').map(s => s.trim()).filter(s => s),
        experience_min: Number(form.experience_min),
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create opening. Please check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-[2.5rem] p-10 w-full relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8">
        <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors text-2xl">×</button>
      </div>
      
      <div className="mb-10">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">Create New Opening</h2>
        <p className="text-slate-400 text-sm">Define the role requirements for the AI to start matching talent.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block ml-1">Position Title</label>
            <input 
              type="text" 
              placeholder="e.g. Senior Software Engineer"
              className="input-premium"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block ml-1">Office Location</label>
            <input 
              type="text" 
              placeholder="e.g. Remote / New York"
              className="input-premium"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block ml-1">Role Description</label>
          <textarea 
            rows={4} 
            minLength={20}
            placeholder="What will this person do? What are the mission goals?"
            className="input-premium py-4 resize-none"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block ml-1">Required Skills (keywords for AI)</label>
          <input 
            type="text" 
            placeholder="python, react, docker, kubernetes..."
            className="input-premium"
            value={form.required_skills}
            onChange={e => setForm({ ...form, required_skills: e.target.value })}
            required
          />
          <p className="text-[10px] text-slate-600 mt-2 ml-1">Separate skills with commas. The AI uses these as anchor points for scoring.</p>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block ml-1">Minimum Experience (Years)</label>
          <input 
            type="number" 
            min="0"
            className="input-premium w-32"
            value={form.experience_min}
            onChange={e => setForm({ ...form, experience_min: e.target.value })}
          />
        </div>

        <div className="flex gap-4 pt-6">
          <button type="submit" disabled={submitting} className="premium-btn px-10 py-4 rounded-2xl text-white font-bold text-sm shadow-xl shadow-indigo-500/10">
            {submitting ? 'Publishing...' : 'Publish Opening'}
          </button>
          <button type="button" onClick={onCancel} className="px-10 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-sm border border-white/5 hover:bg-white/10 transition-all">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
