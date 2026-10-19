# Boo Bash Arena

A strict 8-bit, Halloween-themed, turn-based 3v3 multiplayer arcade game for a three-device exhibition booth. Two playable terminals (phones, tablets, or laptops) and one control device (live dashboard and analytics) run on the same local network.

This package is the design specification. It is not a finished or play-tested build.

## Contents

- `docs/01_rules.md`: locked combat rules (rules_version 1.0), turn resolution, sudden death, timers
- `docs/02_roster.md`: factions, five roles, stats, costs, and specials
- `docs/03_architecture.md`: session flow, network protocol, database schema, folder layout, security
- `docs/04_analytics.md`: descriptive, diagnostic, predictive, and prescriptive analytics, with evaluation methods
- `docs/05_visual_direction.md`: 8-bit style rules, title and battle screens, audio, mobile layout
- `docs/06_schedule_and_roles.md`: Oct 19–27 build schedule, group roles, booth checklist, and open decisions
- `prompts/antigravity_build_prompt.md`: the complete build prompt to paste into Antigravity

## Known issues to resolve before building

- Turn timer: the original blueprint used 12 s per turn, which made the worst-case match exceed five minutes. This package uses 8 s.
- Cost table: the original blueprint listed two cost sets. This package uses costs 4/5/3/3/4 for Balanced/Tank/Speed/Support/Trickster.
- Names: the original blueprint used Nintendo and Pokémon characters. Every character here is original. Do not reintroduce those names, logos, or assets.
- Balance numbers are assumptions. They must be tested with simulation (at least 10,000 seeded matches) and human pilot games before the exhibition.

## Using the prompt

Paste `prompts/antigravity_build_prompt.md` into Antigravity. Attach nothing else, so the protected names from the original blueprint never reach the builder.
