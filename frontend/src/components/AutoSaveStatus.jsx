import { Check, Cloud, Loader2 } from "lucide-react";

export default function AutoSaveStatus({ state, className = "", testId }) {
  const failed = state.phase === "error" || state.phase === "invalid";
  const text = failed ? state.error : state.phase === "saving" ? "Salvataggio in corso..."
    : state.phase === "pending" ? "Modifiche in attesa..."
    : state.phase === "saved" ? "Salvato automaticamente" : "Salvataggio automatico";
  return <div data-testid={testId} className={`flex flex-wrap items-center gap-2 text-xs font-lato ${failed ? "text-red-600" : "text-gray-500"} ${className}`}>
    <span role="status" aria-live="polite" className="flex items-center gap-2">
      {state.phase === "saving" ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
        : state.phase === "saved" ? <Check className="w-4 h-4 shrink-0 text-green-600" /> : <Cloud className="w-4 h-4 shrink-0" />}
      {text}
    </span>
    {state.phase === "error" && <button type="button" onClick={state.retry} className="px-2 underline">Riprova</button>}
  </div>;
}
