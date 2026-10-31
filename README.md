# GymTrack

Mobile-first workout tracker built with **Angular 21** (standalone, zoneless, signals). Plan routines, log live sessions with a timer, and track progress with a calendar and charts.

Exercise catalogue: [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) — 870+ exercises, public domain (Unlicense). The JSON is bundled in `public/data/exercises.json`; images are lazy-loaded from the GitHub raw CDN.

## Quick start

```bash
npm install
npm start            # http://localhost:4200
npm run build        # production build → dist/gym-track
```

Requires Node `^20.19 || ^22.12 || >=24`. (Angular 22 needs Node ≥ 22.22.3 — upgrade Node, then run `ng update @angular/core@22 @angular/cli@22`.)

## Demo data (dev only)

In dev builds (`npm start`) an empty database is seeded with 3 routines (Push / Pull / Legs) and ~8 weeks of progressive sessions, so the dashboard, calendar and charts have data. Generator: `src/app/core/data/local/demo-seed.ts`. All demo records have ids starting with `demo-`.

- `http://localhost:4200/home?demo` — add the demo data next to existing data
- `http://localhost:4200/home?demo=clear` — remove only the demo data

Production builds never seed.

## Features

| Area | What it does |
|------|--------------|
| **Exercises** | Typo-tolerant search (Fuse.js + edit-distance re-ranking; gym slang like "abs", "db", "rdl") + filters (muscle, equipment, level) over the full catalogue with a virtual-scrolled list; detail page with animated start/end frames, muscles and instructions; add to any routine. |
| **Routines** | Create / edit / delete routines. Each exercise has rows of sets with KG and REPS. Save from the sticky bottom bar; unsaved changes are guarded. |
| **Session** | Start from a routine (or empty). Live timer, tick sets as done, change weights/reps, add exercises mid-workout. Survives reloads (localStorage). Finish saves the session. |
| **History** | Month calendar with workout days, per-day session list with full set detail, weekly volume chart and per-exercise progress chart. |
| **Home** | Last-7-days training breakdown, weekly stats, quick-start routines, recent sessions. |

## Architecture

```
src/
├── environments/environment.ts      # dataSource: 'local' | 'api', API + CDN URLs
├── styles/                          # design system (see "Styling")
└── app/
    ├── app.component.ts             # shell: router-outlet, bottom nav, session pill
    ├── app.config.ts                # router (input binding, view transitions), http, data layer
    ├── app.routes.ts                # every feature lazy-loaded
    ├── core/
    │   ├── data/
    │   │   ├── repositories.ts      # abstract contracts (also DI tokens)
    │   │   ├── local/               # Dexie (IndexedDB) + static JSON implementations
    │   │   ├── http/                # REST implementations (ready for a backend)
    │   │   └── data-layer.providers.ts
    │   ├── state/                   # signal stores: exercise, routine, session, active session
    │   └── utils/                   # pure helpers: ids, dates, workout list editing/totals
    ├── shared/
    │   ├── components/              # button, card, chip, page-header, text-field, search-field,
    │   │                            # select, stat, bottom-sheet, confirm-dialog, empty-state,
    │   │                            # exercise-list, exercise-picker, exercise-entry-card, set-row
    │   ├── directives/              # img-fallback
    │   ├── pipes/                   # duration, volume, exercise-image
    │   └── models/                  # Exercise, Routine, WorkoutSession, ExerciseEntry, WorkoutSet
    ├── layout/                      # bottom-nav, session-pill
    └── features/                    # dashboard, exercises, routines, session, tracking
```

### Data flow

```
Component ──reads signals──▶ Store (core/state) ──Observable──▶ Repository (abstract)
                                                                   ├─ Local*  (Dexie / static JSON)  ← default
                                                                   └─ Http*   (REST API)
```

- **Components** never touch storage. They read store signals and call store methods.
- **Stores** (`RoutineStore`, `SessionStore`, `ExerciseStore`) cache data in signals and expose `computed()` views (`byId`, `byDay`, …).
- **Repositories** are abstract classes returning `Observable`s, so the HTTP versions are a drop-in swap.
- **Models** use string UUIDs and ISO date strings — the same JSON can be sent to an API unchanged.

### Switching to a backend

1. Set `dataSource: 'api'` and `apiBaseUrl` in `src/environments/environment.ts`.
2. Implement these endpoints (bodies use the shapes in `shared/models`):

   | Method | Path | |
   |---|---|---|
   | GET | `/exercises` | catalogue |
   | GET / PUT / DELETE | `/routines`, `/routines/:id` | PUT is an upsert |
   | GET / PUT / DELETE | `/sessions`, `/sessions/:id` | PUT is an upsert |

Nothing else changes — `provideDataLayer()` binds the `Http*` repositories instead of the local ones.

## Styling

- **Tokens** — `src/styles/_tokens.scss` holds SCSS maps (`$theme-light`, `$theme-dark`, `$static-tokens`) emitted as CSS custom properties (`--gt-color-pink`, `--gt-radius-xl`, …).
- **Tailwind v4** — `src/styles/tailwind.css` maps those variables into the Tailwind theme, so utilities like `bg-surface`, `text-muted`, `rounded-xl`, `font-display` follow the active theme.
- **Mixins** — `_mixins.scss` (`jelly`, `respond`, `card`, `display-heading`, `line-clamp`, …). Use in component SCSS with `@use 'mixins';`.
- **Global classes** — `_utilities.scss` (`.page`, `.stat-row`, `.jelly`, `.display-heading`, `.display-number`, `.field-input`, `.chip-row`, animation classes for `animate.enter/leave`).

### Jelly surfaces (design language)

All lime/pink accents (buttons, selected chips, active nav tab, checkmarks, calendar days, chart bars) use one glossy "jelly" recipe: light top → saturated core → deeper base, white inner rims, a soft specular shine and a coloured glow.

```scss
@use 'mixins';
.thing {
  --jelly: var(--gt-color-pink);   // any colour; light/deep shades are derived
  @include mixins.jelly;           // jelly(sm) for small dots, $glow: false to drop the halo
}
```

Or in templates: `<span class="jelly">…</span>` (lime). White surfaces (cards, outline buttons, search) use `jelly-surface`; `jelly-glow` adds a soft coloured glow (used on the live workout header).

### App icons

`public/favicon.svg` is the source icon (lime jelly square + dumbbell). PNGs (`favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) are rendered from it and referenced by `index.html` and `manifest.webmanifest`, so the app can be added to a phone's home screen. Charts get the same look via the Chart.js plugins in `features/tracking/components/progress-charts/jelly-chart.plugins.ts`. Cards get a soft white + lime glow from the `--gt-shadow-card` token.

### Dark mode (prepared, not enabled)

Dark values already exist in `$theme-dark` and are emitted under `[data-theme='dark']`. To turn it on:

```ts
document.documentElement.dataset['theme'] = 'dark';
```

Tailwind's `dark:` variant is wired to the same attribute.

## Reusable components (examples)

```html
<button appButton variant="accent" size="lg" block>Save</button>      <!-- primary | accent | pink (also destructive) | outline | ghost -->
<a appButton variant="outline" routerLink="/routines">Routines</a>
<button appChip [selected]="isActive">chest</button>
<app-card padding="lg">…</app-card>
<app-text-field label="Routine name" [(value)]="name" />
<app-search-field placeholder="Search exercises" [(value)]="query" />
<app-select ariaLabel="Exercise" [options]="options()" [(value)]="selectedId" searchable />
<app-stat label="Time trained" value="3H 40M" unit="this week" />
@if (open()) { <app-exercise-picker [addedIds]="ids()" (added)="add($event)" (closed)="open.set(false)" /> }
```

Confirmations never use `window.confirm()` — inject `ConfirmService`:

```ts
const ok = await this.confirm.ask({ title: 'Delete routine?', message: '…', confirmText: 'Delete', tone: 'danger' });
```

## Performance notes

- All routes lazy-loaded; Chart.js only loads inside a `@defer (on viewport)` block on History, and the confirm dialog only loads the first time one is shown.
- Zoneless change detection + `OnPush` everywhere; templates bind to signals / `computed()` / pure pipes — no method calls for derived data.
- Exercise list uses CDK virtual scroll; search uses a pre-built lower-case index and a debounced query signal.
- Images use `loading="lazy"` with an offline placeholder on error.

## Route flags

Route `data: { hideNav: true }` hides the bottom nav (used by the routine editor and live session).
