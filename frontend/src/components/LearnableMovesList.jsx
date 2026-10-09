import { MoveEffectsButton, MovePower, MoveType } from "./MoveInfo";
import { getDamageClassLabel } from "../lib/moves";

const grid = "grid grid-cols-2 md:grid-cols-[3rem_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_3.5rem_5rem] gap-3";

export default function LearnableMovesList({ moves, mode, onShowEffects }) {
  return <div className="space-y-2">
    <div className={`hidden md:grid ${grid} px-3 py-2 rounded-lg font-courier text-xs text-gray-500 ${mode === "tm" ? "bg-[#8E44AD]/10" : "bg-gray-50"}`} aria-hidden="true">
      <div>{mode === "tm" ? "MT" : "LIV."}</div><div>MOSSA</div><div>TIPO</div><div>POT. / DADI</div><div>PREC.</div><div>EFFETTI</div>
    </div>
    {moves.map(move => <div key={move.englishName} data-testid={`${mode}-move-${move.englishName}`} className={`${grid} items-center p-3 rounded-lg border border-gray-100 hover:border-[#D4AF37]`}>
      <div className="col-span-2 md:contents flex items-center gap-3 min-w-0">
        <span className={`inline-flex items-center justify-center w-12 min-h-8 shrink-0 text-white rounded font-courier text-xs font-bold ${mode === "tm" ? "bg-[#8E44AD]" : "bg-[#2C3E50]"}`}>
          {mode === "tm" ? `MT${move.tmNumber || ""}` : `Lv. ${move.level || "—"}`}
        </span>
        <div className="min-w-0"><p className="font-lato text-[#2C3E50] break-words">{move.name}</p><p className="font-courier text-xs text-gray-400">{getDamageClassLabel(move.damageClass)}</p></div>
      </div>
      <MoveType type={move.type} />
      <div><span className="block md:hidden text-[10px] text-gray-400 mb-1">Potenza / Dadi</span><MovePower power={move.power} /></div>
      <div className="font-courier text-sm text-gray-500"><span className="md:hidden text-xs">Prec. </span>{move.accuracy != null ? `${move.accuracy}%` : "—"}</div>
      <MoveEffectsButton move={move} onShow={onShowEffects} />
    </div>)}
  </div>;
}
