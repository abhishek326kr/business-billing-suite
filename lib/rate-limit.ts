const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

type Entry = {
  count: number;
  expiresAt: number;
};

const store = new Map<string, Entry>();

export function assertRateLimit(key: string) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.expiresAt < now) {
    store.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return;
  }

  if (current.count >= MAX_ATTEMPTS) {
    throw new Error("Too many email requests. Try again in a minute.");
  }

  current.count += 1;
  store.set(key, current);
}
