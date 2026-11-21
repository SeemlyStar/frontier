import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valley } from '../game/content/valley.js';
import { newGame, migrate, validate, settle, advance, getActions, perform, hour } from '../game/engine/index.js';

const fresh = (seed = 42) => { const s = newGame(valley, seed); settle(s, valley); return s; };

function act(state, id) {
  const a = getActions(state, valley).find((x) => x.id === id);
  assert.ok(a, `action ${id} should be available at ${state.player.loc}/${state.player.place}, hour ${hour(state.minutes)}`);
  assert.ok(!a.disabled, `action ${id} is disabled: ${a.disabled}`);
  return perform(state, valley, id);
}

// Wait (or rest) until a given hour.
function waitUntil(state, h) {
  let guard = 0;
  while (hour(state.minutes) !== h && guard++ < 30) {
    const rest = getActions(state, valley).find((a) => a.id === 'rest');
    perform(state, valley, rest ? 'rest' : 'wait');
  }
}

function calmDown(state) {
  let guard = 0;
  while (state.player.stress > 40 && guard++ < 20) {
    const rest = getActions(state, valley).find((a) => a.id === 'rest');
    perform(state, valley, rest ? 'rest' : 'wait');
  }
}

test('a new game is valid and survives a JSON round trip', () => {
  const s = fresh();
  assert.deepEqual(validate(s, valley), []);
  const copy = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(copy, s);
});

test('the world stays sane over 90 days without the player', () => {
  const s = fresh(7);
  advance(s, valley, 90 * 1440);
  for (const [id, env] of Object.entries(s.locations)) {
    assert.ok(Number.isFinite(env.disturbance) && env.disturbance >= 0 && env.disturbance <= 100, id);
    assert.ok(env.vegetation >= 0 && env.vegetation <= 100, id);
  }
  for (const rec of Object.values(s.affinity)) assert.ok(rec.value >= -100 && rec.value <= 100);
  // The woodland stays disturbed while Tobin fells.
  assert.ok(s.locations.woodland.disturbance > 35, `woodland ${s.locations.woodland.disturbance}`);
  // Things happen between people, but not constantly.
  assert.ok(s.news.length >= 1, 'some news should happen');
  console.log(`  90 days: ${s.news.length} news items, e.g. ${s.news.slice(-3).map((n) => n.text).join(' / ')}`);
  assert.ok(JSON.stringify(s).length < 100_000, 'save stays small');
});

test('the same seed gives the same world', () => {
  const a = fresh(99), b = fresh(99);
  advance(a, valley, 20 * 1440); advance(b, valley, 20 * 1440);
  assert.deepEqual(a, b);
});

test('cutting deadwood lets the woodland recover', () => {
  const s = fresh(3);
  s.people.tobin.practice = 'deadwood';
  advance(s, valley, 40 * 1440);
  assert.ok(s.locations.woodland.disturbance < 35, `woodland ${s.locations.woodland.disturbance}`);
});

test('collapsing leads to rescue, not death', () => {
  const s = fresh(5);
  s.player.stress = 99;
  const out = act(s, 'travel:woodland');
  assert.ok(out.some((m) => m.kind === 'rescue'));
  assert.equal(s.player.place, 'inn');
  assert.ok(s.player.owes);
  assert.ok(s.player.stress < 100);
});

test('slice 1 can be completed', () => {
  const s = fresh(11);
  const trace = (label) => console.log(`  ${label}: day ${Math.floor(s.minutes / 1440) + 1} ${hour(s.minutes)}h, stress ${Math.round(s.player.stress)}, supplies ${s.player.supplies}, coin ${s.player.coin}`);

  // Day 1: the meadow, Ilse, and the reeds at night.
  act(s, 'buy'); act(s, 'buy');
  act(s, 'travel:meadow'); act(s, 'move:reeds');
  act(s, 'chat:ilse'); act(s, 'chat:ilse');
  act(s, 'ask:ilse:lights');
  assert.ok(s.player.facts.f_old_saying, 'learned the old saying');
  waitUntil(s, 20);
  act(s, 'observe');
  assert.ok(s.player.facts.f_reeds, 'saw the reeds glow');
  act(s, 'move:fords'); calmDown(s);
  act(s, 'reflect');
  assert.ok(s.player.insights.i_language, 'formed the first insight');
  act(s, 'sleep_rough');
  trace('after day 1');

  // Day 2: Tobin, the brambles, the moths, the amber.
  act(s, 'travel:woodland'); act(s, 'move:stand');
  waitUntil(s, 10);
  act(s, 'chat:tobin'); act(s, 'chat:tobin');
  act(s, 'ask:tobin:woods');
  assert.ok(s.player.facts.f_brambles, 'heard about the brambles');
  act(s, 'help:tobin');
  waitUntil(s, 15);
  act(s, 'travel:forest');
  calmDown(s); waitUntil(s, 17);
  act(s, 'observe');
  assert.ok(s.player.facts.f_moths, 'saw the moths');
  act(s, 'travel:woodland'); act(s, 'move:stand');
  waitUntil(s, 21);
  act(s, 'observe');
  assert.ok(s.player.facts.f_amber, 'saw the amber');
  act(s, 'move:clearing'); calmDown(s);
  act(s, 'reflect');
  assert.ok(s.player.insights.i_uphill, 'formed the second insight');
  act(s, 'sleep_rough');
  trace('after day 2');

  // Day 3: resupply, then up the deer trail to Garrow and the lookout.
  act(s, 'travel:brookhold');
  act(s, 'buy'); act(s, 'buy');
  act(s, 'travel:woodland');
  act(s, 'travel:forest');
  act(s, 'travel:slopes');
  calmDown(s);
  act(s, 'chat:garrow'); act(s, 'chat:garrow'); act(s, 'chat:garrow');
  act(s, 'ask:garrow:slopes');
  if (!s.player.facts.f_flock) act(s, 'ask:garrow:slopes');
  assert.ok(s.player.facts.f_flock, 'heard about the flock');
  act(s, 'move:lookout');
  waitUntil(s, 21);
  act(s, 'observe');
  assert.ok(s.player.facts.f_line, 'saw the line of light');
  calmDown(s);
  act(s, 'reflect');
  assert.ok(s.player.insights.i_listening, 'formed the final insight');
  assert.ok(s.flags.sliceDone);
  trace('slice done');
});
