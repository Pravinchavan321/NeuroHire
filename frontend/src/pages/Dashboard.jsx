import { useEffect, useState } from 'react';
import { jobs, analysis } from '../api/client';
import CandidateCard from '../components/CandidateCard';
import JobForm from '../components/JobForm';
import UploadCandidate from '../components/UploadCandidate';

export default function Dashboard() {
  const [jobList, setJobList] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    setLoading(true);
    jobs.list()
      .then(r => setJobList(r.data))
      .finally(() => setLoading(false));
  }, []);

  const selectJob = async (job) => {
    setActiveJob(job);
    setLoading(true);
    try {
      const { data } = await analysis.rankings(job.id);
      setRankings(data);
    } catch (err) {
      console.error("Rankings fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (payload) => {
    const { data } = await jobs.create(payload);
    setJobList(j => [data, ...j]);
    setShowForm(false);
    selectJob(data);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Premium Sidebar */}
      <aside className="w-80 glass-card border-r-0 rounded-r-[3rem] my-4 ml-4 flex flex-col z-20">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">N</div>
            <h2 className="text-xl font-black text-white tracking-tight">NeuroHire</h2>
          </div>
          
          <button 
            onClick={() => setShowForm(true)}
            className="premium-btn w-full py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
          >
            <span>+</span> Create New Opening
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 py-6 custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Active Openings</p>
          {loading && jobList.length === 0 ? (
            <div className="space-y-4 px-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            jobList.map(j => (
              <div 
                key={j.id}
                onClick={() => selectJob(j)}
                className={`sidebar-item ${activeJob?.id === j.id ? 'active' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${activeJob?.id === j.id ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{j.title}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight">{j.applicant_count || 0} candidates</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 mt-auto border-t border-white/5">
          <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.email || 'Recruiter'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.company || 'Admin Panel'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Experience Area */}
      <main className="flex-1 overflow-y-auto p-12 relative z-10 custom-scrollbar">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-2xl transform transition-all animate-in zoom-in-95 duration-300">
              <JobForm onSubmit={createJob} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        )}

        {showUpload && activeJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-xl transform transition-all animate-in zoom-in-95 duration-300">
              <UploadCandidate 
                jobId={activeJob.id} 
                onSuccess={() => { setShowUpload(false); selectJob(activeJob); }} 
                onCancel={() => setShowUpload(false)} 
              />
            </div>
          </div>
        )}

        {activeJob ? (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex items-end justify-between mb-12">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="badge badge-applied">Open for applications</span>
                  <span className="text-slate-500 text-xs">• Created {new Date(activeJob.created_at).toLocaleDateString()}</span>
                </div>
                <h1 className="text-5xl font-black text-white tracking-tighter mb-2">{activeJob.title}</h1>
                <p className="text-lg text-slate-400 font-medium">{activeJob.location}</p>
              </div>
              <button 
                onClick={() => setShowUpload(true)}
                className="premium-btn px-8 py-4 rounded-2xl text-white font-bold text-sm shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Add Candidate
              </button>
            </header>

            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Ranked Talent Pool</h3>
                <div className="h-px flex-1 mx-6 bg-white/5" />
                <span className="text-[10px] text-slate-400">Sorted by AI Predictor Accuracy</span>
              </div>
              
              {loading && rankings.length === 0 ? (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => <div key={i} className="h-28 glass-card rounded-3xl animate-pulse" />)}
                </div>
              ) : rankings.length === 0 ? (
                <div className="glass-card rounded-[2rem] p-20 text-center">
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-xl font-bold text-white mb-2">No candidates yet</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">Upload candidate resumes to start the AI matching process for this opening.</p>
                </div>
              ) : (
                rankings.map((c, i) => (
                  <CandidateCard key={c.application_id} candidate={c} rank={i + 1} />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center flex-col text-center">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center text-4xl mb-8 animate-float">🏛️</div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Select an Opening</h2>
            <p className="text-slate-500 max-w-sm leading-relaxed">Choose a job from the sidebar to view ranked candidates and AI intelligence summaries.</p>
          </div>
        )}
      </main>
    </div>
  );
}
