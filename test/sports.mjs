#!/usr/bin/env node
// ===========================================================================
// Sub Timer — sports matrix suite
// ---------------------------------------------------------------------------
// Drives EVERY format in the app (all 23, across 5 sports) through a complete
// game: setup → kickoff → auto-sub at least once → play every period to the
// final whistle (all breaks in between) → summary. Asserts the engine keeps a
// valid line-up, fires subs, advances all periods, tallies playing time, and
// never renders NaN or throws a console error — for quarter sports as well as
// soccer's two halves, and for both keeper and non-keeper formats.
//
// This is the structural coverage the smoke suite doesn't have: the 4-quarter
// engine (netball / AFL / basketball / water polo) and the keeperless paths.
// Run with `npm run sports`.
// ===========================================================================
import { runSuite, bootstrap, gameState, playToSummary } from './harness.mjs';

// The full format catalogue, grouped by sport, with the periods we expect.
const FORMATS_BY_SPORT = {
  soccer:    { periods: 2, formats: ['4v4', '5v5', '6v6', '7v7', '9v9', '11v11'] },
  netball:   { periods: 4, formats: ['nb-set', 'nb-go', 'nb-junior', 'nb-open'] },
  afl:       { periods: 4, formats: ['afl-auskick', 'afl-9', 'afl-10', 'afl-11', 'afl-12', 'afl-13', 'afl-14', 'afl-15', 'afl-16', 'afl-senior'] },
  basketball:{ periods: 4, formats: ['bball-5'] },
  waterpolo: { periods: 4, formats: ['wp-junior', 'wp-senior'] },
};

// One scenario per format: full game to summary with assertions along the way.
function formatScenario(sport, format, expectedPeriods) {
  return [`${sport} · ${format} — full game to summary`, async (page, { chk, shot }) => {
    await bootstrap(page, { format, name: `${sport} ${format}` });
    const s0 = await gameState(page);

    chk(`${format}: game started`, s0.hasG && s0.onLen > 0);
    chk(`${format}: on-field count = onField (${s0.onField})`, s0.onLen === s0.onField);
    chk(`${format}: periodCount = ${expectedPeriods}`, s0.periodCount === expectedPeriods);
    // Keeper invariant: GK formats must have a keeper on the field; others must not.
    if (s0.hasGk) chk(`${format}: keeper on field`, s0.gk != null && s0.on.includes(s0.gk));
    else chk(`${format}: no keeper (keeperless sport)`, s0.gk == null);

    // Kick off and fire one auto-sub if there's a bench, to exercise rotation.
    await page.evaluate(() => { if (!G.running) tog(); });
    const subbed = await page.evaluate(() => {
      if (!G.bench.length) return { hadBench: false, on: [...G.on] };
      const before = [...G.on];
      const ns = (typeof nxtST === 'function' && nxtST()) || cfg.sf * 60;
      G.secs = ns; G.elapsedMs = ns * 1000;
      trigSub(); if (G.ps && typeof confSub === 'function') confSub();
      return { hadBench: true, before, on: [...G.on] };
    });
    if (subbed.hadBench) {
      chk(`${format}: auto-sub rotated the line-up`, JSON.stringify(subbed.on) !== JSON.stringify(subbed.before));
      // field size must be preserved across a sub
      const after = await gameState(page);
      chk(`${format}: field size preserved after sub`, after.onLen === s0.onField);
      if (s0.hasGk) chk(`${format}: keeper still on field after sub`, after.gk != null && after.on.includes(after.gk));
    } else {
      chk(`${format}: rotation (no bench — skipped)`, true);
    }

    // Play through every remaining period to the summary.
    const sum = await playToSummary(page);
    const end = await page.evaluate(() => ({ half: G ? G.half : null, periods: getSport(currentTeam).periodCount }));
    chk(`${format}: reached final period (${expectedPeriods})`, end.half === expectedPeriods);
    chk(`${format}: summary renders playing time`, /[′'][0-9]/.test(sum) || /Playing Time/i.test(sum));
    chk(`${format}: no NaN in summary`, !/\bNaN\b/.test(sum));
    await shot(page, `${sport}-${format}-summary`);
  }];
}

const SCENARIOS = [];
for (const [sport, { periods, formats }] of Object.entries(FORMATS_BY_SPORT)) {
  for (const f of formats) SCENARIOS.push(formatScenario(sport, f, periods));
}

// Sport-specific scoring edge cases that the generic loop doesn't cover.
SCENARIOS.push(['afl scoring: goal=6, behind=1, undo', async (page, { chk }) => {
  await bootstrap(page, { format: 'afl-9', name: 'AFL Score' });
  await page.evaluate(() => { if (!G.running) tog(); });
  const sc = await page.evaluate(() => {
    aflScore('us', 'goal');    // +6
    aflScore('us', 'behind');  // +1  => 7
    aflScore('them', 'goal');  // them 6
    const afterGoals = { us: G.scoreUs, them: G.scoreThem, glUs: G.glUs, bhUs: G.bhUs };
    aflUndo('us');             // removes last 'us' entry (the behind) => us 6
    return { afterGoals, usAfterUndo: G.scoreUs };
  });
  chk('AFL: 1 goal + 1 behind = 7 points', sc.afterGoals.us === 7);
  chk('AFL: opponent goal = 6 points', sc.afterGoals.them === 6);
  chk('AFL: undo removed the behind (7 → 6)', sc.usAfterUndo === 6);
}]);

SCENARIOS.push(['soccer/netball scoring: adjScore +/- stays in sync with log', async (page, { chk }) => {
  await bootstrap(page, { format: 'nb-go', name: 'NB Score' });
  await page.evaluate(() => { if (!G.running) tog(); });
  const sc = await page.evaluate(() => {
    adjScore('us', 1); adjScore('us', 1); adjScore('them', 1);
    const goalsUs = G.log.filter(e => e.type === 'goal' && e.who === 'us').length;
    adjScore('us', -1); // correct a fat-finger
    const goalsUsAfter = G.log.filter(e => e.type === 'goal' && e.who === 'us').length;
    return { us: G.scoreUs, them: G.scoreThem, goalsUs, goalsUsAfter };
  });
  chk('netball: score increments (us=1 after 2 then -1)', sc.us === 1);
  chk('netball: decrement removed a logged goal', sc.goalsUs === 2 && sc.goalsUsAfter === 1);
  chk('netball: score never negative', sc.them >= 0);
}]);

runSuite({ title: 'Sub Timer sports matrix', slug: 'sports', scenarios: SCENARIOS })
  .then(({ code }) => process.exit(code))
  .catch((e) => { console.error('FATAL', e.stack || e); process.exit(2); });
