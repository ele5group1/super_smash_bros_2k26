# Combat rules (rules_version 1.0)

## Match structure

- Two players, each drafts 3 distinct characters from 5 of their faction, total cost at most 12.
- Each team has one active fighter at a time. The other two wait on the bench.
- Each turn, both players secretly lock one action per active fighter. Actions resolve simultaneously.

## Actions

| Action | Energy | Effect |
|---|---|---|
| Attack | 0 (gain 1, cap 3) | Deal max(1, ATK + 4 − target DEF) physical damage |
| Defend | 0 (gain 1, cap 3) | Reduce incoming damage this turn by 60%: received = ceil(raw × 0.40) |
| Special | Costs 2 | Use the character's special (see `02_roster.md`). Gains no energy. Rejected if energy < 2 |

- Each active fighter starts with 1 energy.
- No random damage, critical hits, misses, type charts, or manual swaps.

## Resolution order

1. Validate both locked actions against the current state.
2. Spend energy for specials.
3. Establish guards (Defend) and evasion (Storm Dash, Quick Spark, Green-style evasion).
4. Compute each effect from the start-of-turn state. Equal-priority effects use the same snapshot.
5. Apply shields before HP.
6. Apply all HP deltas together. Healing never exceeds max HP.
7. Resolve faints. Simultaneous lethal blows faint both fighters.
8. Send the turn event.

Speed only breaks explicitly ordered special-effect ties. It does not change damage.

## State rules

- HP clamps to [0, max HP]. Energy clamps to [0, 3].
- Shields absorb damage before HP. A shield persists until consumed and resets when its fighter faints.
- A fighter at 0 HP still executes an already-locked action, unless that action is explicitly cancelled.
- After a faint, the next surviving bench fighter enters at the start of the next turn.

## Ending a match

- Victory: one side has no living fighters after a turn resolves.
- Double elimination on the same turn is a recorded draw, and the room offers a rematch.
- Sudden death: from turn 20, if both sides survive, each turn deals 8 unavoidable damage to both active fighters after action resolution. The damage increases by 4 each turn.
- Hard stop at turn 25. Compare, in order: fighters remaining, total remaining HP fraction (sum of HP / max HP), total damage dealt. An exact tie is a draw.

## Timers

- Draft: 30 s. Lineup lock: 10 s. Each turn: 8 s.
- On a turn timeout, every unlocked fighter defaults to Defend. The timeout is logged.

## Disconnects

- Hold the player's state for 20 s.
- After 20 s, auto-Defend each turn until reconnect.
- Forfeit after 60 s total. Show the disconnect status to all players.
- Never award a win silently when a server restarts.

## Worked example

Ember Knight (ATK 10, energy 2, HP 40) locks Attack. Stormfox (DEF 3, energy 2, HP 32) locks Storm Dash.
- Attack raw damage: 10 + 4 − 3 = 11. Stormfox's Storm Dash deals 11 and grants Evasion.
- Evasion negates Ember Knight's 11 damage.
- Stormfox spends 2 energy and ends at 0. Ember Knight gains 1 energy and ends at 2 (its Attack gains 1 energy).
- The result comes from both locked actions applied to the same start-of-turn snapshot.

## Edge cases

- Duplicate locks from one player: accept the first valid lock for the turn and reject the rest.
- A special without enough energy: reject it and prompt the player to choose Attack or Defend. A timeout falls back to Defend.
- Healer at full HP: heal amount is zero, but the shield still applies, and the action still costs energy.
