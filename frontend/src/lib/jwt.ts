/**
 * Reads the `exp` claim from a JWT and returns it in epoch milliseconds,
 * or null when the token is not a JWT or has no numeric expiry.
 * The signature is not checked; the gateway does that.
 */
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      exp?: unknown;
    };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}
