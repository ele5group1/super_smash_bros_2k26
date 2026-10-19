# Antigravity build prompt: Boo Bash Arena

Build "Boo Bash Arena": a strict 8-bit, Halloween-themed, turn-based 3v3 multiplayer arcade game. It runs on three connected devices: two playable terminals (phones, tablets, or laptops) and one live control and analytics dashboard. Use original characters, creatures, names, art, and music only. Do not use any Nintendo or Pokémon characters, logos, names, or copyrighted assets, and do not imitate their title-screen logos or copyright lines.

## Visual direction

- Strict 8-bit, NES-era. Build all sprites, tiles, boxes, and sounds from scratch.
- Logical resolution 256x144, integer-scaled, nearest-neighbor, letterboxed. No antialiasing. Align UI to an 8-pixel grid.
- At most 16 colors on screen. At most 3 colors plus transparency per sprite and per background tile.
- Halloween palette: midnight #1B1530, purple #5B3B8C, pumpkin #E8862E, eerie mint #8FD9A0, cream #F2E2C4, danger red #C94A52, plus black and white.
- No gradients, shadows, glow, or blur.
- Title screen: bitmap-style "BOO BASH ARENA" logo, drifting original ghosts, bordered frame with pumpkin and star tiles, blinking "PRESS START".
- Battle screen: side-view stage. Opponent status plate upper-left, player plate lower-right, full-width command box at the bottom. The command box is the action menu, and in analytics mode it shows the adviser's estimated win rate per option.
- Fighter sprites up to 32x32. Idle 2 frames at 4 fps, attack 3 frames, hurt 1 frame, faint 3 frames, victory 2 frames.
- Audio: two-channel chiptune (pulse, triangle, noise) via the Web Audio API. No sample files. Separate music and SFX mute. Reduced motion turns off shake and flashes but keeps HUD updates.

## Mobile

- Phones are playable terminals. Support portrait and landscape.
- Battle view shows a "rotate for battle" prompt in portrait. Lobby and draft work in portrait.
- Command box rows at least 44 px tall. Draft cards scroll horizontally inside their own container.
- No page scroll, pinch zoom, or pull-to-refresh during battle. Respect safe-area insets.
- Test at 390x844 and 844x390. The dashboard collapses into stacked panels and is read-only on a phone.

## Factions and roster

Faction A: Lantern Court. Faction B: Crypt Court.

| Role | Faction A | Faction B | HP | ATK | DEF | SPD | Cost | Special (2 energy) |
|---|---|---|---|---|---|---|---|---|
| Balanced | Ember Knight | Cinder Drake | 40 | 10 | 5 | 5 | 4 | Cinder Burst: 14 fixed fire damage; guard reduces it normally |
| Tank | Mossbrute | Dozeback | 52 | 8 | 8 | 2 | 5 | Boulder Slam / Body Blow: 11 damage; gain 6 shield (max 6) |
| Speed | Stormfox | Sparkpup | 32 | 9 | 3 | 9 | 3 | Storm Dash / Quick Spark: 11 damage; gain Evasion (negates the next attack or special packet this turn, once) |
| Support | Bloom Medic | Mellowbun | 36 | 7 | 5 | 5 | 3 | Bloom Remedy / Soft Rest: heal self 13 HP; gain 3 shield (max 6) |
| Trickster | Hexling | Shade Grin | 34 | 9 | 4 | 7 | 4 | Hex Prank / Shadow Trick: 8 damage; drain 1 enemy energy (floor 0); restore own energy after paying |

Each team drafts exactly 3 distinct characters with total cost at most 12. Use only these cost values.

## Locked rules (rules_version 1.0)

- Each turn, both players secretly lock one action per active fighter: Attack, Defend, or Special. Actions resolve simultaneously.
- Attack: max(1, ATK + 4 − target DEF) damage. Gain 1 energy (cap 3).
- Defend: reduce incoming damage this turn by 60%, rounded up (received = ceil(raw × 0.40)). Gain 1 energy (cap 3).
- Special: costs 2 energy, rejected if energy is below 2. Gains no energy.
- Each active fighter starts with 1 energy. No random damage, critical hits, misses, type charts, or manual swaps.
- Resolution order: validate → spend energy → establish guards and evasion → compute effects from the start-of-turn snapshot → apply shields before HP → apply all HP deltas together → resolve faints → send events.
- HP clamps to [0, max HP]. Energy clamps to [0, 3]. Healing never exceeds max HP.
- Shields persist until consumed and reset on faint. A fighter at 0 HP still executes its locked action.
- Simultaneous lethal blows faint both fighters. After a faint, the next surviving bench fighter enters at the start of the next turn.
- Victory: one side has no living fighters after a turn. Double elimination on the same turn is a recorded draw.
- Sudden death: from turn 20, if both survive, each turn deals 8 unavoidable damage to both active fighters after action resolution, increasing by 4 each turn.
- Hard stop at turn 25: compare fighters remaining, then total HP fraction, then total damage dealt. Exact tie is a draw.
- Timers: draft 30 s, lineup 10 s, each turn 8 s. Timeout defaults to Defend and is logged.
- Disconnect: hold state for 20 s, auto-Defend until reconnect, forfeit after 60 s. Show the status to all players. Never award a win silently on restart.

## Session flow and network

- Phase machine: LOBBY → FACTION_LOCK → DRAFT → LINEUP_LOCK → BATTLE → RESULT → REMATCH or LOBBY. Reject messages that do not match the phase.
- Room codes: 6 random characters with collision checks. Reconnect tokens: 128 bits.
- Never broadcast a locked action until both are locked or timed out. Reject duplicate locks, stale turns, and replays using monotonic turn numbers and request IDs.
- Schema validation on every message. Per-socket rate limits. Cross-room isolation.
- Stack: Node.js with TypeScript, Phaser client, Socket.IO, SQLite in WAL mode. The server is authoritative. Clients never submit HP or winners.

## Analytics

Every panel labels data as Actual or Simulated. Never blend them silently. Label any group with n < 20.

- Descriptive: match totals, faction win rates, draw rate, turns, durations (median and 95th percentile), role pick rates, composition win rates. Wilson 95% intervals.
- Diagnostic: outcomes by first lead, role combinations, first three turns, timeouts, and opponent role matchups, with sample sizes. Use "associated with," never "caused by."
- Predictive:
  - Draft model: logistic regression on role indicators, point totals, lead role, and faction. Target: whether Faction A won. Exclude draws.
  - Mid-battle model: turn number, alive counts, normalized HP, shields, energy, active roles, relative speed. Use only information known at prediction time.
  - Evaluation: split by match ID, 70/15/15, fixed seed. Report accuracy, Brier score, ROC AUC where both classes exist, and calibration bins. Compare against a majority-class baseline and an HP-advantage heuristic. Store model_version, training size, split seed, and metrics. Show simulation-derived estimates labeled as such until there is enough real data.
- Prescriptive draft recommender: enumerate the 60 ordered trios per faction that fit the budget of 12. Estimate each win rate with 200–1000 seeded simulated matches against the opponent's known faction and draft, using a fixed opponent policy and shared seeds. Rank by win rate, then lower cost, then alphabetical ID. If the opponent's lineup is hidden, average over plausible legal lineups. Show "insufficient evidence" when results vary too much. The recommender suggests and never forces a choice.
- Export matches and actions as CSV, with the formula-injection guard.

## Data

- Log every draft, lineup, turn choice, timeout, effect, HP and energy change, knockout, and outcome, with timestamps.
- Tables: matches, players, drafted_characters, turns, actions, predictions, recommendations. Add indexes and a schema version. Each match writes atomically.
- Anonymous player IDs and optional nicknames only. No passwords. Provide a way to delete exhibition data.
- Simulated batches use source = "simulated", separate from actual matches.

## Tests

- Combat: damage formula, guard rounding, shield absorption, heal cap, energy cap, drain floor, evasion, simultaneous lethal blows.
- Draft: 3 distinct picks, correct faction, legal lineup, budget rejection, all 60 permutations.
- Network: secret choices, duplicate locks, stale turns, reconnect, timeout default, cross-room isolation.
- Database: atomic writes, migrations, recovery after an interrupted session.
- Analytics: known fixtures, no train/test leakage, valid Wilson intervals, CSV round trip.
- Balance: at least 10,000 seeded simulations with randomized legal drafts. Report faction, role, and draw rates, first-player advantage, median and 95th-percentile turns. Design goal: Faction A win rate between 47% and 53%.
- Playtest: 10–20 human pilot games. Adjust numbers only with a rules_version bump.

## Deliverables

1. The repository, running with one command. Phaser client at http://SERVER_LAN_IP:3000 and dashboard at /dashboard.
2. Three-device rehearsal notes, a QR code for the local URL, and an offline setup that works without internet.
3. README with setup, rules, and phase machine. A brief system document covering data sources, three-device setup, analytics methods, and known limits.
4. All tests passing and a balance report.

## Build order

Headless combat engine with tests → Socket.IO rooms and secret-action protocol → lobby and draft → Phaser battle HUD and animations → persistence, results, CSV export → simulation, baseline prediction, recommender → balance tests and model evaluation → network and reconnect tests → three-device rehearsal and documentation.

Scope guard: if time runs short, cut animation variety first. Do not cut three-device sync, recorded data, or the prescriptive recommender. At the end, run the tests, start the three-device setup, and report what works, what was not verified, and what was cut.
