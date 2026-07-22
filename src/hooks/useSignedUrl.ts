import { useEffect, useState } from "react";
import { getSignedUrlFromStoredValue } from "@/lib/storageUrls";

/**
 * React hook that resolves a bucket + stored value (path OR legacy full URL)
 * into a freshly signed URL, using a shared in-memory cache so list views
 * don't re-sign the same path per render.
 */
export function useSignedUrl(bucket: string, storedValue: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!storedValue);

  useEffect(() => {
    let cancelled = false;
    if (!storedValue) {
      setUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSignedUrlFromStoredValue(bucket, storedValue).then((u) => {
      if (cancelled) return;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, storedValue]);

  return { url, loading };
}
