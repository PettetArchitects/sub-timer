# Sub Timer — tests

Sub Timer is a single-file PWA (`index.html`). These checks guard the core coach
journeys — across every sport — without changing how the app is shipped.

## The suites

| Command | What it does | Checks | Speed | Browser |
| --- | --- | --- | --- | --- |
| `npm run sanity` | Parses every inline `<script>` block in `index.html`; reports the app version. Catches syntax errors instantly. | — | <1s | no |
| `npm run smoke` | Core coach journey: setup → Plan (keeper + pick-starters) → clock → subs + undo → half-time carry-over → summary, plus a non-keeper sport. | 29 | ~10s | yes |
| `npm run sports` | **Every format (23, across 5 sports)** through a full game: kickoff → auto-sub → play all periods/breaks → summary, asserting valid line-up, keeper invariants, period progression, playing-time tally, no NaN. Plus sport-specific scoring (AFL goals/behinds, +/- score sync). | 220 | ~60s | yes |
| `npm run edge` | Messy real-world journeys: save/resume mid-game, discard, manual + injury subs (back-to-bench vs out-for-game), sub-strategy switching, live settings clamps, delete team, add/remove players, exactly-onField (no bench), live no-show removal with index remap, reset-half. | 38 | ~20s | yes |
| `npm test` | Runs smoke + sports + edge in sequence. | 287 | ~90s | yes |

Every suite exits non-zero on failure and writes screenshots + `summary.json`
to `test/screenshots/<suite>/` (git-ignored).

## The sports/format matrix (what `sports` covers)

| Sport | Periods | Keeper | Formats |
| --- | --- | --- | --- |
| Soccer | 2 halves | 5v5+ only | 4v4, 5v5, 6v6, 7v7, 9v9, 11v11 |
| Netball | 4 quarters | no | nb-set, nb-go, nb-junior, nb-open |
| AFL | 4 quarters | no | auskick, U9–U16, senior (10 formats) |
| Basketball | 4 quarters | no | bball-5 |
| Water polo | 4 quarters | yes | wp-junior, wp-senior |

## Running locally

```bash
npm install
npx playwright install chromium   # first time only
npm test                          # or: npm run smoke / sports / edge
```

Useful env vars: `SMOKE_HEADED=1` to watch it run, `SMOKE_BROWSER=/path/to/chrome`
to point at a specific browser binary.

## How it's structured

`harness.mjs` holds the shared plumbing every suite reuses:

- `runSuite({ title, slug, scenarios })` — serves the repo, launches headless
  Chromium, runs the scenario list, captures console/page errors (minus
  offline-CDN noise), screenshots steps, prints a report, returns an exit code.
- `bootstrap(page, { format, name, squad, extraBench })` — builds a game from
  scratch for any format (new team → sport → format → sample squad → start).
  `squad` forces an exact roster size (e.g. no-bench edge cases).
- `gameState(page)`, `bodyText(page)`, `elText(page, id)`, `playToSummary(page)`
  — common reads/drivers used by assertions.

Each suite file (`smoke.mjs`, `sports.mjs`, `edge.mjs`) is just a `SCENARIOS`
array of `[name, async (page, { chk, shot }) => { … }]` passed to `runSuite`.

## Where it runs automatically

- **SessionStart hook** (`.claude/hooks/session-start.sh`) installs deps and runs
  `sanity` when a Claude Code session opens.
- **CI** (`.github/workflows/smoke.yml`) runs sanity + smoke + sports + edge on
  every PR and on pushes to non-`main` branches, uploading screenshots.
- **smoke-tester agent** (`.claude/agents/smoke-tester.md`) runs the suites on
  demand and debugs failures down to the offending code in `index.html`.

## Adding a check

Add a scenario to the relevant suite's `SCENARIOS` array, drive real app
functions via `page.evaluate`, and assert with `chk(name, condition)`. Run the
suite and confirm green. Keep assertions tied to *intended* behaviour:

- Setup-only controls (pick-starters, bench-keeper) are gated to pre-kickoff /
  half-time — exercise them before starting the clock.
- When driving multiple games on one page, `bootstrap` already cancels the prior
  game's animation-frame loop; if you hand-roll game setup, do the same or a
  leaked `tickLoop` will mutate the next scenario's state.
- For GK sports `onField` *includes* the keeper; `G.gk` is an index into `avail`
  that also appears in `G.on`.
