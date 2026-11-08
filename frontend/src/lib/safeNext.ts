/**
 * Where to go after logging in, from the `next` query param. Only paths on this site are
 * allowed, so a crafted link can't send someone to another origin. Anything else goes home.
 */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/')) return '/';
  try {
    const url = new URL(next, window.location.origin);
    // Dot segments can normalise to a pathname like //evil.com, which is off-site once navigated.
    if (url.origin !== window.location.origin || url.pathname.startsWith('//')) return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
