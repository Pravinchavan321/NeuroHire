import { analysis } from '../api/client';

export default function ExportButton({ candidates }) {
  const handleExport = () => {
    if (!candidates || candidates.length === 0) return;

    const headers = ['Name', 'Score', 'Skill Overlap %', 'Experience Score', 'Summary'];
    const rows = candidates.map(c => [
      c.name,
      c.ai_score || 0,
      c.skill_overlap_pct || 0,
      c.exp_score || 0,
      `"${(c.summary || '').replace(/"/g, '""')}"` // Escape quotes for CSV
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('href', url);
    link.setAttribute('download', `neurohire-candidates-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Audit log the export
    analysis.logExport().catch(e => console.error('Audit log failed:', e));
  };

  const isDisabled = !candidates || candidates.length === 0;

  return (
    <button
      onClick={handleExport}
      disabled={isDisabled}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
        isDisabled 
          ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
          : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 active:scale-95'
      }`}
    >
      Export CSV
    </button>
  );
}
