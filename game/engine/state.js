// Creating, checking and upgrading saves. A save is the whole game state as plain JSON.

export const SAVE_VERSION = 1;

export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function newGame(content, seed = Date.now()) {
  const s = content.start;
  const locations = {};
  for (const [id, loc] of Object.entries(content.locations)) {
    locations[id] = { vegetation: loc.vegetation, disturbance: loc.disturbance };
  }

  const people = {};
  for (const [id, p] of Object.entries(content.people)) {
    people[id] = { loc: null, place: null, knows: [...p.knows], partner: null, practice: null };
  }

  const affinity = {};
  const ids = Object.keys(content.people);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) affinity[pairKey(ids[i], ids[j])] = { value: 0, label: null };
  }
  for (const [a, b, v] of content.affinity) affinity[pairKey(a, b)].value = v;
  // Pairs that already start as friends shouldn't make "became friends" news on day one.
  for (const rec of Object.values(affinity)) {
    if (rec.value >= 40) rec.label = 'friends';
    if (rec.value <= -40) rec.label = 'quarrel';
  }

  const relations = {};
  for (const id of ids) relations[id] = { familiarity: 0, trust: 0, met: false };

  return {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    rng: seed >>> 0,
    minutes: s.minutes,
    player: {
      loc: s.loc, place: s.place,
      stress: s.stress, supplies: s.supplies, coin: s.coin,
      owes: null,
      facts: {},      // fact id -> day learned
      insights: {},   // insight id -> day formed
      heardNews: [],  // news ids already heard
      askedToday: {}, // "person|topic" -> day, to stop farming the same question
    },
    relations,
    people,
    affinity,
    locations,
    innStock: 4,
    flags: {},
    news: [],
    log: [],
    nextId: 1,
  };
}

// Upgrade an older save to the current version. Add a step here whenever the shape changes.
export function migrate(save) {
  if (!save || typeof save !== 'object') throw new Error('Not a Frontier save.');
  if (typeof save.version !== 'number') throw new Error('This save has no version number.');
  if (save.version > SAVE_VERSION) throw new Error('This save is from a newer version of the game.');
  // (No migrations yet: version 1 is the first.)
  return save;
}

export function validate(save, content) {
  const problems = [];
  if (!content.locations[save.player?.loc]) problems.push('player location');
  if (!content.locations[save.player.loc]?.places[save.player.place]) problems.push('player place');
  for (const id of Object.keys(content.people)) if (!save.people[id]) problems.push(`person ${id}`);
  if (!Number.isFinite(save.minutes)) problems.push('clock');
  return problems;
}
