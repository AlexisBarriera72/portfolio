import type { APIRoute } from 'astro';
import { cardPages, draftGaps } from '../data';
import { resolveImage } from '../data/media';
import { shareImagePath } from '../lib/seo';

/**
 * /draft-missing.json — only in draft builds (a production build emits no
 * page at all here). Lists exactly what the draft is allowed to be missing,
 * so the browser tests and the checks against a preview deployment can fail
 * on anything else.
 */
export function getStaticPaths() {
  return import.meta.env.MODE === 'draft' ? [{ params: { manifest: 'draft-missing' } }] : [];
}

export const GET: APIRoute = () =>
  Response.json({
    ...draftGaps(),
    // Pages whose share picture isn't added yet: they go out without og:image.
    noShareImage: cardPages()
      .filter(({ card }) => !resolveImage(shareImagePath(card)))
      .map(({ path }) => path)
      .sort(),
  });
