import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobs } from '../api/client';
import CandidateStatusDropdown from '../components/CandidateStatusDropdown';
import StatusBadge, { STATUSES, normalizeStatus } from '../components/StatusBadge';

const columnClass = {
  New: 'border-slate-500/20 bg-slate-500/5',
  Shortlisted: 'border-blue-500/20 bg-blue-500/5',
  Interview: 'border-purple-500/20 bg-purple-500/5',
  Rejected: 'border-rose-500/20 bg-rose-500/5',
  Hired: 'border-emerald-500/20 bg-emerald-500/5'
};

const emptyPipeline = () => STATUSES.reduce((acc, status) => ({ ...acc, [status]: [] }), {});

const scoreColor = (score) => {
  if (score >= 70) return 'text-emerald-300';
  if (score >= 40) return 'text-amber-300';
  return 'text-rose-300';
};

export default function PipelinePage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ job: null, pipeline: emptyPipeline() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    jobs.pipeline(jobId)
      .then((res) => {
        if (active && res.data.success) setData(res.data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.error || 'Unable to load pipeline');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId]);

  const moveCandidate = (applicationId, update) => {
    setData((current) => {
      const nextStatus = normalizeStatus(update.status);
      const nextPipeline = emptyPipeline();
      let movedCard = null;

      STATUSES.forEach((status) => {
        (current.pipeline?.[status] || []).forEach((card) => {
          if (card.applicationId === applicationId) {
            movedCard = { ...card, status: nextStatus, statusUpdatedAt: update.status_updated_at || card.statusUpdatedAt };
          } else {
            nextPipeline[status].push(card);
          }
        });
      });

      if (movedCard) nextPipeline[nextStatus].push(movedCard);
      return { ...current, pipeline: nextPipeline };
    });
  };

  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header className="glass-card rounded-[2rem] p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-200 transition-colors"
            >
              &lt;- Back
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300 mb-2">Candidate Pipeline</p>
            <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight">{data.job?.title || 'Pipeline'}</h1>
          </div>
        </header>

        {error ? (
          <div className="glass-card rounded-[2rem] p-10 text-center border-rose-500/20">
            <h2 className="text-2xl font-black text-white mb-2">Pipeline unavailable</h2>
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        ) : (
          <section className="overflow-x-auto pb-4">
            <div className="grid grid-cols-5 gap-4 min-w-[1180px]">
              {STATUSES.map((status) => {
                const cards = data.pipeline?.[status] || [];
                return (
                  <div key={status} className={`rounded-[1.5rem] border p-4 min-h-[620px] ${columnClass[status]}`}>
                    <div className="flex items-center justify-between mb-5">
                      <StatusBadge status={status} />
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-slate-300">{cards.length}</span>
                    </div>

                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((item) => <div key={item} className="h-36 rounded-2xl bg-white/5 animate-pulse" />)}
                      </div>
                    ) : cards.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                        No candidates
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cards.map((card) => {
                          const score = Math.round(Number(card.score) || 0);
                          return (
                            <div key={card.applicationId} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{card.name || 'Unknown Candidate'}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{card.email || card.jobTitle}</p>
                                </div>
                                <span className={`text-lg font-black ${scoreColor(score)}`}>{score}%</span>
                              </div>
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 truncate">{card.jobTitle}</p>
                              <CandidateStatusDropdown
                                applicationId={card.applicationId}
                                value={card.status}
                                onChange={(update) => moveCandidate(card.applicationId, update)}
                                className="w-full"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
