/**
 * iTunes lookup returns downscaled screenshot thumbs (often 392×696). The
 * last path segment is the requested size, so swapping it for a 3× frame
 * gives the resolution the listing actually needs.
 */
export function hiResStoreImage(url: string): string {
  if (!url || !/mzstatic\.com/i.test(url)) return url;

  return url
    .replace(/\/(\d+)x(\d+)([a-z]*)(\.[a-z]+)(\?.*)?$/i, (match, w, h, flags, ext, query = '') => {
      const width = Number(w);
      const height = Number(h);
      if (!width || !height || width >= 1242) return match;
      const scale = 1242 / width;
      return `/${Math.round(width * scale)}x${Math.round(height * scale)}${flags}${ext}${query}`;
    })
    .replace(/\/(\d+)x0w(\.[a-z]+)(\?.*)?$/i, (match, w, ext, query = '') => {
      if (Number(w) >= 1242) return match;
      return `/1242x0w${ext}${query}`;
    });
}

export function hiResStoreImages(urls: string[]): string[] {
  return urls.map(hiResStoreImage);
}
