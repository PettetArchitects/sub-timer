#!/bin/bash
# SessionStart hook for Sub Timer.
#
# In Claude Code on the web each session gets a fresh container, so prep it once
# (the container state is cached after the hook completes): install the JS
# dev-deps and the Chromium build that the smoke harness drives, so `npm run
# smoke` and the smoke-tester agent work without a "Playwright not found" hiccup.
# Then run the fast, browser-free sanity check so a broken build surfaces the
# moment the session opens.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Heavy install only matters in the ephemeral web sandbox. Locally you usually
# already have node_modules / a browser, so skip it and just sanity-check.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  npm install
  npx playwright install chromium || true
fi

node test/sanity.mjs
