const DEFAULT_TTL_MS = 15 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const travelCache = new Map<string, CacheEntry<unknown>>();

export function travelCacheKey(namespace: string, params: Record<string, string | number | boolean | null | undefined>) {
  const stableParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return `${namespace}:${JSON.stringify(stableParams)}`;
}

export function getTravelCache<T>(key: string): T | null {
  const entry = travelCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    travelCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setTravelCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  travelCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
