# Reactive Dog Tracker

A calm, supportive app for tracking a reactive dog's walks, reactions and wins.
Runs on **iOS, Android and the web** from one Expo / React Native codebase.
All data stays **on the device** — no account, no server, no cloud.

## Features

- **Dog profiles** — each dog has its own isolated triggers, schedules, walks and history.
- **Breed portraits** — type any breed, mix or typo ("husky x lab", "labradore",
  "Romanian street dog") and get a drawn cartoon portrait with coat options.
- **Walk calendar** — week strip / month grid; walks come from **daily or weekly
  schedules** or one-off entries; skip or edit any single occurrence.
- **Markers** on walks:
  - *Reaction* with intensity 1–10 (1 = stiff & unresponsive, 10 = lots of barking/growling)
  - *Success* — noticed a trigger and looked away / checked in / sniffed / did something else
- **Triggers** — your dog's own list, with suggestions; removed triggers with history are archived.
- **Progress** — week / month / year, per trigger or all, measured as walks with a
  reaction, intensity sum or average intensity; successes alone or together with reactions;
  stat tiles vs. the previous period, a table view and a per-trigger breakdown.
- **Supportive voice** — gentle messages after every log, data-backed insights that
  celebrate progress and never blame the dog (or you).
- **Messages from your dog** — first-person notes in your dog's voice on the home screen, after
  every logged moment and on the profile: the words the dog can't say. Every message points to a
  researched **"why" fact** (`src/domain/whyFacts.ts`): 26 facts on how a reactive dog feels and what
  helps, each with sources (AVSAB, ASPCA, Dogs Trust, Best Friends, VCA, Merck Veterinary Manual and
  peer-reviewed studies). "Why?" shows the fact and links to its sources.
- **Trend-aware home screen** — the greeting and the dog's message follow the latest trend:
  the last 14 days vs the 14 before (more / fewer successes and reactions, softer / stronger
  intensity), plus recovery after a big reaction, trigger stacking, a first-ever success and rest
  days. See `src/domain/recentTrend.ts` and `src/domain/dogVoice.ts`.
- **Backup** — export / restore a JSON file (share sheet on phones, download on web).

## Run it

```bash
npm install
npm run web        # browser
npm run android    # Android emulator / device (Expo Go or dev build)
npm run ios        # iOS simulator (macOS) or Expo Go
npm test           # unit tests (domain logic + breed matching)
npm run typecheck
npx eslint src
```

## Install on iPhone as a web app (free, no expiry)

The app can be installed from Safari to the home screen. It then opens full-screen like a normal
app, works offline, and stays until you delete it. Data is stored only on the phone — the host
only serves the app's files.

### Option A: GitHub Pages (automatic)

`.github/workflows/deploy-web.yml` builds and publishes the app on every push to `main`.

1. Create a repository on GitHub and push this project to its `main` branch.
2. In the repository: **Settings → Pages → Source: GitHub Actions**.
3. Push (or run the workflow from the **Actions** tab). The app appears at
   `https://<your-user>.github.io/<repo>/`.

On a free GitHub plan, Pages requires the repository to be **public** (the code is public; your
dog data is not — it never leaves the phone).

### Option B: any static host

`npm run build:web` creates `./dist`; upload it to e.g. Netlify (drag & drop at
<https://app.netlify.com/drop>) or Cloudflare Pages (`npx wrangler pages deploy dist`).
For a sub-path, build with `WEB_BASE_URL=/<path> npm run build:web`.

### On the iPhone

Open the URL in Safari → **Share → Add to Home Screen** → open **Dog Tracker** from the home
screen. Create your dog *in the installed app*: Safari and the home-screen app keep separate
storage.

**Updating:** push to `main` (or redeploy) at the **same address**; the installed app picks up the
new version the next time it's opened online. Keep the address stable — data belongs to the site
address, so a new URL starts empty (use **My dog → Export backup / Restore backup** to move data).

Web-specific files: `public/index.html` (iOS meta tags), `public/manifest.json`, `public/sw.js`
(offline cache, stamped by `scripts/build-web.mjs`), `public/icons/`, `src/platform/webApp.ts`,
`app.config.ts` (base path).

## Architecture

```
src/
  app/                 Expo Router screens (file = route)
    (tabs)/            Walks · Progress · Triggers · My dog
    walk/[key].tsx     walk detail (key = walk id or virtual schedule occurrence)
    marker.tsx         log / edit a reaction or success
    schedules/         schedule list + editor
    onboarding.tsx     first-run (shown only when no dog exists — Stack.Protected)
  domain/              pure TypeScript, no React — fully unit tested
    types.ts           data model
    schedule.ts        recurrence expansion, occurrence keys
    stats.ts           bucketing, metrics, period comparison, trigger breakdown
    encouragement.ts   supportive message + insight engine, trend-aware home greeting
    whyFacts.ts        researched "why" facts with sources
    dogVoice.ts        messages from the dog, each tied to a fact; home-screen context
    recentTrend.ts     last 14 days vs the 14 before
  breeds/              breed database (~120 breeds + designer mixes), fuzzy/mix matcher, traits
  components/          DogPortrait (procedural SVG), TrendChart, inputs, UI kit
  store/               Zustand store, AsyncStorage persistence, backup
  theme/               design tokens (light + dark)
```

Key decisions:

- **Per-dog storage documents.** `rdt/v1/profiles` holds the dog list; each dog's data lives in
  `rdt/v1/dog/<id>`. Only the active dog is loaded, and every write targets the document it
  was read from — profiles cannot leak into each other.
- **Schedules are rules, not rows.** The calendar expands schedules into *virtual* occurrences.
  An occurrence becomes a stored `Walk` only once you touch it (log a marker, skip, note, retime).
  Editing a schedule therefore updates all untouched walks; history is never rewritten.
- **Local calendar dates** (`YYYY-MM-DD`) instead of timestamps, so walks don't shift across
  time zones / DST.
- **Fair comparisons.** An in-progress period is compared with the *same elapsed part* of the
  previous one, so a half-finished month never looks worse just because it isn't over.
- **Honest charts.** One y-axis only: successes share the axis with reactions when both are
  counts; for intensity metrics they get a synced panel below. Colours come from a
  colour-blind-checked palette (orange = reactions, aqua = successes).
- **No native pickers / no network.** Time and date inputs are custom components, so the same
  UI works on web; the app makes no network requests of its own (tapping a "why" source opens it in
  the browser).

## Storage location

AsyncStorage persists to the device's app sandbox (SQLite on Android, files on iOS,
`localStorage` on web). Uninstalling the app deletes the data — use **My dog → Export backup**
to keep a copy.
