import { COMPONENT_CATEGORIES } from '../shared/component-categories.ts';

/** Words a misspelling may be corrected to, and the text that tells a known word from a typo. */
export type Vocabulary = {
  /** Every published asset's search text, joined: a word found here is not a typo. */
  corpus: string;
  /** Words from asset names and category names, with how many names use each. */
  words: Map<string, number>;
};

export function buildVocabulary(rows: { name: string; searchText: string }[]): Vocabulary {
  const words = new Map<string, number>();
  const add = (text: string) => {
    for (const word of new Set(text.toLowerCase().split(/[^a-z0-9]+/)))
      if (word.length >= 3 && !/^\d+$/.test(word)) words.set(word, (words.get(word) ?? 0) + 1);
  };
  for (const row of rows) add(row.name);
  for (const category of COMPONENT_CATEGORIES) add(`${category.id} ${category.label}`);
  return { corpus: rows.map((row) => row.searchText).join('\n'), words };
}

/**
 * Optimal string alignment distance (Levenshtein plus adjacent transpositions), giving up
 * once every path exceeds `max`.
 */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        value = Math.min(value, before[j - 2] + 1);
      current.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    before = previous;
    previous = current;
  }
  return previous[b.length];
}

/**
 * The closest name or category word to a word nothing contains, within edit distance 1 for
 * four letters and 2 from five. Null when the word is known, too short or has no close match.
 */
export function correctWord(word: string, vocabulary: Vocabulary): string | null {
  if (word.length < 4 || !/^[a-z]+$/.test(word) || vocabulary.corpus.includes(word)) return null;
  const max = word.length === 4 ? 1 : 2;
  // Closest first; then a word with the same first letter, which people rarely mistype
  // ("tabel" is "table", not "label"); then the word more names use; then A to Z.
  const rank = (candidate: string, uses: number) =>
    [editDistance(word, candidate, max), candidate[0] === word[0] ? 0 : 1, -uses] as const;
  let best: { word: string; rank: readonly number[] } | null = null;
  for (const [candidate, uses] of vocabulary.words) {
    const next = rank(candidate, uses);
    if (next[0] > max) continue;
    const order = best ? next.findIndex((value, index) => value !== best!.rank[index]) : 0;
    if (!best || (order === -1 ? candidate < best.word : next[order] < best.rank[order]))
      best = { word: candidate, rank: next };
  }
  return best?.word ?? null;
}
