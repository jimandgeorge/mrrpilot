// In-memory per-user rate limiter. Each endpoint gets its own bucket.
const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();

export function checkRateLimit(
  endpoint: string,
  userId: string,
  max: number,
  windowMs: number,
): boolean {
  if (!stores.has(endpoint)) stores.set(endpoint, new Map());
  const store = stores.get(endpoint)!;

  const now = Date.now();
  const entry = store.get(userId);
  if (!entry || now > entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
