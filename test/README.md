# Sub Timer — tests

Sub Timer is a single-file PWA (`index.html`). These checks guard the core coach
journeys without changing how the app is shipped.

## Two tiers

| Command | What it does | Speed | Needs a browser |
| --- | --- | --- | --- |
| `npm run sanity` | Parses every inline `<script>` block in `index.html`; reports the app version. Catches syntax errors instantly. | <1s | no |
| `npm run smoke` | Boots `index.html` headless and walks: setup → Plan (keeper + pick-starters) → clock start/pause → subs + undo → half-time carry-over → summary, plus a non-keeper sport. Captures console/page errors and a screenshot per step. | ~10s | yes (Chromium) |

Both exit non-zero on failure. `smoke` writes screenshots and `summary.json` to
`test/screenshots/` (git-ignored).

## Running locally

```bash
npm install
npx playwright install chromium   # first time only
npm run smoke
```

Useful env vars: `SMOKE_HEADED=1` to watch it run, `SMOKE_BROWSER=/path/to/chrome`
to point at a specific browser binary.

## Where it runs automatically

- **SessionStart hook** (`.claude/hooks/session-start.sh`) installs deps and runs
  `sanity` when a Claude Code session opens.
- **CI** (`.github/workflows/smoke.yml`) runs `sanity` + `smoke` on every PR and
  on pushes to non-`main` branches, uploading screenshots as an artifact.
- **smoke-tester agent** (`.claude/agents/smoke-tester.md`) runs `smoke` on demand
  and debugs failures down to the offending code in `index.html`.

## Adding a check

Scenarios live in the `SCENARIOS` array in `smoke.mjs`. Each is
`[name, async (page) => { … }]` and drives real app functions via
`page.evaluate`, asserting with `chk(name, condition)`. Add a scenario, run
`npm run smoke`, confirm it goes green. Keep assertions tied to *intended*
behaviour — note that setup-only controls (pick-starters, bench-keeper) are
gated to pre-kickoff / half-time, so exercise them before starting the clock.
