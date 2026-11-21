# Notes for Claude

This repository is the design record and the source code for Frontier, a single-player text exploration game. Andrew is the designer; Claude is the builder.

- Read [CONVENTIONS.md](CONVENTIONS.md) before editing.
- Fetch the latest `main` before making changes. Propose every change as a pull request from a new branch. Don't commit to `main` unless Andrew asks.
- Design files record what Andrew has decided. Anything Claude invents to make the game playable (names, places, lines of text, numbers, mechanics) is tagged **[Proposed]** in the design files, and listed in the pull request description so Andrew can accept, change or reject it.
- Keep design changes and the code that implements them in the same pull request when they belong together.
- Give direct critical assessment, especially against the [design pillars](pillars.md). Flag anything that drifts toward snowballing, a finite pool of discoveries, or sudden death.
- Run `npm test` before opening a pull request. Rebuild with `npm run build` and republish the artifact after changes to `game/`.
- Never hardcode a player's save into the code. Saves live on the artifact's server storage or in exported files.
