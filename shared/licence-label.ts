/**
 * The one price-and-licence label (L-1), shared by the site and the registry's MCP results so
 * they cannot drift. "Free" is shown only when commercial use is allowed; a free listing whose
 * commercial use is unknown is "Licence unknown", and a restricted one shows its declared
 * licence. The records themselves are not changed.
 */
export type LicenceLabelInput = {
  price: string;
  licence: { commercial: string; expression: string };
};

export const LICENCE_UNKNOWN = 'Licence unknown';

export function licenceLabel(asset: LicenceLabelInput): string {
  if (asset.price === 'paid') return 'Paid';
  const { commercial, expression } = asset.licence;
  if (commercial === 'allowed')
    return asset.price === 'free' ? 'Free' : expression.trim() || LICENCE_UNKNOWN;
  if (commercial === 'restricted') return expression.trim() || LICENCE_UNKNOWN;
  return LICENCE_UNKNOWN;
}
