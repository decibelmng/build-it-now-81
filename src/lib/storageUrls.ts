import { supabase } from "@/integrations/supabase/client";

// In-memory cache of signed URLs, keyed by `${bucket}::${path}`.
// Expiry tracked locally so we can re-sign safely before Supabase's TTL.
type Entry = { url: string; expiresAt: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<string | null>>();

const TTL_SECONDS = 3600; // sign for 1 hour
const REFRESH_BEFORE_MS = 60_000; // re-sign if <60s left

/**
 * Extract a storage path from either a raw path (`user_id/foo.jpg`)
 * or a legacy full URL that embedded the bucket, e.g.
 * `.../object/sign/maintenance-photos/<path>?token=...`
 * or `.../object/public/maintenance-photos/<path>`.
 */
export function extractStoragePath(value: string, bucket: string): string | null {
  if (!value) return null;
  const marker = `/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx >= 0) {
    const rest = value.slice(idx + marker.length);
    const q = rest.indexOf("?");
    return q >= 0 ? rest.slice(0, q) : rest;
  }
  // Assume it's already a bare path
  if (value.startsWith("http")) return null;
  return value;
}

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  if (!path) return null;
  const key = `${bucket}::${path}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt - now > REFRESH_BEFORE_MS) {
    return cached.url;
  }
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = (async () => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    cache.set(key, { url: data.signedUrl, expiresAt: now + TTL_SECONDS * 1000 });
    return data.signedUrl;
  })();
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/**
 * Accepts a stored value that may be a legacy full URL or a bare path
 * and returns a freshly signed URL for the given bucket.
 */
export async function getSignedUrlFromStoredValue(
  bucket: string,
  storedValue: string | null | undefined
): Promise<string | null> {
  if (!storedValue) return null;
  const path = extractStoragePath(storedValue, bucket);
  if (!path) return null;
  return getSignedUrl(bucket, path);
}
