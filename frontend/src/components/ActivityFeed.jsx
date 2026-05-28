const activityClass = {
  candidate_screened: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  status_changed: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  job_created: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  interview_scheduled: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
};

const activityIcon = {
  candidate_screened: 'AI',
  status_changed: 'ST',
  job_created: 'JB',
  interview_scheduled: 'IN'
};

export default function ActivityFeed({ items = [] }) {
  return (
    <div className="glass-card rounded-[2rem] p-6 h-full">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-300 mb-5">Recent Activity</h2>
      <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {items.length ? items.map((item, index) => (
          <div key={`${item.type}-${item.timestamp}-${index}`} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex gap-3">
            <span className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center text-[10px] font-black ${activityClass[item.type] || activityClass.job_created}`}>
              {activityIcon[item.type] || 'AC'}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-5">{item.description}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'No timestamp'}
              </p>
            </div>
          </div>
        )) : (
          <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-white/10 p-6 text-center">No activity yet.</p>
        )}
      </div>
    </div>
  );
}
