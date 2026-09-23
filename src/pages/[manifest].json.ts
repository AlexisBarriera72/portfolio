import type { APIRoute } from 'astro';
import { draftGaps } from '../data';

/**
 * /draft-missing.json — only in draft builds (a production build emits no
 * page at all here). Lists exactly what the draft is allowed to be missing,
 * so the browser tests can fail on anything else.
 */
export function getStaticPaths() {
  return import.meta.env.MODE === 'draft' ? [{ params: { manifest: 'draft-missing' } }] : [];
}

export const GET: APIRoute = () => Response.json(draftGaps());
