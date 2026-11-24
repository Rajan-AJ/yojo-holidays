/**
 * Turns a media_assets (bucket, storage_path) pair into a public URL.
 *
 * The database never stores full URLs, so moving to another Supabase project,
 * a custom domain or a CDN only changes this file / NEXT_PUBLIC_SUPABASE_URL.
 *
 *   bucket 'media'    -> {SUPABASE_URL}/storage/v1/object/public/media/{path}
 *   bucket 'unsplash' -> development placeholders (supabase/seed.sql only)
 *   bucket 'local'    -> development uploads in public/uploads (no Supabase project yet)
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

export function mediaUrl(bucket: string, path: string): string {
  if (bucket === "unsplash") {
    return `https://images.unsplash.com/${path}?auto=format&fit=crop&w=2000&q=80`;
  }
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  if (bucket === "local") return `/uploads/${encoded}`;
  if (!SUPABASE_URL) {
    // Misconfiguration: render nothing broken in production, warn in development.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[media] NEXT_PUBLIC_SUPABASE_URL is not set; storage images cannot be resolved.");
    }
    return `/storage-unconfigured/${bucket}/${encoded}`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}
