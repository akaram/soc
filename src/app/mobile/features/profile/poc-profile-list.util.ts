/**
 * Helpers for POC profile lists (family, vehicles, pets) stored in localStorage.
 */

export function makePocId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Load a list and assign stable ids to legacy rows that were saved without an id.
 */
export function loadPocListWithIds<T extends { id?: string }>(
  storageKey: string,
  idPrefix: string
): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as T[]) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    let changed = false;
    const normalized = parsed.map(item => {
      if (item?.id) {
        return item;
      }
      changed = true;
      return { ...item, id: makePocId(idPrefix) };
    });

    if (changed) {
      localStorage.setItem(storageKey, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return [];
  }
}
