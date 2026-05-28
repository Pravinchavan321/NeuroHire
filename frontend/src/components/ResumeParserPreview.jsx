function Section({ title, children }) {
  return (
    <div className="border-t border-white/10 pt-5">
      <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ParsingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-64 rounded-xl bg-white/10 mx-auto" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-12 rounded-xl bg-white/5" />)}
      </div>
      <div className="h-24 rounded-2xl bg-white/5" />
      <div className="h-24 rounded-2xl bg-white/5" />
    </div>
  );
}

export default function ResumeParserPreview({ parsedData, onConfirm, onCancel, confirming = false, statusMessage = '', error = '' }) {
  if (!parsedData) {
    return (
      <div className="glass-card rounded-[2rem] p-8">
        <p className="text-center text-sm font-bold text-indigo-300 mb-6">Parsing resume...</p>
        <ParsingSkeleton />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[2rem] p-8 max-h-[82vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300 mb-2">Resume Parsed Successfully</p>
          <h2 className="text-2xl font-black text-white">{parsedData.name || 'Candidate Preview'}</h2>
        </div>
        <div className="flex gap-2">
          <button disabled={confirming} onClick={onConfirm} className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-black disabled:opacity-50">✓</button>
          <button disabled={confirming} onClick={onCancel} className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/25 font-black disabled:opacity-50">×</button>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs text-center font-bold">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">Name: {parsedData.name || 'Not found'}</p>
        <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">Email: {parsedData.email || 'Not found'}</p>
        <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">Location: {parsedData.location || 'Not found'}</p>
        <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">Phone: {parsedData.phone || 'Not found'}</p>
        <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300 md:col-span-2">LinkedIn: {parsedData.linkedin || 'Not found'}</p>
        <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300 md:col-span-2">Experience: {parsedData.total_experience_years || 0} years</p>
      </div>

      <div className="space-y-6">
        <Section title="Summary">
          <p className="text-sm leading-6 text-slate-300">{parsedData.summary || 'No summary extracted.'}</p>
        </Section>

        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {parsedData.skills?.length ? parsedData.skills.map((skill, index) => (
              <span key={`${skill}-${index}`} className="px-3 py-2 rounded-full bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 text-xs font-bold">{skill}</span>
            )) : <p className="text-sm text-slate-500">No skills extracted.</p>}
          </div>
        </Section>

        <Section title="Experience">
          <div className="space-y-3">
            {parsedData.experience?.length ? parsedData.experience.map((item, index) => (
              <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm font-bold text-white">{item.role || 'Role'} @ {item.company || 'Company'}</p>
                <p className="text-xs text-indigo-300 mt-1">{item.duration || 'Duration not found'}</p>
                <p className="text-xs text-slate-400 mt-2 leading-5">{item.description || 'No description extracted.'}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No experience extracted.</p>}
          </div>
        </Section>

        <Section title="Education">
          <div className="space-y-2">
            {parsedData.education?.length ? parsedData.education.map((item, index) => (
              <p key={index} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                {item.degree || 'Degree'} - {item.institution || 'Institution'} {item.year ? `(${item.year})` : ''}
              </p>
            )) : <p className="text-sm text-slate-500">No education extracted.</p>}
          </div>
        </Section>

        <Section title="Certifications">
          <div className="flex flex-wrap gap-2">
            {parsedData.certifications?.length ? parsedData.certifications.map((cert, index) => (
              <span key={`${cert}-${index}`} className="px-3 py-2 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 text-xs font-bold">{cert}</span>
            )) : <p className="text-sm text-slate-500">No certifications extracted.</p>}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 mt-6 border-t border-white/10">
        <button disabled={confirming} onClick={onConfirm} className="premium-btn py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-50">
          {confirming ? 'Starting Screening...' : 'Confirm & Proceed to Screening'}
        </button>
        <button disabled={confirming} onClick={onCancel} className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-sm border border-white/10 disabled:opacity-50">
          Cancel Upload
        </button>
      </div>
    </div>
  );
}
