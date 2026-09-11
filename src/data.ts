import {
  Box,
  Image,
  Layers,
  Lightbulb,
  PanelsTopLeft,
  PenTool,
  RectangleVertical,
  Shapes,
  Store,
  Type,
} from 'lucide-react';
import type { ComponentType } from 'react';
import categoryContent from './content/categories.json';
import collectionContent from './content/collections.json';
import pickContent from './content/pick.json';
import resourceContent from './content/resources.json';
import type { Category, Collection, EditorPick, Resource } from './types';

/**
 * Content lives in JSON so it can be edited, generated or validated without touching
 * the app — and so the prerender step can read it outside the bundle.
 */
export const resources = resourceContent as Resource[];

/**
 * Icons are looked up by name rather than paired by array position, so adding a
 * category can never silently render `undefined` as a component.
 */
const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  layers: Layers,
  box: Box,
  'panels-top-left': PanelsTopLeft,
  shapes: Shapes,
  image: Image,
  'pen-tool': PenTool,
  type: Type,
  'rectangle-vertical': RectangleVertical,
  lightbulb: Lightbulb,
  store: Store,
};

export const categories: Category[] = (
  categoryContent as { name: string; icon: string; sub: string[] }[]
).map((entry) => ({
  name: entry.name,
  icon: CATEGORY_ICONS[entry.icon] ?? Layers,
  sub: entry.sub,
}));

/** Derived from the data so it can never drift out of sync with the resources. */
export const formats = [...new Set(resources.flatMap((resource) => resource.formats))].sort();

/** Editorial collections — curated sets, distinct from a visitor's own lists. */
export const collections = collectionContent as Collection[];

/** The current editor's pick. Change the file, not the code. */
export const editorPick = pickContent as EditorPick;

/** CSS object-position for a listing's thumbnail, wherever it is rendered. */
export function thumbnailPosition(id: string): string {
  return resources.find((resource) => resource.id === id)?.framing === 'center'
    ? 'center top'
    : 'left top';
}
