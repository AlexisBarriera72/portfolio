# Portafolio — Alexis

A vertical, swipeable portfolio for small businesses in southern Puerto Rico:
one full-screen card per project or message, Spanish first, WhatsApp always
one tap away. Static site built with Astro, TypeScript and Tailwind; hosted on
Cloudflare.

## Commands

| Command                | What it does                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`          | Local site at http://localhost:4321 with live reload.                                            |
| `npm run build`        | **Production build.** Type-checks, runs the tests, and refuses to build while anything is fake. |
| `npm run build:draft`  | Same, but allows placeholders — for previews. Draft builds are marked "noindex".                 |
| `npm run check:launch` | Lists everything that still has to be real before launch.                                        |
| `npm test`             | Unit tests (content rules, links, SEO, security headers).                                        |
| `npm run test:e2e`     | Browser tests on phone and desktop sizes (build first).                                          |

## Adding a project

1. Copy `src/data/cards/_template.project.ts` to a new file named after its
   position, e.g. `src/data/cards/20-panaderia-rosa.ts`. The number in the
   file name must equal `order` inside it (gaps of 10 leave room to insert).
2. Fill every `TODO`. Write outcomes the owner would say to a friend
   ("Ahora toma órdenes por internet"), never tech words.
3. Put the images in `src/assets/media/<slug>/` — the before and after
   screenshots **at the same size** (e.g. two phone screenshots), and the
   owner photo only with their permission. Put any video in
   `public/media/<slug>/` (WebM + MP4, under 2 MB each).
4. Check framing before choosing a live demo:
   `curl -sI https://their-site.com | grep -iE '^x-frame-options|frame-ancestors'`
   Any output → use `mode: 'recorded'` with a short screen recording.
5. `npm run dev` and look at it on your phone.

There is nothing to register: every file in `src/data/cards/` is in the feed.
If you make a mistake — a duplicate slug, a link to a card that does not
exist, an `http://` link, before/after shots of different sizes — the build
says exactly what and where.

## Before launch

`npm run check:launch` prints the list. Today it is:

- the real domain (`src/data/site.ts` → `url`);
- the real WhatsApp and phone number (`src/data/site.ts` → `contact`);
- El Break's real web address (`src/data/cards/10-el-break.ts` → `liveUrl`);
- the price after the first year (`src/data/cards/30-precios.ts` → `afterFirstYear`);
- the media: your portrait, the share image, the intro video and its poster,
  and El Break's before/after screenshots.

Also worth doing:

- Use an email on your own domain instead of a personal Gmail address — it
  is published on the site (and this repository is public).
- Two or three more projects: the feed is strongest with 8–12 cards, and the
  "Local" tab currently has one.
- "Qué incluye, en cristiano" — keep it if it sounds like you; "sin enredos"
  is an alternative.

## Deploying to Cloudflare

Why Cloudflare rather than Vercel: Vercel's free plan is for non-commercial
use only, and a site that advertises your services is commercial — it would
need the paid plan. Cloudflare's free plan allows it, serves from a location
in San Juan, and reads the security headers this build generates.

One-time setup:

1. In the Cloudflare dashboard: **Workers & Pages → Create → Import a
   repository**, and pick this GitHub repository.
2. Build command: `npm run build` — deploy command: `npx wrangler deploy`
   (the settings live in `wrangler.jsonc`).
   Until the launch checklist is done, use `npm run build:draft` instead so
   you can see a preview; switch to `npm run build` for the real launch.
3. **Settings → Domains & Routes → Add → Custom domain** with your domain
   (it has to use Cloudflare for its DNS). Put the same domain in
   `src/data/site.ts`.

After that, every push to `main` deploys. To test a deployment with the
browser tests: `E2E_BASE_URL=https://your-preview-url npm run test:e2e`.

## How it is put together

- `src/data/` — all content: `site.ts` (you, contact, service area),
  `cards/*.ts` (one file per card), `types.ts` (what a card must contain) and
  `validate.ts` (the rules the build enforces).
- `src/i18n/` — interface text in Spanish and English. Content text lives
  with the content, always in both languages.
- `src/components/`, `src/layouts/`, `src/pages/` — the HTML. Every card has
  its own page (`/el-break/`, `/en/el-break/`) so a link shared on WhatsApp
  previews that card.
- `src/scripts/` — the small amount of JavaScript: which card is on screen,
  tabs, keyboard, video, the before/after slider and the demo window.
- `src/integrations/security-headers.ts` — writes `dist/_headers` (strict
  Content-Security-Policy and caching) after each build.
