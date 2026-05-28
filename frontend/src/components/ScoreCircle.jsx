export default function ScoreCircle({ score = 0, size = 180, strokeColor }) {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const strokeWidth = Math.max(8, Math.round(size * 0.08));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = strokeColor || (value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444');

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.18)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-white">{value}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Score</span>
      </div>
    </div>
  );
}
