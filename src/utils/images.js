const SUPABASE_PUBLIC_PATH = '/storage/v1/object/public/';
const SUPABASE_RENDER_PATH = '/storage/v1/render/image/public/';

export function getOptimizedImageUrl(url, { width, height, quality } = {}) {
  if (!url || typeof url !== 'string') return url;

  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    return url;
  }

  const base = `${parsed.origin}${parsed.pathname}`;
  const isPublic = base.includes(SUPABASE_PUBLIC_PATH);
  const isRender = base.includes(SUPABASE_RENDER_PATH);
  if (!isPublic && !isRender) return url;

  const renderBase = isRender
    ? base
    : base.replace(SUPABASE_PUBLIC_PATH, SUPABASE_RENDER_PATH);

  const params = new URLSearchParams(parsed.search);
  if (width) params.set('width', String(width));
  if (height) params.set('height', String(height));
  if (quality) params.set('quality', String(quality));

  const query = params.toString();
  return query ? `${renderBase}?${query}` : renderBase;
}
