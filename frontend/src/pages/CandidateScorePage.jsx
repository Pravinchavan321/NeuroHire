import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { screeningResults } from '../api/client';
import CandidateStatusDropdown from '../components/CandidateStatusDropdown';
import ScoreCircle from '../components/ScoreCircle';
import ScheduleInterviewModal from '../components/ScheduleInterviewModal';
import StatusBadge from '../components/StatusBadge';

const badgeClass = {
  Shortlist: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  Review: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Reject: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
};

const riskClass = {
  Low: 'bg-emerald-500',
  Medium: 'bg-amber-500',
  High: 'bg-rose-500'
};

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-12 w-72 rounded-2xl bg-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="h-80 rounded-[2rem] glass-card" />
        <div className="h-80 rounded-[2rem] glass-card" />
      </div>
      <div className="h-56 rounded-[2rem] glass-card" />
    </div>
  );
}

export default function CandidateScorePage() {
  const { candidateId, jobId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    screeningResults.get(candidateId, jobId)
      .then(({ data }) => {
        if (active && data.success) setResult(data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Unable to load screening result');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [candidateId, jobId]);

  const scoreColor = useMemo(() => {
    const score = result?.score || 0;
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }, [result]);

  if (loading) {
    return <main className="min-h-screen p-6 lg:p-12"><LoadingSkeleton /></main>;
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 lg:p-12 flex items-center justify-center">
        <div className="glass-card max-w-lg w-full rounded-[2rem] p-10 text-center border-rose-500/20">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-300 mb-3">Screening Result</p>
          <h1 className="text-3xl font-black text-white mb-3">Not ready yet</h1>
          <p className="text-sm text-slate-400 mb-8">{error}</p>
          <button onClick={() => navigate(-1)} className="premium-btn px-6 py-3 rounded-2xl text-sm font-bold text-white">
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 lg:p-12">
      {showSchedule && (
        <ScheduleInterviewModal
          applicationId={result.applicationId}
          candidateId={candidateId}
          jobId={jobId}
          candidateName={result.candidateName}
          jobTitle={result.jobTitle}
          onClose={() => setShowSchedule(false)}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="glass-card rounded-[2rem] p-5 lg:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-fit px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-200 transition-colors"
          >
            &lt;- Back
          </button>
          <div className="text-left md:text-right min-w-0">
            <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tight truncate">{result.candidateName}</h1>
            <p className="text-sm text-slate-400 truncate">{result.jobTitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 md:justify-end">
              <StatusBadge status={result.status} />
              <CandidateStatusDropdown
                applicationId={result.applicationId}
                value={result.status}
                onChange={(update) => setResult((current) => ({ ...current, status: update.status }))}
              />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="glass-card rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6">
            <ScoreCircle score={result.score} size={190} strokeColor={scoreColor} />
            <span className={`badge border ${badgeClass[result.recommendation] || badgeClass.Review}`}>
              {result.recommendation}
            </span>
            <button
              onClick={() => navigate(`/candidates/${candidateId}/interview/${jobId}`)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 hover:bg-indigo-500/20 text-xs font-bold text-indigo-300 border border-white/10 transition-colors"
            >
              Generate Interview Questions
            </button>
            {['Shortlisted', 'Interview'].includes(result.status) && (
              <button
                onClick={() => setShowSchedule(true)}
                className="w-full px-4 py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-200 border border-emerald-500/20 transition-colors"
              >
                Schedule Interview
              </button>
            )}
          </div>

          <div className="glass-card rounded-[2rem] p-8 lg:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300 mb-3">AI Screening Result</p>
            <h2 className="text-2xl font-black text-white mb-4">Summary</h2>
            <p className="text-slate-300 leading-7 text-base">{result.summary || 'No summary available.'}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
                <span className={`w-3 h-3 rounded-full ${riskClass[result.riskLevel] || riskClass.Medium}`} />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Risk Level</p>
                  <p className="text-sm font-bold text-white">{result.riskLevel}</p>
                </div>
              </div>
              {result.biasFlag && (
                <div className="rounded-2xl bg-amber-500/10 px-4 py-3 border border-amber-500/20">
                  <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Bias Review</p>
                  <p className="text-sm text-amber-100">{result.biasReason}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-[2rem] p-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300 mb-5">Strengths</h3>
            <div className="flex flex-wrap gap-3">
              {result.strengths?.length ? result.strengths.map((item, index) => (
                <span key={`${item}-${index}`} className="px-3 py-2 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 text-xs font-bold">
                  {item}
                </span>
              )) : <p className="text-sm text-slate-500">No strengths listed.</p>}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-rose-300 mb-5">Missing Skills</h3>
            <div className="flex flex-wrap gap-3">
              {result.missingSkills?.length ? result.missingSkills.map((item, index) => (
                <span key={`${item}-${index}`} className="px-3 py-2 rounded-full bg-rose-500/10 text-rose-200 border border-rose-500/20 text-xs font-bold">
                  {item}
                </span>
              )) : <p className="text-sm text-slate-500">No missing skills found.</p>}
            </div>
          </div>
        </section>

        <footer className="glass-card rounded-[2rem] p-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Screened At</p>
          <p className="text-sm font-semibold text-slate-300">
            {result.screenedAt ? new Date(result.screenedAt).toLocaleString() : 'Unavailable'}
          </p>
        </footer>
      </div>
    </main>
  );
}
