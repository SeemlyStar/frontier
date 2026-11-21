# World, travel and time

## Structure

- The world is split into three tiers: **region → location → place**. **[Decided]**
- Moving between places inside a location is quick (5 minutes). **[Proposed]**
- Travelling between locations follows **routes**. Each route has a duration and a supply cost. Some routes are hidden until you learn they exist. **[Proposed]**

## Time

- Time is stored as total minutes elapsed since the start of the game. **[Provisional]** (carried from the Godot prototype)
- Every action costs time. The world simulates in 10-minute steps while time passes, so people move and talk during your actions. **[Proposed]**
- Night runs from 20:00 to 06:00. Travelling or working outdoors at night adds stress. **[Proposed]**
- Seasons and weather. **[Open]**

## Environment state (per location)

- Each location has an **altitude** (fixed), **vegetation** and **disturbance**. **[Decided]**
- **Danger** is worked out from altitude and disturbance, not stored. **[Decided]**
  - Proposed formula: danger = altitude × 10 + disturbance × 0.5, on a 0–100 scale. **[Proposed]**
- Disturbance rises when people (you or anyone else) take from a place, for example foraging or felling. Each day it settles back by 10% toward the location's baseline. **[Proposed]**
- Vegetation regrows toward its natural level each day, more slowly while disturbance is high. **[Proposed]**
- What you observe in a place depends on its state, so the same place reads differently over time. **[Proposed]**

## Watch in playtesting

- Does disturbance from other people's work (not just yours) give the world a visible life of its own?
- Is the danger formula readable enough that you can predict it once you understand the world?
