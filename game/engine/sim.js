// The world moving on its own: people's routines, their work, their talk, and daily change.

import { chance, between, pick } from './rng.js';
import { day, hour, dailyEnvironment, disturb, clamp } from './world.js';
import { pairKey } from './state.js';

const STEP = 10; // minutes per simulation step
const TALK_CHANCE = 0.12; // per pair, per step, when two people share a place
const GOSSIP_CHANCE = 0.25; // per talk
const INCIDENT_CHANCE = 0.05; // per talk: an unusually good or bad conversation

export function log(state, text, kind = 'event') {
  state.log.push({ id: state.nextId++, minutes: state.minutes, text, kind });
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

export function addNews(state, text, who, where) {
  const item = { id: state.nextId++, minutes: state.minutes, text, who };
  state.news.push(item);
  if (state.news.length > 40) state.news.splice(0, state.news.length - 40);
  // If you are there when it happens, you see it yourself.
  const p = state.player;
  if (where && p.loc === where[0] && p.place === where[1]) {
    p.heardNews.push(item.id);
    log(state, `You see it happen: ${text}`, 'news');
  }
  return item;
}

export function effectiveView(state, content, id) {
  const base = content.people[id].view;
  return state.people[id].practice === 'deadwood' ? -0.3 : base;
}

function slotFor(person, minutes) {
  const h = hour(minutes);
  const d = day(minutes) - 1;
  for (const slot of person.schedule) {
    if (h < slot.hours[0] || h >= slot.hours[1]) continue;
    if (slot.days && d % slot.days.every !== slot.days.offset) continue;
    return slot;
  }
  return null;
}

function placePeople(state, content) {
  const occupied = {}; // "loc/place" -> [ids]
  for (const [id, person] of Object.entries(content.people)) {
    const st = state.people[id];
    const slot = slotFor(person, state.minutes);
    let at = slot ? slot.at : null;
    // People avoid evening haunts where someone they've fallen out with already is.
    if (at && slot.social) {
      const here = occupied[at.join('/')] || [];
      if (here.some((other) => state.affinity[pairKey(id, other)].label === 'quarrel')) at = null;
    }
    st.loc = at ? at[0] : null;
    st.place = at ? at[1] : null;
    st.slot = slot && at ? { felling: !!slot.felling, gathering: !!slot.gathering } : null;
    if (at) (occupied[at.join('/')] ||= []).push(id);
  }
  return occupied;
}

function work(state) {
  const tobin = state.people.tobin;
  if (tobin?.slot?.felling) disturb(state, tobin.loc, (tobin.practice === 'deadwood' ? 0.1 : 0.6) / 6);
  const ilse = state.people.ilse;
  if (ilse?.slot?.gathering) disturb(state, ilse.loc, 0.15 / 6);
}

function talk(state, content, a, b, where) {
  const rec = state.affinity[pairKey(a, b)];
  const pa = content.people[a], pb = content.people[b];
  const compat = 1 - Math.abs(effectiveView(state, content, a) - effectiveView(state, content, b));
  let delta = between(state, -1.5, 2) + compat * 1.2;
  if (rec.label === 'partners') delta += 0.5;
  // Now and then a conversation goes unusually well or badly, so relationships keep moving.
  if (chance(state, INCIDENT_CHANCE)) delta += chance(state, 0.5 + compat * 0.3) ? 10 : -14;
  rec.value = clamp(rec.value + delta, -100, 100);

  const sa = state.people[a], sb = state.people[b];
  const names = `${pa.name} and ${pb.name}`;
  const placeName = content.locations[where[0]].places[where[1]].name.toLowerCase();

  if (rec.label === 'partners' && rec.value < 40) {
    rec.label = null; sa.partner = null; sb.partner = null;
    addNews(state, `${names} are no longer courting.`, [a, b], where);
  } else if (rec.value <= -40 && rec.label !== 'quarrel') {
    if (rec.label === 'partners') { sa.partner = null; sb.partner = null; }
    rec.label = 'quarrel';
    addNews(state, `${names} had a falling-out at ${placeName}.`, [a, b], where);
  } else if (rec.label === 'quarrel' && rec.value > -15) {
    rec.label = null;
    addNews(state, `${names} have made up.`, [a, b], where);
  } else if (pa.romance && pb.romance && rec.value >= 75 && !sa.partner && !sb.partner && rec.label !== 'partners') {
    rec.label = 'partners';
    sa.partner = b; sb.partner = a;
    addNews(state, `${names} are courting.`, [a, b], where);
  } else if (rec.value >= 50 && !rec.label) {
    rec.label = 'friends';
    addNews(state, `${names} have become good friends.`, [a, b], where);
  } else if (rec.label === 'friends' && rec.value < 30) {
    rec.label = null;
    addNews(state, `${names} have drifted apart.`, [a, b], where);
  }

  // Gossip: knowledge spreads between people who talk.
  if (chance(state, GOSSIP_CHANCE)) {
    const [from, to] = chance(state, 0.5) ? [sa, sb] : [sb, sa];
    const shareable = from.knows.filter((f) => content.facts[f]?.spreads && !to.knows.includes(f));
    if (shareable.length) to.knows.push(pick(state, shareable));
  }
}

function socialise(state, content, occupied) {
  for (const [key, ids] of Object.entries(occupied)) {
    if (ids.length < 2) continue;
    const where = key.split('/');
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (chance(state, TALK_CHANCE)) talk(state, content, ids[i], ids[j], where);
      }
    }
  }
}

function daily(state) {
  for (const rec of Object.values(state.affinity)) {
    // Relationships need tending: they settle slowly toward neutral unless people keep talking.
    rec.value -= rec.value * (rec.label === 'partners' ? 0.01 : rec.label === 'quarrel' ? 0.04 : 0.02);
  }
  state.innStock = 4;
}

// Move the world forward. Everyone acts in 10-minute steps.
export function advance(state, content, minutes) {
  let left = minutes;
  while (left > 0) {
    const step = Math.min(STEP, left);
    const before = day(state.minutes);
    state.minutes += step;
    left -= step;
    if (day(state.minutes) !== before) {
      dailyEnvironment(state, content);
      daily(state, content);
    }
    const occupied = placePeople(state, content);
    work(state);
    socialise(state, content, occupied);
  }
}

// Who is at a place right now.
export function peopleAt(state, loc, place) {
  return Object.entries(state.people).filter(([, p]) => p.loc === loc && p.place === place).map(([id]) => id);
}

// Settle positions without passing time (after loading or starting).
export function settle(state, content) {
  placePeople(state, content);
}
