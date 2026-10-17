# Scenario Battle Simulator: Concept

## Core idea

Battles are driven by scenarios, not fixed encounters. A scenario defines the situation (a castle siege, a pipe-network ambush, a race against a timer), the environment, the objectives, and the forces on each side. The simulator resolves battles from those rules, so the same creatures produce different outcomes in different scenarios. Players learn to read situations, not just memorize type charts.

## Three layers of mechanics

1. Creature layer (Pokémon-style): types, stats, moves, status effects. Type matchups, speed ordering, and status conditions.
2. Environment layer (Mario-style): hazards and interactables such as warp pipes that move creatures between zones, projectiles on timers, falling platforms, coin pickups that fund moves, and question blocks that release power-ups.
3. Power-up layer: temporary modifiers, such as a damage boost, a short invulnerability window, or a flight effect that avoids ground hazards.

## Simulation engine

- Scenario schema: each scenario is a data file with map layout, hazard schedule, win conditions, starting resources, and enemy composition. Designers author scenarios without touching engine code.
- Tick-based resolution: battles advance in fixed ticks. Each tick, creatures act by speed, hazards fire on schedule, and power-up timers decrement. Seeded ticks keep results deterministic and replayable.
- Decision AI: opponents have personality profiles (aggressive, defensive, opportunistic, scripted boss) that weight move and positioning choices. The AI reads the same state the player sees.
- Outcome report: every battle ends with a log explaining why it was won or lost.

## Example scenario: Pipe Ambush

- Setup: a team of four enters a warp-pipe network. Two pipes start open, and more open every 10 ticks.
- Hazards: a fire-breathing boss patrols one lane. Biter plants grow from pipes and attack nearby creatures.
- Win condition: reach the exit pipe with at least two creatures alive.
- Choices: spend coins now on healing, or save them for a power-up block? Fight the boss, or slip past while it is distracted?

## Modes

- Simulate: pick a scenario and team, watch the result, read the log.
- Plan: set team orders and placements, then compare outcomes across seeds.
- Author: build and test scenarios with the same schema the official ones use.

## Open questions

- Real-time vs. turn-based presentation for players.
- How often environment should override type advantages.
- Whether clearing with fewer losses should score higher.
- IP: prototypes should use original characters, creatures, and names.
