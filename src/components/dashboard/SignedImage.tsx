import { useSignedUrl } from "@/hooks/useSignedUrl";

interface Props {
  bucket: string;
  storedValue: string | null | undefined;
  alt: string;
  className?: string;
  onClick?: () => void;
  fallback?: React.ReactNode;
}

/**
 * Renders an <img> whose src is a fresh, short-lived signed URL derived
 * from either a bare storage path or a legacy full URL.
 */
export function SignedImage({ bucket, storedValue, alt, className, onClick, fallback = null }: Props) {
  const { url, loading } = useSignedUrl(bucket, storedValue);
  if (!storedValue || (!url && !loading)) return <>{fallback}</>;
  if (loading || !url) {
    return <div className={`${className ?? ""} bg-muted animate-pulse`} aria-label="Loading image" />;
  }
  return <img src={url} alt={alt} className={className} onClick={onClick} />;
}
