// Everything the player can do, and what it costs.

import { chance } from './rng.js';
import { day, hour, isNight, isDusk, danger, disturb, clamp, stateLine } from './world.js';
import { advance, log, addNews, peopleAt } from './sim.js';
import { pairKey } from './state.js';

export const MAX_SUPPLIES = 6;
export const BED_COST = 2;
export const SUPPLY_COST = 2;
export const DEADWOOD_TRUST = 25;

export function band(stress) {
  if (stress >= 100) return 'collapse';
  if (stress >= 85) return 'overwhelmed';
  if (stress >= 60) return 'strained';
  return 'calm';
}

const knowsInsight = (state, id) => !!state.player.insights[id];
const readsLights = (state) => knowsInsight(state, 'i_language');

function placeOf(state, content) {
  const p = state.player;
  return content.locations[p.loc].places[p.place];
}

function addStress(state, amount) {
  state.player.stress = clamp(state.player.stress + amount);
}

function rel(state, id) { return state.relations[id]; }

function meet(state, content, id, out) {
  const r = rel(state, id);
  if (!r.met) {
    r.met = true;
    out.push(`You meet ${content.people[id].name}, the ${content.people[id].role}.`);
  }
}

function learnFact(state, content, id, out) {
  if (state.player.facts[id]) return false;
  state.player.facts[id] = day(state.minutes);
  out.push({ kind: 'fact', text: content.facts[id].text });
  return true;
}

function routesFrom(state, content) {
  const here = state.player.loc;
  return content.routes
    .filter((r) => r.a === here || r.b === here)
    .filter((r) => !r.requires || knowsInsight(state, r.requires))
    .map((r) => ({ ...r, to: r.a === here ? r.b : r.a }));
}

function availableInsights(state, content) {
  const have = (id) => !!(state.player.facts[id] || state.player.insights[id]);
  return Object.entries(content.insights).filter(([id, ins]) => !state.player.insights[id] && ins.needs.every(have));
}

function observableFacts(state, content) {
  const p = state.player;
  return Object.entries(content.facts).filter(([id, f]) => {
    const o = f.observe;
    if (!o || p.facts[id]) return false;
    if (o.loc !== p.loc || o.place !== p.place) return false;
    if (o.night && !isNight(state.minutes)) return false;
    if (o.dusk && !isDusk(state.minutes)) return false;
    if (o.minDisturbance && state.locations[o.loc].disturbance < o.minDisturbance) return false;
    return true;
  });
}

function chatLine(state, content, id) {
  const person = content.people[id];
  const recent = [...state.news].reverse().find((n) => n.who?.includes(id) && state.minutes - n.minutes < 3 * 1440);
  if (recent) return `${person.name} talks about it: ${recent.text}`;
  const st = state.people[id];
  if (st.partner) return `${person.name} mentions ${content.people[st.partner].name} more than once.`;
  if (id === 'tobin' && st.practice === 'deadwood') return 'Tobin says the deadwood is slow work, but the brambles have stopped coming for his ankles.';
  return person.opinion;
}

// --- Rescue --------------------------------------------------------------

function rescue(state, content, out) {
  const p = state.player;
  const candidates = Object.entries(state.relations).filter(([, r]) => r.met && r.trust >= 10).sort((a, b) => b[1].trust - a[1].trust);
  const rescuer = candidates.length ? candidates[0][0] : 'maren';
  const name = content.people[rescuer].name;
  const lost = Math.ceil(p.supplies / 2);
  // Wake at the inn at 07:00 the next morning.
  const nextMorning = (day(state.minutes)) * 1440 + 7 * 60;
  advance(state, content, Math.max(60, nextMorning - state.minutes));
  p.loc = 'brookhold'; p.place = 'inn';
  p.stress = 45;
  p.supplies -= lost;
  p.owes = rescuer;
  rel(state, rescuer).trust = clamp(rel(state, rescuer).trust - 10, -100, 100);
  rel(state, rescuer).met = true;
  addNews(state, `${name} found someone collapsed and carried them back to the inn.`, [rescuer]);
  out.push({ kind: 'rescue', text: `Everything goes grey. You wake at the inn the next morning. ${name} found you and brought you back. You lost ${lost} supplies, and you owe ${name} a favour.` });
}

// --- Actions -------------------------------------------------------------

export function getActions(state, content) {
  const p = state.player;
  const loc = content.locations[p.loc];
  const place = placeOf(state, content);
  const tags = place.tags;
  const b = band(p.stress);
  const tooStressed = b === 'overwhelmed';
  const outdoor = tags.includes('outdoor');
  const night = isNight(state.minutes);
  const list = [];
  const add = (a) => list.push(a);

  // Here
  add({
    id: 'observe', group: 'here', label: 'Observe', minutes: 30,
    disabled: tooStressed && 'Too overwhelmed to take anything in.',
    run(out) {
      addStress(state, 3 + (outdoor ? danger(state, content, p.loc) / 15 : 0) + (outdoor && night ? 3 : 0));
      advance(state, content, 30);
      // What you notice depends on how things are by the end of your watch.
      const candidates = observableFacts(state, content);
      const succeed = band(p.stress) === 'calm' || chance(state, 0.5);
      if (candidates.length && succeed) {
        learnFact(state, content, candidates[0][0], out);
      } else {
        if (candidates.length) out.push('Something here is worth noticing, but you are too on edge to see it clearly.');
        out.push(stateLine(state, content, p.loc, p.place, readsLights(state)) || 'Nothing new catches your eye.');
      }
    },
  });

  if (tags.includes('quiet')) add({
    id: 'reflect', group: 'here', label: 'Reflect', minutes: 40,
    disabled: b !== 'calm' && 'Too unsettled to think clearly. Rest first.',
    run(out) {
      advance(state, content, 40);
      addStress(state, -3);
      const ready = availableInsights(state, content);
      if (!ready.length) { out.push('Your thoughts circle without landing. You need to see or hear more.'); return; }
      const [id, ins] = ready[0];
      p.insights[id] = day(state.minutes);
      if (ins.endsSlice) state.flags.sliceDone = true;
      out.push({ kind: 'insight', title: ins.name, text: ins.text, unlocks: ins.unlocks, question: ins.question });
    },
  });

  if (tags.includes('rest')) add({
    id: 'rest', group: 'here', label: 'Rest an hour', minutes: 60,
    run(out) {
      advance(state, content, 60);
      addStress(state, outdoor && night ? -3 : -8);
      out.push(outdoor && night ? 'You rest, but the dark keeps you watchful.' : 'You rest, and your shoulders come down a little.');
    },
  });

  add({
    id: 'wait', group: 'here', label: 'Wait an hour', minutes: 60,
    run(out) {
      advance(state, content, 60);
      if (tags.includes('quiet')) addStress(state, -2);
      out.push('Time passes.');
    },
  });

  if (tags.includes('bed')) add({
    id: 'sleep', group: 'here', label: `Take a bed (${BED_COST} coin)`, minutes: null,
    disabled: p.coin < BED_COST ? 'Not enough coin.' : hour(state.minutes) >= 6 && hour(state.minutes) < 18 && 'Too early for bed. Beds are let from 18:00.',
    run(out) {
      p.coin -= BED_COST;
      const wake = (hour(state.minutes) < 6 ? day(state.minutes) - 1 : day(state.minutes)) * 1440 + 7 * 60;
      advance(state, content, wake - state.minutes);
      addStress(state, -40);
      out.push('You sleep deeply under the inn\'s eaves and wake to the smell of bread.');
    },
  });

  if (outdoor && tags.includes('rest')) add({
    id: 'sleep_rough', group: 'here', label: 'Sleep rough (1 supply)', minutes: null,
    disabled: !(night || hour(state.minutes) >= 18) && 'Only after 18:00.',
    run(out) {
      const wake = (hour(state.minutes) < 6 ? day(state.minutes) - 1 : day(state.minutes)) * 1440 + 6 * 60;
      advance(state, content, wake - state.minutes);
      const d = danger(state, content, p.loc);
      if (p.supplies > 0) {
        p.supplies -= 1;
        addStress(state, -15 + d / 5);
        out.push(d >= 40 ? 'You sleep in fits. Something circles the camp in the dark.' : 'You sleep under the sky and wake stiff but rested.');
      } else {
        addStress(state, 5 + d / 5);
        out.push('Cold and hungry, you barely sleep.');
      }
    },
  });

  if (tags.includes('forage')) add({
    id: 'forage', group: 'here', label: 'Forage', minutes: 60,
    disabled: tooStressed ? 'Too overwhelmed.' : p.supplies >= MAX_SUPPLIES && 'Your pack is full.',
    run(out) {
      advance(state, content, 60);
      addStress(state, 4);
      const env = state.locations[p.loc];
      disturb(state, p.loc, 6);
      env.vegetation = clamp(env.vegetation - 3);
      if (env.vegetation >= 30) { p.supplies += 1; out.push('You gather enough for a day on the road. The place is a little more trampled for it.'); }
      else out.push('There is little left worth taking here.');
    },
  });

  if (tags.includes('shop')) add({
    id: 'buy', group: 'here', label: `Buy supplies (${SUPPLY_COST} coin)`, minutes: 5,
    disabled: p.coin < SUPPLY_COST ? 'Not enough coin.' : p.supplies >= MAX_SUPPLIES ? 'Your pack is full.' : state.innStock <= 0 && 'Sold out until tomorrow.',
    run(out) {
      p.coin -= SUPPLY_COST; p.supplies += 1; state.innStock -= 1;
      advance(state, content, 5);
      out.push(`Maren wraps bread, cheese and a twist of salt. (${state.innStock} left today.)`);
    },
  });

  // Moving within the location
  for (const [pid, pl] of Object.entries(loc.places)) {
    if (pid === p.place) continue;
    add({
      id: `move:${pid}`, group: 'move', label: pl.name, minutes: 5,
      run() { advance(state, content, 5); p.place = pid; },
    });
  }

  // Travel between locations
  for (const r of routesFrom(state, content)) {
    const dest = content.locations[r.to];
    add({
      id: `travel:${r.to}`, group: 'travel', label: dest.name, minutes: r.minutes,
      detail: `${r.minutes} min${r.supplies ? `, ${r.supplies} supply` : ''}${r.name ? `, by ${r.name}` : ''}`,
      run(out) {
        const night0 = isNight(state.minutes);
        advance(state, content, r.minutes);
        let stress = 3 + danger(state, content, r.to) / 8;
        if (readsLights(state)) stress /= 2;
        if (night0 || isNight(state.minutes)) { stress += 6; out.push('You pick your way through the dark.'); }
        if (r.supplies > p.supplies) { stress += 10; p.supplies = 0; out.push('You push on with nothing left to eat.'); }
        else p.supplies -= r.supplies;
        addStress(state, stress);
        p.loc = r.to;
        p.place = Object.keys(dest.places)[0];
      },
    });
  }

  // People here
  for (const id of peopleAt(state, p.loc, p.place)) {
    const person = content.people[id];
    const r = rel(state, id);
    add({
      id: `chat:${id}`, group: 'people', person: id, label: 'Chat', minutes: 20,
      run(out) {
        meet(state, content, id, out);
        advance(state, content, 20);
        r.familiarity = clamp(r.familiarity + 8);
        if (p.owes !== id) r.trust = clamp(r.trust + 2, -100, 100);
        addStress(state, -5);
        out.push(chatLine(state, content, id));
      },
    });
    for (const [topic, topicName] of Object.entries(content.topics)) {
      add({
        id: `ask:${id}:${topic}`, group: 'people', person: id, label: `Ask about ${topicName}`, minutes: 10,
        disabled: tooStressed && 'Too overwhelmed.',
        run(out) {
          meet(state, content, id, out);
          advance(state, content, 10);
          const known = state.people[id].knows.filter((f) => content.facts[f]?.topic === topic && !p.facts[f]);
          if (!known.length) { out.push(`${person.name} doesn't know anything more about ${topicName}.`); return; }
          const fact = content.facts[known[0]];
          if (r.familiarity < (fact.minFamiliarity ?? 15)) { out.push(`${person.name} hesitates. They don't know you well enough yet.`); return; }
          learnFact(state, content, known[0], out);
        },
      });
    }
    add({
      id: `news:${id}`, group: 'people', person: id, label: 'Ask for news', minutes: 10,
      run(out) {
        meet(state, content, id, out);
        advance(state, content, 10);
        if (r.familiarity < 10) { out.push(`${person.name} isn't one to gossip with strangers.`); return; }
        const fresh = state.news.filter((n) => !p.heardNews.includes(n.id) && state.minutes - n.minutes < 10 * 1440).slice(-3);
        if (!fresh.length) { out.push(`"Nothing new," says ${person.name}.`); return; }
        for (const n of fresh) { p.heardNews.push(n.id); out.push({ kind: 'news', text: n.text }); }
      },
    });
    const w = person.work;
    const h = hour(state.minutes);
    if (w && w.at[0] === p.loc && w.at[1] === p.place) add({
      id: `help:${id}`, group: 'people', person: id, label: w.label, minutes: w.minutes,
      detail: `${w.minutes} min, +${w.coin} coin`,
      disabled: tooStressed ? 'Too overwhelmed.' : !(h >= w.hours[0] && h < w.hours[1]) && 'Not during working hours.',
      run(out) {
        meet(state, content, id, out);
        advance(state, content, w.minutes);
        addStress(state, w.stress);
        p.coin += w.coin;
        r.trust = clamp(r.trust + 6, -100, 100);
        r.familiarity = clamp(r.familiarity + 4);
        out.push(`You work alongside ${person.name}. You earn ${w.coin} coin.`);
        if (p.owes === id) { p.owes = null; out.push(`${person.name} nods. "We're square."`); }
      },
    });
    if (id === 'tobin' && knowsInsight(state, 'i_uphill') && state.people.tobin.practice !== 'deadwood') add({
      id: 'deadwood', group: 'people', person: id, label: 'Ask him to cut only deadwood', minutes: 30,
      disabled: r.trust < DEADWOOD_TRUST && `Tobin needs to trust you more (${Math.round(r.trust)}/${DEADWOOD_TRUST}).`,
      run(out) {
        advance(state, content, 30);
        state.people.tobin.practice = 'deadwood';
        const tp = state.affinity[pairKey('tobin', 'pell')];
        tp.value = clamp(tp.value - 25, -100, 100);
        const ti = state.affinity[pairKey('tobin', 'ilse')];
        ti.value = clamp(ti.value + 25, -100, 100);
        r.trust = clamp(r.trust - 5, -100, 100);
        addNews(state, 'Tobin has started cutting only deadwood. Pell is not pleased about the mill.', ['tobin', 'pell']);
        out.push({ kind: 'choice', text: 'Tobin is quiet for a long time. "Deadwood is half the timber for twice the walking," he says at last. "Pell won\'t thank either of us." But he agrees.' });
      },
    });
  }

  return list;
}

// Run one action by id. Returns the messages it produced.
export function perform(state, content, actionId) {
  const action = getActions(state, content).find((a) => a.id === actionId);
  if (!action) return [{ kind: 'error', text: 'That is no longer possible.' }];
  if (action.disabled) return [{ kind: 'error', text: action.disabled }];
  const out = [];
  action.run(out);
  if (state.player.stress >= 100) rescue(state, content, out);
  for (const m of out) log(state, typeof m === 'string' ? m : m.title ? `${m.title}. ${m.text}` : m.text, typeof m === 'string' ? 'event' : m.kind);
  return out;
}

export { stateLine };
