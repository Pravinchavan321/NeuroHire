export const STATUSES = ['New', 'Shortlisted', 'Interview', 'Rejected', 'Hired'];

export const normalizeStatus = (status) => {
  if (STATUSES.includes(status)) return status;
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'shortlisted') return 'Shortlisted';
  if (normalized === 'interview') return 'Interview';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'hired' || normalized === 'offer') return 'Hired';
  return 'New';
};

const statusClass = {
  New: 'bg-slate-500/10 border-slate-500/20 text-slate-300',
  Shortlisted: 'bg-blue-500/10 border-blue-500/25 text-blue-300',
  Interview: 'bg-purple-500/10 border-purple-500/25 text-purple-300',
  Rejected: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
  Hired: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
};

export default function StatusBadge({ status }) {
  const value = normalizeStatus(status);
  return (
    <span className={`badge border w-fit ${statusClass[value]}`}>
      {value}
    </span>
  );
}
