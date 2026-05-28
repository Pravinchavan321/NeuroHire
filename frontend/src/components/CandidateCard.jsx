import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { candidates as candidatesApi, feedback as feedbackApi } from '../api/client';

const STATUS_BADGES = {
// ... same ...
};

export default function CandidateCard({ candidate, rank, jobId }) {
  const [expanded, setExpanded] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState('');
  const [similarCandidates, setSimilarCandidates] = useState(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [rating, setRating] = useState(0); // 1 or -1
  const [note, setNote] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const isProcessing = candidate.ai_status === 'processing';
  const isFailed = candidate.ai_status === 'failed';
  const isComplete = candidate.ai_status === 'complete';

  const toggleDetail = async () => {
    if (isComplete) {
      const nextState = !expanded;
      setExpanded(nextState);
      setReanalyzeError('');
      setSimilarCandidates(null);
      
      if (nextState) {
        // Fetch existing feedback
        try {
          const { data: res } = await feedbackApi.get(candidate.application_id);
          if (res.success && res.data.length > 0) {
            const myFeedback = res.data.find(f => f.recruiter_name === JSON.parse(localStorage.getItem('user')).email);
            if (myFeedback) {
              setRating(myFeedback.rating);
              setNote(myFeedback.note || '');
            }
          }
        } catch (e) { console.error('Failed to fetch feedback', e); }
      }
    }
  };

  const handleFeedbackSubmit = async () => {
    if (rating === 0) return;
    setSubmittingFeedback(true);
    try {
      await feedbackApi.submit({
        application_id: candidate.application_id,
        rating,
        note
      });
    } catch (e) {
      console.error('Feedback submit failed', e);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleFindSimilar = async (e) => {
    e.stopPropagation();
    setLoadingSimilar(true);
    try {
      const { data: res } = await candidatesApi.similar(candidate.application_id);
      if (res.success) setSimilarCandidates(res.data);
    } catch (err) {
      console.error('Similarity search failed:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleReanalyze = async (e) => {
    e.stopPropagation();
    setReanalyzing(true);
    setReanalyzeError('');
    try {
      await candidatesApi.reanalyze(candidate.candidate_id);
      setExpanded(false);
      // The parent Dashboard re-fetches rankings periodically or via polling
      // But here we just assume the status will change to processing
      candidate.ai_status = 'processing'; 
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) setReanalyzeError('Analysis already in progress');
      else if (status === 404) setReanalyzeError('Resume file not found');
      else setReanalyzeError('Re-analysis failed. Try again.');
    } finally {
      setReanalyzing(false);
    }
  };

  const score = candidate.ai_score !== null ? Math.round(candidate.ai_score) : null;
  const scoreColor = score === null ? 'text-slate-500' : score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className={`glass-card rounded-3xl overflow-hidden transition-all duration-500 ${expanded ? 'ring-2 ring-indigo-500/30' : (isComplete ? 'hover:scale-[1.01] cursor-pointer' : '')}`} onClick={toggleDetail}>
      <div className="p-6 flex items-center gap-6">
        {/* ... profile ... */}
        <div className="relative group">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:from-indigo-500/40 transition-all">
            <span className="text-xl font-bold text-white">#{rank}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate mb-1">{candidate.name || 'Unknown Candidate'}</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Skills</span>
              <span className="text-xs font-bold text-indigo-400">{Math.round(candidate.skill_overlap_pct)}%</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-white/5 pl-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Exp</span>
              <span className="text-xs font-bold text-purple-400">{Math.round(candidate.exp_score)}%</span>
            </div>
          </div>
        </div>

        {/* AI Score Badge */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Match</span>
          {isProcessing ? (
            <span className="badge badge-applied flex items-center gap-2 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Processing
            </span>
          ) : isFailed ? (
            <span className="badge badge-rejected">Failed</span>
          ) : (
            <div className="flex flex-col items-end">
              <span className={`text-xl font-black ${scoreColor}`}>{score}%</span>
              <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          )}
          {candidate.candidate_id && jobId && (
            <Link
              to={`/candidates/${candidate.candidate_id}/score/${jobId}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-indigo-500/20 text-[10px] font-bold text-indigo-300 border border-white/10 transition-colors"
            >
              View AI Score
            </Link>
          )}
        </div>

        {/* Status indicator (Chevron) */}
        {isComplete && (
          <div className={`text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </div>
        )}
      </div>

      {expanded && isComplete && (
        <div className="px-6 pb-8 pt-2 animate-in slide-in-from-top-4 duration-500 bg-white/[0.01]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
            {/* AI Summary Card */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <span className="text-lg">🤖</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider">Analysis Summary</span>
                </div>
                <div className="flex flex-col items-end">
                  <button 
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {reanalyzing ? 'Starting...' : '↻ Re-analyze Resume'}
                  </button>
                  {reanalyzeError && <span className="text-[9px] text-rose-500 mt-1">{reanalyzeError}</span>}
                </div>
              </div>
              
              {candidate.bias_flag && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-3 animate-pulse">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <p className="text-[11px] text-amber-200 font-medium">
                    Review recommended: {candidate.bias_reason}
                  </p>
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                {candidate.summary || 'No summary available.'}
              </p>

              {candidate.score_breakdown && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span className="text-lg">📊</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Score Explainability</span>
                  </div>
                  <div className="bg-slate-800/20 p-6 rounded-[2rem] border border-white/5 space-y-5">
                    {[
                      { label: 'Skill Match', score: candidate.score_breakdown.tfidf_contribution, weight: '40%', color: 'bg-indigo-500' },
                      { label: 'Experience', score: candidate.score_breakdown.exp_contribution, weight: '30%', color: 'bg-purple-500' },
                      { label: 'Keyword Overlap', score: candidate.score_breakdown.overlap_contribution, weight: '30%', color: 'bg-emerald-500' },
                    ].map((row, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-300">{row.label}</span>
                            <span className="text-[9px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-full font-bold">{row.weight}</span>
                          </div>
                          <span className="text-xs font-bold text-white">+{row.score.toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${row.color} rounded-full`}
                            style={{ width: `${(row.score / 40) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Final AI Match Score</span>
                      <span className="text-lg font-black text-indigo-400">{Math.round(candidate.ai_score)}%</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span className="text-lg">📢</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Recruiter Feedback</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setRating(1); }}
                      className={`p-2 rounded-xl transition-all ${rating === 1 ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                    >
                      👍
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setRating(-1); }}
                      className={`p-2 rounded-xl transition-all ${rating === -1 ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                    >
                      👎
                    </button>
                  </div>
                </div>

                {rating !== 0 && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <textarea 
                      onClick={e => e.stopPropagation()}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add a note (e.g., 'Score too high for junior role')"
                      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 min-h-[80px]"
                      maxLength={200}
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleFeedbackSubmit(); }}
                      disabled={submittingFeedback}
                      className="w-full py-3 rounded-2xl bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      {submittingFeedback ? 'Submitting...' : 'Save Feedback'}
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400">
                    <span className="text-lg">🔍</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Similar Candidates</span>
                  </div>
                  <button 
                    onClick={handleFindSimilar}
                    disabled={loadingSimilar}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                  >
                    {loadingSimilar ? 'Searching...' : 'Find Similar to this Candidate'}
                  </button>
                </div>

                {similarCandidates && (
                  <div className="space-y-2 animate-in fade-in duration-500">
                    {similarCandidates.length > 0 ? similarCandidates.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs font-medium text-white">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase">Distance</span>
                          <span className="text-[10px] font-mono text-blue-400">{c.distance.toFixed(3)}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-[10px] text-slate-500 italic text-center py-4 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                        No similar candidates found within your company.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Questions Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <span className="text-lg">❓</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Pressure Tests</span>
              </div>
              <div className="space-y-3">
                {candidate.interview_questions?.length > 0 ? candidate.interview_questions.map((q, i) => {
                  const isObject = typeof q === 'object';
                  const difficulty = isObject ? q.difficulty?.toLowerCase() : null;
                  const diffColor = difficulty === 'hard' ? 'text-rose-400 bg-rose-400/10' : difficulty === 'medium' ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';
                  
                  return (
                    <div key={i} className="bg-slate-800/40 p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-[11px] text-slate-300 leading-relaxed flex-1">
                          <span className="text-purple-400 font-bold mr-2">{i+1}.</span>
                          {isObject ? q.question : q}
                        </p>
                        {isObject && difficulty && (
                          <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${diffColor}`}>
                            {difficulty}
                          </span>
                        )}
                      </div>
                      {isObject && q.targets_skill && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Focus:</span>
                          <span className="text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                            {q.targets_skill}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }) : <p className="text-[10px] text-slate-500 italic p-4">No questions generated.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
