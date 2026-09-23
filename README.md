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
| `npm run test:deployed`| Checks a real deployment: `DEPLOY_KIND=preview\|production DEPLOY_URL=https://… npm run test:deployed`. |
| `npm run capture`      | Screenshots a site at phone, tablet and desktop size for its project card (see below).          |

## Adding a project

1. Copy `src/data/cards/_template.project.ts` to a new file named after its
   position, e.g. `src/data/cards/20-panaderia-rosa.ts`. The number in the
   file name must equal `order` inside it (gaps of 10 leave room to insert).
2. Fill every `TODO`. Write outcomes the owner would say to a friend
   ("Ahora toma órdenes por internet"), never tech words.
3. Take the screenshots of the new site:
   `npm run capture -- https://their-site.com <slug>`
   It saves `phone.webp`, `tablet.webp` and `desktop.webp` in
   `src/assets/media/<slug>/`; `phone.webp` is the card's "after" picture.
   Add `--click "Aceptar"` to get past a welcome screen or cookie banner,
   and `--wait 4000` for slow pages. (First time only:
   `npx playwright install chromium`.)
   If they had an old site, add its screenshot as the "before" — **same size**
   as the "after". If they had none, leave `before` out and say what they
   had in `note` ("Antes solo tenía Instagram"). An owner photo only with
   their permission. Any video goes in `public/media/<slug>/` (WebM + MP4,
   under 2 MB each).
4. Check framing before choosing a live demo:
   `curl -sI https://their-site.com | grep -iE '^x-frame-options|frame-ancestors'`
   Any output → the site can't be shown live; use `mode: 'screenshots'` with
   the three captures from step 3.
5. `npm run dev` and look at it on your phone.

There is nothing to register: every file in `src/data/cards/` is in the feed.
If you make a mistake — a duplicate slug, a link to a card that does not
exist, an `http://` link, before/after shots of different sizes — the build
says exactly what and where.

## Before launch

`npm run check:launch` prints the list. Today it is:

- the real domain (`src/data/site.ts` → `url`);
- the real WhatsApp and phone number (`src/data/site.ts` → `contact`);
- the price after the first year (`src/data/cards/30-precios.ts` → `afterFirstYear`);
- the media: your portrait, the share image, and the intro video with its
  poster and its captions (`public/media/intro/saludo.es.vtt` and `.en.vtt`,
  timed to the real recording).

Also worth doing:

- Use an email on your own domain instead of a personal Gmail address — it
  is published on the site (and this repository is public).
- One or two more projects: the feed is strongest with 8–12 cards.
- "Qué incluye, en cristiano" — keep it if it sounds like you; "sin enredos"
  is an alternative.

## Test on a real phone

The browser tests prove a lot, but not how swiping feels under a finger or
what a real browser toolbar does. Before launch, and after any change to the
feed, open the preview on an **iPhone (Safari)** and an **Android phone
(Chrome)** and check:

- [ ] A short swipe, a slow drag released halfway, and a fast flick: every
      time, the feed comes to rest with one whole card on screen — never two
      halves.
- [ ] Swipe down and back up; swipe and change direction before letting go.
- [ ] Start a swipe on the before/after picture: up/down moves the feed,
      sideways moves the slider.
- [ ] Switch tabs, then swipe.
- [ ] Turn the phone sideways and back: the same card stays on screen.
- [ ] Pull the page down at the top and up at the bottom: the browser's
      toolbar and the bar at the top stay put, and the card stays whole.
- [ ] With the phone's text size set large: a card whose text doesn't fit
      scrolls inside itself, you can reach its last button, and keep swiping
      to the next card (and back).
- [ ] At normal text size, no card scrolls inside itself: a flick on any card
      moves to the next one. (The tests check every size from 640px tall and
      360–430px wide. Below 640 — an iPhone SE with Safari's bars showing is
      about 375×548 — the pricing card still scrolls inside itself: a known
      limit.)
- [ ] Open "Qué incluye" on a plan, close it, and keep swiping.

## Deploying to Cloudflare

Why Cloudflare rather than Vercel: Vercel's free plan is for non-commercial
use only, and a site that advertises your services is commercial — it would
need the paid plan. Cloudflare's free plan allows it, serves from a location
in San Juan, and reads the security headers this build generates.

GitHub Actions does the deploying (`.github/workflows/ci.yml`), to two
separate Workers so a preview can never replace the real site:

- **Repository pull requests and pushes to `main`** → the draft build (placeholders allowed, hidden from
  search engines) goes to the `portfolio-preview` Worker. Its address is in
  the job's summary, and the job then checks the live preview. This is a public
  preview URL; `noindex` is not access control. Fork pull requests run tests only.
  Actions → CI → Run workflow on `main` can refresh the preview without a code change.
- **Every push to `main`** → the strict build goes to the `portfolio` Worker,
  on its workers.dev address or your domain. The strict build refuses to exist while anything is fake or
  missing, so until the "Before launch" list is done this job fails on
  purpose and nothing is deployed — the log lists what is left. After a
  deploy it checks the real domain (pages, contact links, share images,
  media, demos, the video playing) and measures loading speed: 3 runs on a
  simulated phone, median largest paint under 2 seconds (`lighthouserc.json`).

One-time setup:

1. **Cloudflare API token.** Cloudflare dashboard → My Profile → API Tokens →
   Create Token → template "Edit Cloudflare Workers". Also copy your Account
   ID (Workers & Pages overview, right column).
2. **GitHub secrets.** This repository → Settings → Secrets and variables →
   Actions → New repository secret: `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`.
3. **Turn off Cloudflare's own builds.** Workers & Pages → `portfolio` →
   Settings → Build → Disconnect. Until you do, Cloudflare keeps deploying
   every push itself — including the draft to the real site.
4. **Keep production offline until launch.** On `portfolio`, leave its
   workers.dev address disabled and do not attach a custom domain while an
   old draft is deployed. Keep the Worker; there is no need to delete it.
   Only a successful strict production deployment re-enables its address.
5. **Choose the launch address.** A paid domain is optional. You can use
   `https://portfolio.elnenealexis72.workers.dev` as `src/data/site.ts` → `url`.
   If you later choose a custom domain, attach it to `portfolio` under
   Domains & Routes and update the same content setting.

There is only one deployment workflow: `.github/workflows/ci.yml`. Do not
reintroduce `deploy.yml` or reconnect Cloudflare Git builds. Wrangler is pinned
in `package-lock.json`; local checks and Actions use the same installed version.

During setup, a red **production** job listing missing launch content is expected.
The **verify** and **preview** jobs must pass independently. Inspect their logs
before changing tokens or reconnecting Cloudflare. Never put API token values in
the repository or a chat message.

To check a deployment by hand, for example a preview:
`DEPLOY_KIND=preview DEPLOY_URL=https://portfolio-preview.<account>.workers.dev npm run test:deployed`.

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
