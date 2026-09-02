/**
 * Public URL of a social preview image in the `social-images` Storage
 * bucket. The bucket is public-read so Open Graph/Twitter crawlers can
 * fetch images without cookies.
 */
export function socialImageUrl(path: string | null): string | null {
  if (!path) {
    return null
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) {
    return null
  }
  return `${base}/storage/v1/object/public/social-images/${path}`
}
