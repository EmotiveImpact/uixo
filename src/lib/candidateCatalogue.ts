import scoutFile from '../../data/uixo-candidates.json';
import { toCandidateListings } from './candidates';
import type { CandidateFile } from './candidates';

/**
 * The staged scout file as browsable listings. Kept in its own module so it is only
 * loaded on `/candidates`: the file is several hundred kilobytes and no other page needs it.
 */
export const candidateFile = scoutFile as CandidateFile;
export const candidateListings = toCandidateListings(candidateFile);
export const candidateFormats = [
  ...new Set(candidateListings.flatMap((entry) => entry.formats)),
].sort();
