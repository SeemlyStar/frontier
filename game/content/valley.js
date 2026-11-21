// Slice 1: the valley. Everything here is [Proposed] content, free to change.
// See slices/01-valley.md for the design view of the same data.

export const valley = {
  region: { id: 'vale', name: 'The Vale' },

  start: { loc: 'brookhold', place: 'inn', minutes: 8 * 60, coin: 6, supplies: 3, stress: 15 },

  // Places tagged:
  //   outdoor  - night and danger apply
  //   quiet    - you can reflect here
  //   rest     - you can rest here
  //   bed      - you can pay for a bed
  //   shop     - supplies for sale
  //   forage   - you can forage here
  locations: {
    brookhold: {
      name: 'Brookhold', altitude: 1, vegetation: 40, disturbance: 20, baseline: 20,
      line: 'A village of slate roofs where the river slows.',
      places: {
        inn: {
          name: 'The inn', tags: ['rest', 'bed', 'shop', 'quiet'],
          line: 'Low beams, a long table, a fire that never quite goes out.',
          flavour: 'Someone has carved a mountain into the mantel, with a tiny star scratched at its summit. The wood around the star is worn smooth by thumbs.',
        },
        square: {
          name: 'The square', tags: ['outdoor', 'rest'],
          line: 'A well, a bench, and a view up the valley.',
          flavour: 'From the bench the peak is a pale tooth above the forest. On clear nights, people say, you can see it shine.',
        },
        mill: {
          name: 'The mill', tags: [],
          line: 'The wheel turns steadily. Flour dusts everything.',
          flavour: "Pell's ledger hangs on a nail by the door. Most of the entries are in Tobin's hand: timber, timber, timber.",
        },
        woodyard: {
          name: 'The woodyard', tags: ['outdoor'],
          line: 'Stacked logs, sawdust, the smell of resin.',
          flavour: 'The newest logs weep a faint sap that glows for a moment when you touch it, then fades.',
        },
      },
    },
    meadow: {
      name: 'River meadow', altitude: 1, vegetation: 70, disturbance: 10, baseline: 10,
      line: 'Long grass and slow water, open to the sky.',
      places: {
        fords: {
          name: 'The fords', tags: ['outdoor', 'rest', 'quiet', 'forage'],
          line: 'Stepping stones across a wide, shallow river.',
          flavour: 'Small fish hold still in the current, each with a pale spot on its flank that winks when a shadow passes.',
        },
        reeds: {
          name: 'The reed beds', tags: ['outdoor', 'forage'],
          line: 'Reeds taller than you, whispering.',
          flavour: 'Paths through the reeds are trodden by deer and by Ilse, and they are hard to tell apart.',
        },
      },
    },
    woodland: {
      name: 'Woodland edge', altitude: 2, vegetation: 60, disturbance: 50, baseline: 15,
      line: 'Birch and young oak, thinning where the axes reach.',
      places: {
        clearing: {
          name: 'The clearing', tags: ['outdoor', 'rest', 'quiet', 'forage'],
          line: 'A sunny gap among the birches.',
          flavour: 'Wren has left a cairn of three stones here, with a scrap of paper weighed under the top one. It reads: "N, 2 chains, birch, birch, oak (old)".',
        },
        stand: {
          name: 'The felling stand', tags: ['outdoor'],
          line: 'Stumps in rows, and the brambles pressing in.',
          flavour: 'The brambles here are thicker than anywhere else in the wood, and they grow toward the stumps, not away.',
        },
      },
    },
    forest: {
      name: 'Old forest', altitude: 3, vegetation: 90, disturbance: 10, baseline: 10,
      line: 'Old trees, deep moss, a green dusk even at noon.',
      places: {
        grove: {
          name: 'The deep grove', tags: ['outdoor', 'quiet', 'forage'],
          line: 'A ring of ancient trunks around a mossy floor.',
          flavour: 'The moss gives under your feet and slowly rises again behind you, keeping your footprints for a while like a memory.',
        },
        oak: {
          name: 'The hollow oak', tags: ['outdoor', 'rest'],
          line: 'A vast oak, split open, big enough to shelter in.',
          flavour: 'Inside the hollow someone has slept before you: a ring of stones, old ash, and initials too worn to read.',
        },
      },
    },
    slopes: {
      name: 'Lower slopes', altitude: 4, vegetation: 45, disturbance: 10, baseline: 10,
      line: 'Rough pasture climbing toward scree. The air is thinner.',
      places: {
        hut: {
          name: "The shepherd's hut", tags: ['outdoor', 'rest'],
          line: 'A stone hut, a pen, the sound of bells.',
          flavour: 'Garrow has nailed a row of bleached horns above the door, each one marked with a year.',
        },
        lookout: {
          name: 'The lookout', tags: ['outdoor', 'quiet'],
          line: 'A flat rock with the whole valley below and the peak above.',
          flavour: 'From here Brookhold is a scatter of chimneys. Above, the peak is close enough to see that it is not one summit but many, crowded together.',
        },
      },
    },
  },

  routes: [
    { a: 'brookhold', b: 'meadow', minutes: 30, supplies: 0 },
    { a: 'brookhold', b: 'woodland', minutes: 45, supplies: 0 },
    { a: 'meadow', b: 'woodland', minutes: 40, supplies: 0 },
    { a: 'woodland', b: 'forest', minutes: 60, supplies: 1 },
    { a: 'woodland', b: 'slopes', minutes: 90, supplies: 1 },
    { a: 'forest', b: 'slopes', minutes: 60, supplies: 1, requires: 'i_uphill', name: 'the deer trail' },
  ],

  // Views of the land run from -1 (use it) to 1 (leave it be).
  // Schedules are checked in order; the first match wins. A null place means at home, out of sight.
  people: {
    maren: {
      name: 'Maren', role: 'innkeeper', view: 0, romance: false,
      schedule: [{ hours: [6, 24], at: ['brookhold', 'inn'] }],
      work: { at: ['brookhold', 'inn'], hours: [8, 20], label: 'Wash up and carry casks', minutes: 120, stress: 8, coin: 3 },
      knows: ['f_peak_star'],
      opinion: 'Maren shrugs. "The valley gives, the valley takes. I just keep the fire going."',
    },
    tobin: {
      name: 'Tobin', role: 'woodcutter', view: -1, romance: true,
      schedule: [
        { hours: [7, 9], at: ['brookhold', 'woodyard'] },
        { hours: [9, 16], at: ['woodland', 'stand'], felling: true },
        { hours: [16, 18], at: ['brookhold', 'woodyard'] },
        { hours: [18, 22], at: ['brookhold', 'inn'], social: true },
      ],
      work: { at: ['woodland', 'stand'], hours: [9, 16], label: 'Stack and haul logs', minutes: 180, stress: 14, coin: 4 },
      knows: ['f_brambles'],
      opinion: '"Wood is warmth and bread," Tobin says. "The forest grows back. It always has."',
    },
    ilse: {
      name: 'Ilse', role: 'herbalist', view: 1, romance: true,
      schedule: [
        { hours: [6, 11], at: ['meadow', 'reeds'], gathering: true },
        { hours: [12, 17], at: ['brookhold', 'square'] },
        { hours: [18, 21], at: ['brookhold', 'inn'], social: true, days: { every: 2, offset: 0 } },
      ],
      work: { at: ['meadow', 'reeds'], hours: [6, 11], label: 'Gather herbs', minutes: 90, stress: 6, coin: 2 },
      knows: ['f_old_saying'],
      opinion: '"Take what you need and say thank you," Ilse says. "Most people forget the second part."',
    },
    pell: {
      name: 'Pell', role: 'miller', view: -0.6, romance: true,
      schedule: [
        { hours: [7, 17], at: ['brookhold', 'mill'] },
        { hours: [18, 22], at: ['brookhold', 'inn'], social: true },
      ],
      work: { at: ['brookhold', 'mill'], hours: [7, 17], label: 'Turn sacks and sweep', minutes: 120, stress: 10, coin: 3 },
      knows: [],
      opinion: '"Ask Tobin," Pell says. "He keeps the wheel fed. I just keep the books."',
    },
    garrow: {
      name: 'Garrow', role: 'shepherd', view: 0.8, romance: false,
      schedule: [
        { hours: [18, 22], at: ['brookhold', 'inn'], social: true, days: { every: 4, offset: 1 } },
        { hours: [0, 24], at: ['slopes', 'hut'] },
      ],
      work: { at: ['slopes', 'hut'], hours: [7, 18], label: 'Help move the flock', minutes: 120, stress: 10, coin: 2 },
      knows: ['f_flock'],
      opinion: 'Garrow looks up at the peak for a long time before answering. "It watches. That\'s all I\'ll say."',
    },
    wren: {
      name: 'Wren', role: "surveyor's apprentice", view: 0.2, romance: true,
      schedule: [
        { hours: [8, 13], at: ['meadow', 'fords'], days: { every: 3, offset: 0 } },
        { hours: [13, 17], at: ['woodland', 'clearing'], days: { every: 3, offset: 0 } },
        { hours: [8, 12], at: ['brookhold', 'square'], days: { every: 3, offset: 1 } },
        { hours: [12, 17], at: ['woodland', 'clearing'], days: { every: 3, offset: 1 } },
        { hours: [8, 17], at: ['woodland', 'clearing'], days: { every: 3, offset: 2 } },
        { hours: [18, 21], at: ['brookhold', 'inn'], social: true },
      ],
      work: { at: ['woodland', 'clearing'], hours: [8, 17], label: 'Hold the chain for her survey', minutes: 90, stress: 6, coin: 1 },
      knows: [],
      opinion: '"I\'m mapping all of it," Wren says. "Every stream. Someone should know where things are before they change."',
    },
  },

  // Starting affinity between people (pairs not listed start at 0).
  affinity: [
    ['tobin', 'pell', 45],
    ['ilse', 'tobin', -25],
    ['wren', 'ilse', 30],
    ['maren', 'tobin', 20], ['maren', 'pell', 20], ['maren', 'ilse', 20], ['maren', 'garrow', 25], ['maren', 'wren', 15],
    ['garrow', 'ilse', 20],
  ],

  topics: {
    lights: 'the lights',
    woods: 'the woods',
    slopes: 'the slopes',
  },

  // Facts come from observing (source.observe) or from people who know them (topic).
  // Conditions: night, dusk (17-21), minDisturbance (of this location).
  facts: {
    f_reeds: {
      text: 'At night, the reeds glow pale green where you brush through them.',
      observe: { loc: 'meadow', place: 'reeds', night: true },
    },
    f_amber: {
      text: 'At night, amber light pulses around the fresh stumps.',
      observe: { loc: 'woodland', place: 'stand', night: true, minDisturbance: 35 },
    },
    f_moths: {
      text: 'At dusk, moths gather where the amber was, then fly away uphill.',
      observe: { loc: 'forest', place: 'grove', dusk: true },
    },
    f_line: {
      text: 'At night, a thin line of light runs up the mountainside toward the peak.',
      observe: { loc: 'slopes', place: 'lookout', night: true },
    },
    f_old_saying: {
      text: 'Ilse: the old folk said amber means hurt, and green means all is well.',
      topic: 'lights', minFamiliarity: 15, spreads: true,
    },
    f_brambles: {
      text: 'Tobin: where he fells, the brambles grow back thick and fast, as if the wood fights back.',
      topic: 'woods', minFamiliarity: 15, spreads: true,
    },
    f_flock: {
      text: 'Garrow: the flock won\'t graze the high pasture since the amber spread.',
      topic: 'slopes', minFamiliarity: 20, spreads: true,
    },
    f_peak_star: {
      text: 'Maren: travellers say the peak shines on clear nights, like a star sitting on the mountain.',
      topic: 'slopes', minFamiliarity: 5, spreads: true,
    },
  },

  insights: {
    i_language: {
      name: 'The lights are a language',
      needs: ['f_reeds', 'f_old_saying'],
      text: 'Green means well. Amber means hurt. The valley is talking, and you have begun to read it.',
      unlocks: 'You can now read the lights: observing tells you how dangerous a place is, and you travel more calmly through dangerous ground.',
      question: 'What is the woodland saying?',
      hint: 'The amber is strongest around the felling. Where does it go?',
    },
    i_uphill: {
      name: 'Hurt is carried uphill',
      needs: ['i_language', 'f_amber', 'f_brambles', 'f_moths'],
      text: 'The wood answers the axe with brambles, and the moths carry its amber up the mountain. The hurt does not stay where it happens.',
      unlocks: 'Following the moths, you have found a deer trail from the old forest to the slopes. You could also ask Tobin to cut only deadwood, if he trusts you enough.',
      question: 'Where is the signal going?',
      hint: 'Uphill. Someone on the slopes may have noticed.',
    },
    i_listening: {
      name: 'Something above is listening',
      needs: ['i_uphill', 'f_flock', 'f_line'],
      text: 'Every hurt in the valley is passed upward, light to light, to the peak. Something up there is gathering what the valley says.',
      unlocks: 'This is the end of the first slice. The valley keeps living if you want to stay.',
      question: 'What at the peak is listening, and what does it do with what it hears?',
      hint: 'Beyond the valley. Not yet.',
      endsSlice: true,
    },
  },
};
