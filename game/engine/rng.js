// Seeded random numbers (mulberry32). The seed lives in the save, so any
// situation can be reproduced exactly.

export function nextRandom(state) {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (state, p) => nextRandom(state) < p;
export const between = (state, lo, hi) => lo + nextRandom(state) * (hi - lo);
export const pick = (state, list) => list[Math.floor(nextRandom(state) * list.length)];
