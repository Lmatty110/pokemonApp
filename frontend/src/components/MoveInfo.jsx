import { Info } from "lucide-react";
import { getDamageDice, getTypeColor, getTypeLabel } from "../lib/moves";

export function MoveType({ type }) {
  return <span className="inline-flex items-center gap-1.5 text-xs font-lato text-gray-600" data-testid="move-type">
    <span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getTypeColor(type) }} />
    {getTypeLabel(type)}
  </span>;
}

export function MovePower({ power }) {
  const dice = getDamageDice(power);
  return <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-courier text-sm" data-testid="move-power">
    <span className="text-[#C0392B]">{power > 0 ? power : "—"}</span>
    {dice && <span className="rounded bg-[#8E44AD]/10 px-1.5 py-0.5 text-xs font-bold text-[#8E44AD]" aria-label={`Danno in dadi: ${dice}`}>{dice}</span>}
  </span>;
}

export function MoveEffectsButton({ move, onShow }) {
  return <button type="button" onClick={() => onShow(move)}
    aria-label={`Leggi effetti di ${move.name}`} className="inline-flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-lato text-[#2C3E50] rounded-md border border-gray-200 hover:border-[#D4AF37] hover:bg-[#FFFCF3] shrink-0">
    <Info className="w-4 h-4" aria-hidden="true" /> Effetti
  </button>;
}
