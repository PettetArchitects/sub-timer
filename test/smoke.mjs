#!/usr/bin/env node
// ===========================================================================
// Sub Timer — smoke suite (core coach journeys, soccer + one non-keeper sport)
// ---------------------------------------------------------------------------
// The fast routine health check: boots index.html and walks setup → Plan
// (keeper + pick-starters) → clock → subs/undo → half-time carry-over →
// summary, plus a non-keeper sport. Shared browser/server plumbing lives in
// harness.mjs. Run with `npm run smoke`.
// ===========================================================================
import { runSuite, bootstrap, gameState, bodyText, elText } from './harness.mjs';

const SCENARIOS = [
  ['load + globals', async (page, { chk, shot }) => {
    chk('app globals present', await page.evaluate(() => typeof newTeam === 'function' && typeof FORMATS === 'object'));
    chk('home screen rendered', await page.evaluate(() => !!document.querySelector('button, .chip, [onclick]')));
    await shot(page, 'home');
  }],

  ['soccer setup → Plan: keeper + pick-starters (pre-kickoff)', async (page, { chk, shot }) => {
    await bootstrap(page, { format: '7v7', name: 'Smoke FC' });
    const s = await gameState(page);
    chk('game screen has on-field XI', s.onLen === Math.min(s.onField, s.onLen + s.benchLen));
    chk('pre-kickoff = setup phase', await page.evaluate(() => planSetupPhase() === true));
    await page.evaluate(() => switchToView('plan'));
    await page.waitForTimeout(400);
    const html = await page.evaluate(() => document.getElementById('planRosterOverview').innerHTML);
    chk('keeper picker present (GK sport)', /Keeper/.test(html));
    chk('"Clear field — pick starters" present', /Clear field/.test(html));
    await page.evaluate(() => planClearField());
    const cleared = await page.evaluate(() => ({ on: G.on.length, pick: _pickStarters }));
    chk('clear field empties the pitch', cleared.on === 0 && cleared.pick === true);
    await page.evaluate(() => { const n = FORMATS[curFmt].onField; while (G.on.length < n && G.bench.length) planAddStarter(G.bench[0]); planFinishStarters(); });
    const filled = await page.evaluate(() => ({ on: G.on.length, n: FORMATS[curFmt].onField, gkOn: G.on.includes(G.gk), pairs: (G.pairs || []).length }));
    chk('pick-starters fills field to onField', filled.on === filled.n);
    chk('keeper valid + rotation rebuilt', filled.gkOn && filled.pairs > 0);
    chk('no NaN on Plan page', !/\bNaN\b/.test(await elText(page, 'subOrderOv')));
    await shot(page, 'plan-pick');
    const res = await page.evaluate(() => {
      const benchIdx = G.bench[G.bench.length - 1];
      const prevGk = G.gk, prevOn = G.on.length;
      setPlanKeeper(benchIdx);
      return { benchIdx, prevGk, gk: G.gk, on: G.on.length, gkOn: G.on.includes(G.gk), oldBenched: G.bench.includes(prevGk), prevOn };
    });
    chk('benched player becomes keeper, on field', res.gk === res.benchIdx && res.gkOn);
    chk('field size preserved on keeper swap', res.on === res.prevOn);
    chk('displaced keeper sent to bench', res.oldBenched);
    await shot(page, 'keeper-any');
  }],

  ['game: start / pause clock', async (page, { chk, shot }) => {
    await page.evaluate(() => switchToView('game'));
    await page.waitForTimeout(200);
    await page.evaluate(() => { if (!G.running) tog(); });
    await page.waitForTimeout(600);
    chk('clock running after start', await page.evaluate(() => G.running === true));
    await page.evaluate(() => { if (G.running) tog(); });
    chk('clock pauses', await page.evaluate(() => G.running) === false);
    chk('no NaN on game screen', !/\bNaN\b/.test(await bodyText(page)));
    await shot(page, 'game');
  }],

  ['subs + undo', async (page, { chk, shot }) => {
    const before = await page.evaluate(() => {
      const ns = (typeof nxtST === 'function') ? nxtST() : 5 * 60;
      G.secs = (ns || 300); G.elapsedMs = G.secs * 1000;
      return { on: [...G.on] };
    });
    const subbed = await page.evaluate(() => { const ok = G.bench.length > 0; if (ok) trigSub(); if (G.ps && typeof confSub === 'function') confSub(); return { on: [...G.on], hadBench: ok }; });
    if (subbed.hadBench) {
      chk('trigSub changed the on-field set', JSON.stringify(subbed.on) !== JSON.stringify(before.on));
      const undone = await page.evaluate(() => { if (typeof undoLastSub === 'function') undoLastSub(); return [...G.on]; });
      chk('undoLastSub restores the line-up', JSON.stringify(undone) === JSON.stringify(before.on));
    } else {
      chk('subs scenario (no bench — skipped)', true);
    }
    await shot(page, 'subs');
  }],

  ['half-time: 2nd-half line-up carries over', async (page, { chk, shot }) => {
    await page.evaluate(() => { if (!G.running) tog(); const t = cfg.hm * 60; G.elapsedMs = (t - 1) * 1000; G.secs = t - 1; G.lastTs = performance.now(); });
    await page.waitForTimeout(1800);
    const brk = await page.evaluate(() => ({ atBreak: !!G.atBreak, nsi: document.getElementById('nsi').innerText }));
    chk('reached half-time break', brk.atBreak);
    chk('break screen exposes 2nd-half line-up touch point', /2nd-half line-up/i.test(brk.nsi));
    await shot(page, 'halftime');
    await page.evaluate(() => openSubOrder()); await page.waitForTimeout(300);
    const planned = await page.evaluate(() => {
      const other = G.on.find(i => i !== G.gk); setPlanKeeper(other);
      planClearField();
      const n = FORMATS[curFmt].onField; while (G.on.length < n && G.bench.length) planAddStarter(G.bench[0]);
      planFinishStarters();
      return { gk: G.gk, on: [...G.on] };
    });
    await page.evaluate(() => startNextPeriod()); await page.waitForTimeout(300);
    const p2 = await page.evaluate(() => ({ half: G.half, gk: G.gk, on: [...G.on], gkOn: G.on.includes(G.gk), running: G.running }));
    chk('2nd period started', p2.half === 2 && p2.running);
    chk('2nd-half keeper carried into period', p2.gk === planned.gk && p2.gkOn);
    chk('2nd-half line-up carried into period', JSON.stringify(p2.on) === JSON.stringify(planned.on));
  }],

  ['summary screen renders', async (page, { chk, shot }) => {
    await page.evaluate(() => { G.half = getSport(currentTeam).periodCount; if (typeof advH === 'function') advH(); });
    await page.waitForTimeout(300);
    const sum = await page.evaluate(() => { const c = document.getElementById('sumCard'); return c ? c.innerText : ''; });
    chk('summary shows playing-time rows', /[′'][0-9]/.test(sum) || /Playing Time/i.test(sum), `(${sum.slice(0, 40).replace(/\n/g, ' ')}…)`);
    chk('no NaN in summary', !/\bNaN\b/.test(sum));
    await shot(page, 'summary');
  }],

  ['non-keeper sport (netball)', async (page, { chk, shot }) => {
    await bootstrap(page, { format: 'nb-set', name: 'Smoke Net' });
    const s = await gameState(page);
    chk('netball game started', s.hasG && s.onLen > 0);
    chk('netball format has no keeper', s.hasGk === false);
    await page.evaluate(() => switchToView('plan')); await page.waitForTimeout(300);
    const html = await page.evaluate(() => document.getElementById('planRosterOverview').innerHTML);
    chk('no keeper control for non-GK sport', !/Keeper/.test(html));
    chk('no NaN on netball Plan', !/\bNaN\b/.test(await elText(page, 'subOrderOv')));
    await shot(page, 'netball-plan');
  }],
];

runSuite({ title: 'Sub Timer smoke', slug: 'smoke', scenarios: SCENARIOS })
  .then(({ code }) => process.exit(code))
  .catch((e) => { console.error('FATAL', e.stack || e); process.exit(2); });
