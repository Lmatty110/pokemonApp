import { TYPE_COLORS, TYPE_LABELS } from "../lib/pokemonTypes";

export default function TypeBadge({ type, multiplier, className = "" }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center justify-center gap-1.5 rounded-full px-3 py-1 font-lato text-xs font-bold uppercase tracking-wide text-white shadow-sm ${className}`}
      style={{ backgroundColor: TYPE_COLORS[type] || "#64748B", textShadow: "0 1px 2px rgba(0,0,0,.35)" }}
    >
      {TYPE_LABELS[type] || type}
      {multiplier !== undefined && <strong className="rounded-full bg-black/20 px-1.5 font-courier">×{String(multiplier).replace(".", ",")}</strong>}
    </span>
  );
}

