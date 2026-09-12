import { createHash, timingSafeEqual } from 'node:crypto';
import { eveChannel } from 'eve/channels/eve';
import type { AuthFn } from 'eve/channels/auth';

const operatorAuth: AuthFn<Request> = async (request) => {
  const expected = process.env.UIXO_EVE_OPERATOR_TOKEN;
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const supplied = header.slice(7);
  if (!expected || expected.length < 32 || supplied.length > 512) return null;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(supplied), digest(expected))) return null;
  return {
    principalId: 'uixo-authorised-operator',
    principalType: 'user',
    authenticator: 'uixo-service-token',
    attributes: {},
  };
};
export default eveChannel({ auth: [operatorAuth] });
