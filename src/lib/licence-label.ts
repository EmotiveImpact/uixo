/**
 * One licence-aware price label for every place that shows an asset's price: the card,
 * the detail byline and the price slot anywhere else. "Free" only when the licence allows
 * commercial use, so a card never promises more than its licence does.
 */
export type LicenceLabel = {
  text: string;
  /** False when the reader has to check the licence before using it in paid work. */
  settled: boolean;
  /** A longer sentence for the detail page, when the short label needs one. */
  detail?: string;
};

type Priced = { price: string; licence: { commercial: string } };

export function licenceLabel(asset: Priced): LicenceLabel {
  if (asset.price === 'paid') return { text: 'Paid', settled: true };
  if (asset.licence.commercial === 'allowed') return { text: 'Free', settled: true };
  if (asset.licence.commercial === 'restricted')
    return {
      text: 'Licence restricted',
      settled: false,
      detail:
        'Free to view. The licence limits commercial use, so read it before using this in paid work.',
    };
  return {
    text: 'Licence unknown',
    settled: false,
    detail:
      'Free to view. No licence declared, so check with the creator before using it in paid work.',
  };
}
