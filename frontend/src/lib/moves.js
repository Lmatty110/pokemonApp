export const TYPE_LABELS = {
  normal: "Normale", fire: "Fuoco", water: "Acqua", electric: "Elettro",
  grass: "Erba", ice: "Ghiaccio", fighting: "Lotta", poison: "Veleno",
  ground: "Terra", flying: "Volante", psychic: "Psico", bug: "Coleottero",
  rock: "Roccia", ghost: "Spettro", dragon: "Drago", dark: "Buio",
  steel: "Acciaio", fairy: "Folletto", stellar: "Astrale", unknown: "Sconosciuto",
};

export const TYPE_COLORS = {
  normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
  grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
  ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
  rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
  steel: "#B8B8D0", fairy: "#EE99AC", stellar: "#40B5A5",
};

export const getTypeLabel = type => TYPE_LABELS[type] || type || "Sconosciuto";
export const getTypeColor = type => TYPE_COLORS[type] || "#68A090";
export const getDamageClassLabel = value => ({ physical: "Fisico", special: "Speciale", status: "Stato" }[value] || "—");

export function getDamageDice(power) {
  if (!Number.isInteger(power) || power < 1) return null;
  if (power <= 40) return "2d4";
  if (power <= 60) return "3d4";
  if (power <= 80) return "4d4";
  if (power <= 100) return "3d8";
  if (power <= 120) return "4d8";
  if (power <= 140) return "5d8";
  return "6d10";
}

// PokéAPI embeds mechanic links and chance placeholders in its effect text.
export function cleanMoveText(text, chance) {
  return String(text || "")
    .replace(/\$effect_chance/g, Number.isFinite(chance) ? String(chance) : "?")
    .replace(/\[([^\]]+)\]\{[^}]+\}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\n\r\f\s]+/g, " ").trim();
}

const AILMENTS = {
  paralysis: "Paralisi", sleep: "Sonno", freeze: "Congelamento", burn: "Scottatura",
  poison: "Avvelenamento", confusion: "Confusione", infatuation: "Infatuazione",
  trap: "Intrappolamento", nightmare: "Incubo", torment: "Tormento",
  "disable": "Inibizione", "yawn": "Sbadiglio", "heal-block": "Blocco delle cure",
  "no-type-immunity": "Rimozione dell'immunità di tipo", "leech-seed": "Parassitismo",
  embargo: "Divieto di usare strumenti", "perish-song": "Ultimocanto", ingrain: "Radicamento",
  "silence": "Silenzio", "tar-shot": "Ricopertura di catrame",
};
const STATS = { attack: "Attacco", defense: "Difesa", "special-attack": "Attacco speciale",
  "special-defense": "Difesa speciale", speed: "Velocità", accuracy: "Precisione", evasion: "Elusione" };
const chanceLabel = chance => chance > 0 ? ` (${chance}%)` : "";

export function describeMoveEffects(data, versionGroup) {
  const texts = data.flavor_text_entries || [];
  const italian = texts.find(entry => entry.language?.name === "it" && entry.version_group?.name === versionGroup)
    || [...texts].reverse().find(entry => entry.language?.name === "it");
  const effects = data.effect_entries || [];
  const detailed = effects.find(entry => entry.language?.name === "it")
    || effects.find(entry => entry.language?.name === "en");
  const english = [...texts].reverse().find(entry => entry.language?.name === "en");
  const description = italian || detailed || english;
  const text = cleanMoveText(description?.flavor_text || description?.effect || description?.short_effect, data.effect_chance);
  const meta = data.meta;
  const secondary = [];
  if (meta) {
    const ailment = meta.ailment?.name;
    if (ailment && !["none", "unknown"].includes(ailment)) secondary.push(`Stato alterato: ${AILMENTS[ailment] || ailment.replaceAll("-", " ")}${chanceLabel(meta.ailment_chance)}.`);
    if (meta.flinch_chance > 0) secondary.push(`Tentennamento: ${meta.flinch_chance}% di probabilità.`);
    (data.stat_changes || []).forEach(({ stat, change }) => {
      if (change) secondary.push(`${STATS[stat?.name] || stat?.name}: ${change > 0 ? "+" : ""}${change} ${Math.abs(change) === 1 ? "livello" : "livelli"}${chanceLabel(meta.stat_chance)}.`);
    });
    if (meta.drain > 0) secondary.push(`Assorbe PS pari al ${meta.drain}% del danno inflitto.`);
    if (meta.drain < 0) secondary.push(`Contraccolpo: perde PS pari al ${Math.abs(meta.drain)}% del danno inflitto.`);
    if (meta.healing > 0) secondary.push(`Recupera il ${meta.healing}% dei PS massimi.`);
    if (meta.crit_rate > 0) secondary.push(`Probabilità aumentata di brutto colpo (bonus: ${meta.crit_rate}).`);
    if (meta.min_hits != null && meta.max_hits != null) secondary.push(`Colpisce ${meta.min_hits === meta.max_hits ? meta.min_hits : `${meta.min_hits}–${meta.max_hits}`} volte.`);
    if (meta.min_turns != null && meta.max_turns != null) secondary.push(`Durata: ${meta.min_turns === meta.max_turns ? meta.min_turns : `${meta.min_turns}–${meta.max_turns}`} turni.`);
  }
  return {
    text, language: description?.language?.name,
    detailedText: detailed && detailed !== description ? cleanMoveText(detailed.effect || detailed.short_effect, data.effect_chance) : "",
    detailedLanguage: detailed?.language?.name,
    secondary,
    // Missing metadata is not evidence that a move has no secondary effects.
    emptyMessage: meta ? "Nessun effetto aggiuntivo riportato nei dati strutturati. Consulta anche la descrizione."
      : "Dati strutturati sugli effetti aggiuntivi non disponibili. Consulta la descrizione, se presente.",
  };
}
