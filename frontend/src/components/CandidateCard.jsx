import { useState } from 'react';
import { analysis } from '../api/client';

const STATUS_BADGES = {
  applied:   'badge-applied',
  screening: 'badge-screening',
  interview: 'badge-interview',
  offer:     'badge-offer',
  rejected:  'badge-rejected',
};

export default function CandidateCard({ candidate, rank }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState(candidate.status);

  const toggleDetail = async () => {
    if (!detail) {
      setLoading(true);
      try {
        const { data } = await analysis.get(candidate.application_id);
        setDetail(data);
      } catch (err) {
        console.error("Failed to load AI response:", err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await analysis.updateStatus(candidate.application_id, newStatus);
      setStatus(newStatus);
    } catch (err) {
      console.error("Status update failed");
    }
  };

  const score = Math.round(candidate.overall_score || 0);
  const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = score >= 70 ? 'bg-emerald-500/20' : score >= 40 ? 'bg-amber-500/20' : 'bg-rose-500/20';

  return (
    <div className={`glass-card rounded-3xl overflow-hidden transition-all duration-500 ${expanded ? 'ring-2 ring-indigo-500/30' : 'hover:scale-[1.01]'}`}>
      <div className="p-6 flex items-center gap-6">
        {/* Profile / Rank */}
        <div className="relative group">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:from-indigo-500/40 transition-all">
            <span className="text-xl font-bold text-white">#{rank}</span>
          </div>
          {score > 80 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
              <span className="text-[10px]">✨</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate mb-1">{candidate.name}</h3>
          <p className="text-sm text-slate-400 truncate">{candidate.email}</p>
        </div>

        {/* AI Score Visualizer */}
        <div className="flex flex-col items-end gap-2 pr-4 border-r border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Match Accuracy</span>
            <span className={`text-xl font-black ${scoreColor}`}>{score}%</span>
          </div>
          <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Custom Status Select */}
        <div className="relative inline-block">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`appearance-none badge ${STATUS_BADGES[status]} cursor-pointer pr-8 outline-none focus:ring-1 focus:ring-white/20`}
          >
            {Object.keys(STATUS_BADGES).map(s => (
              <option key={s} value={s} className="bg-slate-900 text-slate-300">{s}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[8px]">▼</div>
        </div>

        {/* Action */}
        <button 
          onClick={toggleDetail}
          className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-slate-200 transition-all active:scale-95"
        >
          {loading ? 'Analyzing...' : expanded ? 'Hide Insights' : 'AI Analysis'}
        </button>
      </div>

      {expanded && detail && (
        <div className="px-6 pb-8 pt-2 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
            {/* AI Summary Card */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <span className="text-lg">🤖</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Recruiter Intelligence Summary</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                {detail.llm_summary}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase block mb-3">Matched Strengths</span>
                  <div className="flex flex-wrap gap-2">
                    {detail.skill_overlap?.matched?.map(s => (
                      <span key={s} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                  <span className="text-[10px] font-bold text-rose-400 uppercase block mb-3">Development Gaps</span>
                  <div className="flex flex-wrap gap-2">
                    {detail.skill_overlap?.missing?.map(s => (
                      <span key={s} className="text-[10px] bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-lg border border-rose-500/20">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Questions Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <span className="text-lg">❓</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Suggested Pressure Tests</span>
              </div>
              <div className="space-y-3">
                {detail.llm_questions?.map((q, i) => (
                  <div key={i} className="bg-slate-800/40 p-3 rounded-xl border border-white/5 text-[11px] text-slate-400 leading-relaxed hover:border-purple-500/30 transition-colors">
                    <span className="text-purple-400 font-bold mr-2">{i+1}.</span> {q}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
