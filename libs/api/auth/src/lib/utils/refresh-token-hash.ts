import { createHash } from 'node:crypto';

// bcrypt only considers 72 bytes; JWTs are longer and share a common prefix.
export function refreshTokenDigest(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
