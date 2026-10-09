import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { MovePower, MoveType } from "./MoveInfo";
import { describeMoveEffects, getDamageDice } from "../lib/moves";
import { getMoveData } from "../lib/moveData";

export default function MoveEffectsDialog({ move, onClose, versionGroup }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const name = move?.englishName;
  useEffect(() => {
    let active = true;
    setResult(null);
    setError(false);
    if (name) getMoveData(name).then(data => { if (active) setResult({ name, data }); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [name, attempt]);
  const data = result && result.name === name ? result.data : null;
  const effects = data ? describeMoveEffects(data, versionGroup) : null;
  return <Dialog open={Boolean(move)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="font-lato" data-testid="move-effects-dialog">
      <DialogHeader>
        <DialogTitle className="font-cinzel pr-8">{move?.name} — Effetti</DialogTitle>
        <DialogDescription>Descrizione ed effetti aggiuntivi della mossa.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center gap-3">
        <MoveType type={data?.type?.name || move?.type} />
        <span className="text-sm text-gray-500">Potenza: <MovePower power={data ? data.power : move?.power} /></span>
      </div>
      {!name || error ? <div role="alert" className="text-sm text-red-600">
        Impossibile caricare gli effetti. Controlla la connessione.
        {name && <button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-2 underline px-2">Riprova</button>}
      </div> : !effects ? <p role="status" className="text-sm text-gray-500">Caricamento effetti...</p> : <>
        <section className="space-y-2">
          <h3 className="font-semibold">Descrizione{effects.language === "en" ? " (inglese)" : ""}</h3>
          <p lang={effects.language} className="text-sm leading-relaxed whitespace-pre-wrap break-words">{effects.text || "Descrizione non disponibile."}</p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">Effetti aggiuntivi</h3>
          {effects.secondary.length ? <ul className="list-disc pl-5 space-y-2 text-sm">{effects.secondary.map(text => <li key={text}>{text}</li>)}</ul>
            : <p className="text-sm text-gray-500">{effects.emptyMessage}</p>}
        </section>
        {effects.detailedText && <details className="text-sm border-t pt-3">
          <summary className="cursor-pointer min-h-11 flex items-center">Descrizione completa{effects.detailedLanguage === "en" ? " (inglese)" : ""}</summary>
          <p lang={effects.detailedLanguage} className="mt-2 leading-relaxed whitespace-pre-wrap break-words">{effects.detailedText}</p>
        </details>}
        {!getDamageDice(data.power) && <p className="text-xs text-gray-500">La mossa non ha una potenza fissa positiva: il valore in dadi non è calcolabile con la tabella.</p>}
        <p className="text-xs text-gray-400">Fonte: PokéAPI. Gli effetti possono variare fra versioni dei giochi.</p>
      </>}
    </DialogContent>
  </Dialog>;
}
