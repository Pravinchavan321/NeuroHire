import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { jobs } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const badgeClass = {
  Shortlist: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  Review: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Reject: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
};

const riskClass = {
  Low: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  Medium: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  High: 'text-rose-300 bg-rose-500/10 border-rose-500/30'
};

const rankClass = {
  1: 'bg-yellow-400/20 text-yellow-200 border-yellow-400/40',
  2: 'bg-slate-300/20 text-slate-100 border-slate-300/40',
  3: 'bg-orange-400/20 text-orange-200 border-orange-400/40'
};

function StatCard({ label, value }) {
  return (
    <div className="glass-card rounded-[1.5rem] p-5 border-white/5">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

export default function JobRankingPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    jobs.ranking(jobId, { page, limit: 20 })
      .then((res) => {
        if (active && res.data.success) setData(res.data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.error || 'Unable to load ranking');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId, page]);

  const candidates = data?.candidates || [];
  const totalPages = data?.totalPages || 1;

  return (
    <main className="min-h-screen p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="glass-card rounded-[2rem] p-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-200 transition-colors"
            >
              &lt;- Back
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300 mb-2">Job Ranking</p>
            <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight">{data?.job?.title || 'Candidate Ranking'}</h1>
            <p className="text-sm text-slate-400 mt-2">
              {data?.job?.company || 'NeuroHire'} {data?.job?.created_at ? `- Posted ${new Date(data.job.created_at).toLocaleDateString()}` : ''}
            </p>
          </div>
        </header>

        {error ? (
          <div className="glass-card rounded-[2rem] p-10 text-center border-rose-500/20">
            <h2 className="text-2xl font-black text-white mb-2">Ranking unavailable</h2>
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Total CVs" value={data?.total ?? 0} />
              <StatCard label="Avg Score" value={`${data?.avgScore ?? 0}%`} />
              <StatCard label="Shortlist Count" value={data?.shortlistedCount ?? 0} />
              <StatCard label="Pending Count" value={data?.pendingCount ?? 0} />
            </section>

            <section className="glass-card rounded-[2rem] p-5 lg:p-6">
              <div className="hidden lg:grid grid-cols-[70px_1.25fr_1fr_150px_110px_130px_80px] gap-4 px-4 pb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                <span>Rank</span>
                <span>Name</span>
                <span>Score</span>
                <span>Recommendation</span>
                <span>Risk</span>
                <span>Status</span>
                <span>View</span>
              </div>

              {loading ? (
                <LoadingRows />
              ) : candidates.length === 0 ? (
                <div className="p-12 text-center">
                  <h2 className="text-xl font-black text-white mb-2">No screened candidates</h2>
                  <p className="text-sm text-slate-500">Upload candidates to start building this ranking.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate, index) => {
                    const rank = (page - 1) * (data?.limit || 20) + index + 1;
                    const score = Math.max(0, Math.min(100, candidate.score || 0));
                    return (
                      <div key={candidate.applicationId} className="grid grid-cols-1 lg:grid-cols-[70px_1.25fr_1fr_150px_110px_130px_80px] gap-4 items-center rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-sm font-black ${rankClass[rank] || 'bg-slate-800/70 text-slate-300 border-white/10'}`}>
                          {rank}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{candidate.name || 'Unknown Candidate'}</p>
                          <p className="text-xs text-slate-500 truncate">{candidate.email || 'No email'}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400">AI Match</span>
                            <span className="text-sm font-black text-white">{score}%</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                        <span className={`badge border w-fit ${badgeClass[candidate.recommendation] || badgeClass.Review}`}>
                          {candidate.recommendation}
                        </span>
                        <span className={`badge border w-fit ${riskClass[candidate.riskLevel] || riskClass.Medium}`}>
                          {candidate.riskLevel}
                        </span>
                        <StatusBadge status={candidate.status} />
                        <Link
                          to={`/candidates/${candidate.candidateId}/score/${jobId}`}
                          className="px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-bold text-indigo-300 border border-indigo-500/20 text-center transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5">
                <button
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
