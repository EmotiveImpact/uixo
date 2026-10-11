/**
 * Fields the registry's search adds to its response (HTTP `?action=search` and MCP
 * `search_assets`) for forgiving search (L-8). Both are additive: older clients ignore them.
 *
 * Search first matches every term as typed, with synonyms ("modal" also finds "dialog") and
 * singulars. When that finds nothing it corrects words that appear nowhere to the closest
 * asset-name or category word (edit distance up to 2), then, for three or more terms, accepts
 * assets that match some of the terms, ranked by how many and how well they match.
 */

/** Present only when the results are for a corrected spelling. */
export type SearchCorrection = {
  /** The corrected query the results are for. Show "Showing results for {query}". */
  query: string;
  /** The query as searched (lower-cased). Offer "Search for {original} instead" with `exact=true`. */
  original: string;
  /** Each word that was corrected. */
  changes: { from: string; to: string }[];
};

/**
 * `all-terms`: every term matched (the normal case). `any-term`: nothing matched every term,
 * so results match some of three or more terms, best first.
 */
export type SearchMatch = 'all-terms' | 'any-term';
