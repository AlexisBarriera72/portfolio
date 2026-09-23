import type { APIRoute } from 'astro';
import { site } from '../data/site';

/** A draft build (placeholders still in) must never be indexed. */
export const GET: APIRoute = () => {
  const body =
    import.meta.env.MODE === 'draft'
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap-index.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
