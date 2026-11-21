# Conventions

How this repository is organised and edited. These apply to anyone making changes, including Claude. They follow the Wilderneer repository's conventions where they fit.

## Purpose

- This repository is the master record of Frontier's design and its code.
- Design files record decisions. Suggestions and discussion belong in the conversation or the pull request description.

## Structure

- [README.md](README.md) is the entry point. Every design file is linked from it.
- **Foundations** (`pillars.md`, `setting.md`) say what the game is for.
- **Systems** (`systems/`) hold one game system each, written to be read top to bottom. A file is split only when it clearly holds more than one system.
- **Slices** (`slices/`) describe a playable increment: what it contains, and what it is meant to test.
- **Records**: [rejected.md](rejected.md), [references.md](references.md), [open-questions.md](open-questions.md) and [CHANGELOG.md](CHANGELOG.md).
- **Code**: `game/` holds the engine and content, `tests/` the automated checks. Content (places, people, facts) is data in `game/content/`, kept apart from the engine so it can be read and edited without touching logic.

## Status tags

- Every design statement carries a tag: **[Decided]**, **[Provisional]**, **[Proposed]** or **[Open]**. The legend is in the README.
- Tags apply to individual bullets, not whole files.

## Writing and linking

- **One fact, one place.** Other files link instead of restating.
- Standard relative Markdown links. No `[[wiki links]]`; they don't work on GitHub.
- British spelling.
- Terminology: the world is split into **regions**, a region into **locations**, a location into **places**. **Time** is in-game time. A **slice** is a playable increment of the game.

## When decisions change

- A superseded or rejected idea is removed from its file and recorded in [rejected.md](rejected.md) with a one-line reason.
- When an open question is settled, update the system file and remove the question from [open-questions.md](open-questions.md).

## Workflow

- Changes are proposed as pull requests. One session or one topic per pull request. The title states the change.
- Commit messages describe the decision or feature, not the editing.
- [CHANGELOG.md](CHANGELOG.md) records milestones only. Git history is the detailed record.
