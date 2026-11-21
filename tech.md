# Tech: build, saving and data

## Platform

- Frontier is built as a web page and published as a Claude artifact, so it plays in a browser on laptop and phone. **[Decided]**
- The earlier Godot/C# prototype stays separate, as a learning project. **[Decided]**

## Published build

- Artifact slug: `b0d5aff6-7387-4ab4-8b08-d67e9c0e169d` ("Frontier: the valley"). Republish `dist/index.html` to this artifact; don't create a new one, or the saves stored with it are left behind.
- Declared capabilities: `db` (saves at `saves/<player id>`, readable by the owner so Claude can inspect a save when debugging), `user`, `downloads`.

## Code layout

- `game/engine/`: the simulation (time, world, people, investigation, actions). Plain JavaScript modules with no browser code, so the tests can run it directly.
- `game/content/`: the valley as data (places, routes, people, facts, insights). Changing content shouldn't need engine changes.
- `game/ui/`: the page (rendering and input).
- `tests/`: automated checks. `npm test` runs the engine through long stretches of simulated time and checks it stays sane.
- `npm run build` bundles everything into one file, `dist/index.html`, which is what gets published.

## Saving

- A save is the whole game state as one JSON document: the clock, your character, each location's environment, each person's state and relationships, your journal and the random-number seed. **[Proposed]**
- Saves are stored on the artifact's server storage, tied to your Claude account, so they survive clearing the browser and follow you between devices. The game autosaves after every action. **[Proposed]**
- You can also download a save file and load one back, as a backup you hold yourself. **[Proposed]**
- The save has a version number, so older saves can be upgraded when the game changes. **[Proposed]**
- A separate online save service, if ever needed, would store the same document. **[Open]**

## Randomness

- All randomness comes from a seeded generator stored in the save, so a situation can be reproduced exactly when something needs debugging. **[Proposed]**
