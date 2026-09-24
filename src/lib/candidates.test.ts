import { describe, expect, it } from 'vitest';
import {
  accessToPricing,
  candidateListings,
  candidateSourceHref,
  importCandidates,
  normaliseUrl,
  toCandidateListings,
  toResource,
  toResourceRows,
} from './candidates';
import type { Candidate } from './candidates';
import scoutFile from '../../data/uixo-candidates.json';
import { resources } from '../data';
import { filterResources } from './filters';

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  id: 'thing',
  name: 'Thing',
  category: 'Icons',
  subcategory: 'Outline',
  tags: ['SVG'],
  access: ['Free'],
  creator: 'Someone',
  formats: ['SVG'],
  url: 'https://thing.dev',
  why: 'a reason',
  ...over,
});

describe('normaliseUrl', () => {
  it('treats the same link written differently as one link', () => {
    const forms = [
      'https://Thing.dev/',
      'http://www.thing.dev',
      'thing.dev',
      '  https://www.thing.dev//  ',
    ];
    expect(new Set(forms.map(normaliseUrl)).size).toBe(1);
  });

  it('does not collapse different paths', () => {
    expect(normaliseUrl('https://a.dev/one')).not.toBe(normaliseUrl('https://a.dev/two'));
  });
});

describe('accessToPricing', () => {
  it("maps the scout vocabulary onto the site's tiers", () => {
    expect(accessToPricing(['Free'])).toBe('Free');
    expect(accessToPricing(['Paid'])).toBe('Paid');
    expect(accessToPricing(['Free', 'Paid'])).toBe('Freemium');
    expect(accessToPricing(['Paid', 'Free'])).toBe('Freemium');
    expect(accessToPricing(['Free', 'Open source'])).toBe('Free');
    expect(accessToPricing(['Open source'])).toBe('Free');
  });

  it('returns null rather than guessing at nonsense', () => {
    expect(accessToPricing([])).toBeNull();
    expect(accessToPricing(undefined)).toBeNull();
    expect(accessToPricing(['Donation'])).toBeNull();
  });
});

describe('importCandidates', () => {
  it('drops anything already live, by url or by id', () => {
    const live = resources[0];
    const result = importCandidates({
      items: [
        candidate({ id: 'a', url: `HTTPS://WWW.${live.url.replace(/^https?:\/\//, '')}` }),
        candidate({ id: live.id, url: 'https://unrelated.dev' }),
        candidate({ id: 'keep', url: 'https://keep.dev' }),
      ],
    });

    expect(result.accepted.map((entry) => entry.id)).toEqual(['keep']);
    expect(result.duplicates).toHaveLength(2);
  });

  it('drops repeats inside the file, keeping the first', () => {
    const result = importCandidates({
      items: [
        candidate({ id: 'one', url: 'https://same.dev' }),
        candidate({ id: 'two', url: 'https://www.same.dev/' }),
      ],
    });
    expect(result.accepted.map((entry) => entry.id)).toEqual(['one']);
    expect(result.duplicates[0].message).toMatch(/Repeated/);
  });

  it('flags a subcategory that does not belong to its category', () => {
    const result = importCandidates({
      items: [candidate({ category: 'Icons', subcategory: 'Webflow' })],
    });
    expect(result.accepted).toHaveLength(1);
    expect(result.problems[0].field).toBe('subcategory');
  });

  it('flags unmappable access and a missing reason, without discarding the item', () => {
    const result = importCandidates({
      items: [candidate({ access: ['Donation'], why: '  ' })],
    });
    expect(result.accepted).toHaveLength(1);
    expect(result.problems.map((p) => p.field).sort()).toEqual(['access', 'why']);
  });

  it('skips rows with no id or url instead of throwing', () => {
    const result = importCandidates({ items: [{ name: 'x' } as Candidate] });
    expect(result.accepted).toHaveLength(0);
    expect(result.duplicates).toHaveLength(1);
  });
});

describe('the real scout file', () => {
  const result = importCandidates(scoutFile);

  it('accounts for every row: each one is either accepted or dropped with a reason', () => {
    expect(result.accepted.length + result.duplicates.length).toBe(scoutFile.items.length);
    for (const dropped of result.duplicates) expect(dropped.message).toBeTruthy();
  });

  /**
   * Deliberately not asserting the file is clean. The scout invents subcategories as it
   * finds things — "Awards", "Galleries", "Tools" — and that is fine: the queue exists to
   * let a human map them onto the real taxonomy. What must hold is that a flagged row is
   * still reviewable rather than silently dropped.
   */
  it('keeps off-taxonomy rows in the queue rather than discarding them', () => {
    const flagged = new Set(result.problems.map((problem) => problem.id));
    const accepted = new Set(result.accepted.map((item) => item.id));
    for (const id of flagged) expect(accepted.has(id)).toBe(true);
  });

  it('flags every problem against a real field the reviewer can fix', () => {
    for (const problem of result.problems) {
      expect(['category', 'subcategory', 'access', 'why']).toContain(problem.field);
    }
  });
});

describe('toResource', () => {
  it('produces a row that matches the live schema', () => {
    const row = toResource({ ...candidate(), description: 'A real sentence.' }, 8, '2026-09-11');
    expect(row).toMatchObject({
      id: 'thing',
      description: 'A real sentence.',
      pricing: 'Free',
      addedOrder: 8,
      featured: false,
      lastChecked: '2026-09-11',
      aliases: [],
    });
  });

  it('falls back to the scout note when the reviewer wrote nothing', () => {
    expect(toResource(candidate(), 8, '2026-09-11')?.description).toBe('a reason');
  });

  it('falls back to the name when no creator is given', () => {
    expect(toResource(candidate({ creator: '  ' }), 8, '2026-09-11')?.creator).toBe('Thing');
  });

  it('refuses to build a row it cannot price', () => {
    expect(toResource(candidate({ access: ['Donation'] }), 8, '2026-09-11')).toBeNull();
  });
});

describe('toResourceRows', () => {
  it('numbers approved rows after everything already live', () => {
    const liveMax = Math.max(...resources.map((entry) => entry.addedOrder));
    const rows = toResourceRows([candidate({ id: 'a' }), candidate({ id: 'b' })]);
    expect(rows.map((row) => row.addedOrder)).toEqual([liveMax + 1, liveMax + 2]);
  });

  it('leaves out anything that cannot be mapped', () => {
    const rows = toResourceRows([candidate({ id: 'a' }), candidate({ id: 'b', access: [] })]);
    expect(rows.map((row) => row.id)).toEqual(['a']);
  });
});

describe('the scout file against the real taxonomy', () => {
  const items = (scoutFile as { items: Candidate[] }).items;

  it('maps every candidate to a pricing tier', () => {
    const unmappable = items.filter((item) => !accessToPricing(item.access));
    expect(unmappable.map((item) => item.id)).toEqual([]);
  });

  /**
   * The scout re-finds sites we already list, sometimes under a different id — "react-bits"
   * for the live "reactbits". Matching on the normalised url rather than the id is what
   * catches those, and nothing that collides may reach the queue.
   */
  it('lets nothing already live reach the queue, even under a different id', () => {
    const liveUrls = new Set(resources.map((entry) => normaliseUrl(entry.url)));
    const survivors = importCandidates(scoutFile).accepted;
    expect(survivors.filter((item) => liveUrls.has(normaliseUrl(item.url)))).toEqual([]);
  });

  it('catches a re-find whose id differs from the live one', () => {
    const collisions = items.filter((item) =>
      resources.some((live) => normaliseUrl(live.url) === normaliseUrl(item.url)),
    );
    // If the scout ever stops re-finding live sites this can go, but it should not
    // silently pass by asserting the file is clean.
    for (const item of collisions) {
      expect(importCandidates(scoutFile).duplicates.map((d) => d.id)).toContain(item.id);
    }
  });

  it('renumbers cleanly past the live set rather than colliding with it', () => {
    const liveMax = Math.max(...resources.map((entry) => entry.addedOrder));
    const rows = toResourceRows(items);
    expect(rows[0].addedOrder).toBe(liveMax + 1);
    expect(new Set(rows.map((row) => row.addedOrder)).size).toBe(rows.length);
    // The scout numbers from 1, which would have clashed with every live listing.
    expect(Math.min(...items.map((item) => item.addedOrder ?? 0))).toBe(1);
  });
});

describe('the public candidate preview', () => {
  it('keeps every scout row, including ones already live', () => {
    expect(candidateListings).toHaveLength(scoutFile.items.length);
    expect(toCandidateListings(scoutFile)).toHaveLength(scoutFile.items.length);
  });

  it('lets Components be filtered as their own subset', () => {
    const components = candidateListings.filter((entry) => entry.category === 'Components');
    expect(components.length).toBe(scoutFile.counts_by_category.Components);
    expect(components.length).toBeGreaterThan(0);
  });

  it('does not pull tag-only Components into the Components bucket', () => {
    const shown = filterResources(candidateListings, {
      listIds: null,
      category: 'Components',
      sub: null,
      price: 'All',
      format: 'All formats',
      browse: 'Recent',
      search: '',
      exactTaxonomy: true,
    });
    expect(shown).toHaveLength(scoutFile.counts_by_category.Components);
    expect(shown.every((entry) => entry.category === 'Components')).toBe(true);
  });

  it('maps access onto the same pricing chips the directory uses', () => {
    expect(new Set(candidateListings.map((entry) => entry.pricing))).toEqual(
      new Set(['Free', 'Freemium', 'Paid']),
    );
  });

  it('prefers a harvested source post over a bare handle', () => {
    expect(
      candidateSourceHref({
        ...candidate(),
        source: 'UiSavior',
        harvest_posts: ['https://x.com/UiSavior/status/1'],
      }),
    ).toBe('https://x.com/UiSavior/status/1');
  });

  it('turns a lone handle into an X profile when no post was recorded', () => {
    expect(candidateSourceHref(candidate({ source: 'Manixh02' }))).toBe('https://x.com/Manixh02');
  });
});
