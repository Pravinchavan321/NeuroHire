const difficultyClass = {
  Easy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  Medium: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  Hard: 'bg-rose-500/10 text-rose-300 border-rose-500/25'
};

export default function QuestionCard({ question, hint, purpose, difficulty, topic, type }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="badge border bg-indigo-500/10 text-indigo-300 border-indigo-500/25">{type}</span>
        {difficulty && <span className={`badge border ${difficultyClass[difficulty] || difficultyClass.Medium}`}>{difficulty}</span>}
        {topic && <span className="badge border bg-slate-500/10 text-slate-300 border-slate-500/20">{topic}</span>}
      </div>
      <p className="text-sm font-bold leading-6 text-white">{question}</p>
      {(hint || purpose) && (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          {hint || purpose}
        </p>
      )}
    </div>
  );
}
