// Time, environment state and danger.

export const day = (minutes) => Math.floor(minutes / 1440) + 1;
export const hour = (minutes) => Math.floor((minutes % 1440) / 60);
export const isNight = (minutes) => { const h = hour(minutes); return h >= 20 || h < 6; };
export const isDusk = (minutes) => { const h = hour(minutes); return h >= 17 && h < 21; };

export function clockText(minutes) {
  const m = minutes % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `Day ${day(minutes)}, ${hh}:${mm}`;
}

export function partOfDay(minutes) {
  const h = hour(minutes);
  if (h < 5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  return 'night';
}

export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// Danger is worked out, never stored: altitude plus disturbance.
export function danger(state, content, locId) {
  const loc = content.locations[locId];
  return Math.round(clamp(loc.altitude * 10 + state.locations[locId].disturbance * 0.5));
}

export function dangerWord(d) {
  if (d < 20) return 'safe';
  if (d < 35) return 'uneasy';
  if (d < 50) return 'tense';
  return 'dangerous';
}

export function disturb(state, locId, amount) {
  const env = state.locations[locId];
  env.disturbance = clamp(env.disturbance + amount);
}

// Once a day: disturbance settles toward the baseline, vegetation regrows.
export function dailyEnvironment(state, content) {
  for (const [id, loc] of Object.entries(content.locations)) {
    const env = state.locations[id];
    env.disturbance = clamp(env.disturbance - (env.disturbance - loc.baseline) * 0.1);
    const regrow = (loc.vegetation - env.vegetation) * 0.1 * (1 - env.disturbance / 150);
    env.vegetation = clamp(env.vegetation + regrow);
  }
}

// A short reading of how a place is right now, so the same place reads differently over time.
export function stateLine(state, content, locId, placeId, readsLights) {
  const loc = content.locations[locId];
  const place = loc.places[placeId];
  const env = state.locations[locId];
  const night = isNight(state.minutes);
  const parts = [];
  if (place.tags.includes('outdoor')) {
    if (env.disturbance >= 45) parts.push(night ? 'Amber flickers low among the undergrowth.' : 'The ground is churned and the birds are quiet.');
    else if (env.disturbance >= 25) parts.push(night ? 'A few lights blink, uncertain.' : 'There are signs of people working nearby.');
    else parts.push(night ? 'Faint green lights drift in the dark, unhurried.' : 'It is quiet and undisturbed.');
    if (env.vegetation < loc.vegetation - 15) parts.push('The growth is thinner than it should be.');
  } else if (night) {
    parts.push('Lamplight, and the dark pressing at the windows.');
  }
  if (readsLights && place.tags.includes('outdoor')) {
    parts.push(`Reading the lights: this ground feels ${dangerWord(danger(state, content, locId))} (danger ${danger(state, content, locId)}).`);
  }
  return parts.join(' ');
}
