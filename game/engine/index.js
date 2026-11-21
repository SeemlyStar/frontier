// The engine's public surface. No browser code lives in the engine.
export { newGame, migrate, validate, SAVE_VERSION, pairKey } from './state.js';
export { advance, settle, peopleAt, effectiveView } from './sim.js';
export { getActions, perform, band, MAX_SUPPLIES } from './actions.js';
export { clockText, partOfDay, isNight, danger, dangerWord, stateLine, day, hour } from './world.js';
