interface Props {
  label: string;
  value: string;
  change: number | null;
  polarity?: "positive" | "negative";
  tip?: string;
}

export default function KpiCard({ label, value, change, polarity = "positive", tip }: Props) {
  let changeColor = "text-slate-400";
  let changeIcon = "";
  if (change !== null) {
    const isUp = change > 0;
    const isGood = polarity === "positive" ? isUp : !isUp;
    changeColor = isGood ? "text-emerald-600" : "text-red-500";
    changeIcon = change > 0 ? "\u2191" : change < 0 ? "\u2193" : "\u2192";
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col gap-0.5 relative group">
      <span className="text-xs text-slate-500 flex items-center gap-1">
        {label}
        {tip && (
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-100 text-slate-400 text-[9px] leading-none cursor-help">
            ?
          </span>
        )}
      </span>
      <span className="text-lg font-bold text-slate-800 tracking-tight">{value}</span>
      {change !== null && (
        <span className={`text-xs font-medium ${changeColor}`}>
          {changeIcon} {change}%
        </span>
      )}
      {tip && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-slate-800 text-white text-[10px] rounded-md px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {tip}
        </div>
      )}
    </div>
  );
}
