/** Builds an unsigned JWT whose exp claim is the given epoch milliseconds. */
export function makeJwt(expiresAtMs: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode({ sub: 'u1', exp: Math.floor(expiresAtMs / 1000) })}.sig`;
}
