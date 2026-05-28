import { useEffect, useState } from 'react';

export default function StatCard({ icon, label, value, color = 'text-indigo-300', trend }) {
  const numeric = typeof value === 'number';
  const [display, setDisplay] = useState(numeric ? 0 : value);

  useEffect(() => {
    if (!numeric) {
      setDisplay(value);
      return;
    }

    let frame;
    const start = performance.now();
    const duration = 700;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * progress * 10) / 10);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric, value]);

  return (
    <div className="glass-card rounded-[1.5rem] p-5 border-white/5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        {trend && <span className="text-[10px] font-bold text-emerald-300">{trend}</span>}
      </div>
      <p className={`text-[10px] font-black uppercase tracking-[0.22em] mb-2 ${color}`}>{label}</p>
      <p className="text-3xl font-black text-white">{display}</p>
    </div>
  );
}
