import { GLOSSARY_TERMS } from "./glossaryData";

export function glossarySlug(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const ACCENTS = {
  a: "aàáâäãå", c: "cç", e: "eèéêë", i: "iìíîï", n: "nñ",
  o: "oòóôöõ", u: "uùúûü", y: "yÿ",
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexibleTermPattern(value) {
  const pieces = Array.from(value).map((character) => {
    if (/\s/.test(character)) return "\\s+";
    if (character === "-" || character === "–" || character === "—") return "[-–—]";
    const base = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const options = ACCENTS[base];
    if (options) return `[${options}]`;
    return escapeRegex(character);
  });
  return pieces.join("");
}

const MATCHERS = GLOSSARY_TERMS
  .flatMap((entry) => [entry.term, ...(entry.aliases || [])].map((phrase) => ({ entry, phrase })))
  .sort((a, b) => b.phrase.length - a.phrase.length)
  .map(({ entry, phrase }) => ({
    entry,
    regex: new RegExp(`(^|[^\\p{L}\\p{N}])(${flexibleTermPattern(phrase)})(?=$|[^\\p{L}\\p{N}])`, "giu"),
  }));

// Returns plain string pieces and { text, term } link candidates, preferring the
// longest matching term when two glossary phrases overlap.
export function getGlossaryParts(text = "") {
  if (!text) return [];
  const matches = [];
  for (const matcher of MATCHERS) {
    matcher.regex.lastIndex = 0;
    for (const match of text.matchAll(matcher.regex)) {
      const start = match.index + match[1].length;
      matches.push({ start, end: start + match[2].length, text: match[2], term: matcher.entry });
    }
  }
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const parts = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) parts.push(text.slice(cursor, match.start));
    parts.push({ text: match.text, term: match.term });
    cursor = match.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length ? parts : [text];
}
