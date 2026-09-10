import type { ComponentType } from 'react';

/** How a resource charges. Kept explicit so "free tier" and "has a paid plan" never blur. */
export type Pricing = 'Free' | 'Freemium' | 'Paid';

export type Resource = {
  id: string;
  name: string;
  /** One sentence on what it is and why it earns a place here. */
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  pricing: Pricing;
  creator: string;
  formats: string[];
  /** Alternative spellings and use-case phrases the search box should match. */
  aliases: string[];
  addedOrder: number;
  featured: boolean;
  url: string;
  /** ISO date the link was last verified, surfaced in the quick view. */
  lastChecked: string;
  /**
   * How to frame the thumbnail crop. Most screenshots read best anchored left, but ones
   * whose subject sits in the middle of the page need centring. Defaults to "left".
   */
  framing?: 'left' | 'center';
};

export type Category = {
  name: string;
  /** The icon travels with the category so the two can never fall out of sync. */
  icon: ComponentType<{ className?: string }>;
  sub: string[];
};

/**
 * An editorial collection: a curated set with a point of view, shipped as content and
 * shared by URL. Distinct from a List, which is a visitor's own saved group.
 */
export type Collection = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  resourceIds: string[];
  featured: boolean;
};

/** The one listing the editor is pointing at right now, with the reason in their own voice. */
export type EditorPick = {
  resourceId: string;
  note: string;
  pickedOn: string;
};

/** A user-made group of saved resources. "Favourites" is just the default one. */
export type List = {
  id: string;
  name: string;
  resourceIds: string[];
};

/** Top-level view: the whole directory, or one saved list. */
export type Page = 'all' | 'list';

export type BrowseOrder = 'Featured' | 'Recent';
export type PriceFilter = 'All' | Pricing;
export type ModalName = 'about' | 'submit' | 'signin';

/** Sentinel used by the format <select>; means "don't filter by format". */
export const ALL_FORMATS = 'All formats';

export const PRICE_FILTERS: PriceFilter[] = ['All', 'Free', 'Freemium', 'Paid'];

export const BROWSE_TABS: BrowseOrder[] = ['Featured', 'Recent'];

/** Shown under the browse tabs so the two orderings explain themselves. */
export const BROWSE_CAPTIONS: Record<BrowseOrder, string> = {
  Featured: 'Curated picks — the ones we reach for most.',
  Recent: 'Recently added to UIXO, newest first.',
};

export const DEFAULT_LIST_ID = 'favourites';

export type { User, Role, Session } from './lib/auth';
