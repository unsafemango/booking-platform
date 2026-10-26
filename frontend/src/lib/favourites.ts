const FAVOURITES_KEY = 'booking.favourites';

/** Ids of the products favourited in this browser; empty when storage is unavailable. */
export function loadFavourites(): string[] {
  try {
    const stored = localStorage.getItem(FAVOURITES_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Adds the product if it isn't a favourite yet, removes it otherwise, and returns the new list. */
export function toggleFavourite(id: string): string[] {
  const current = loadFavourites();
  const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id];
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable; the choice just won't survive a reload
  }
  return next;
}
