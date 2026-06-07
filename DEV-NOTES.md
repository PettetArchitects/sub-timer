# Sub Timer — `dev` working branch

This is the long-lived integration branch for improvements. **`main` stays
operational** (production: https://sub-timer.vercel.app); work happens here and
merges to `main` in tested batches.

## How this branch works
- Push to `dev` → Vercel builds a **preview deployment** (URL on the PR) + CI runs the smoke tests.
- Test on the preview URL. When a batch is solid, **merge `dev` → `main`** to ship.
- `deploy-guard.sh` + `DEPLOY.md` still apply: deployed `main` is the source of truth; sync before editing.

## Baseline
Forked from `main` at **v2.7.94-beta** (commit with deploy guard + workflow doc).

## Improvement backlog (edit freely)
- [ ] _add ideas here as they come up_

## Shipped from dev → main
- _nothing yet_
