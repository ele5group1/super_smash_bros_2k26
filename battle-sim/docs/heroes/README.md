# Heroes & Combatants Directory

Welcome to the **Puffcap Arena Heroes Directory**. This directory catalogs all 10 original combatants and tactical creatures native to the Puffcap Kingdom arena engine.

Every hero operates deterministically under tick-based resolution rules, governed by base attributes (**HP**, **Attack**, **Speed**), an **Elemental Affinity**, and tactical **Move Pools** that cost coins or execute elemental status effects.

---

## Combatant Roster Overview

| Hero ID | Name | Element | Role | HP | Atk | Spd | Signature Ability / Move |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `ember_fox` | [Ember Fox](file:///docs/heroes/ember_fox.md) | Fire | Burst Striker | 120 | 45 | 65 | Flame Spit & Fire Shield |
| `flame_salamander` | [Flame Salamander](file:///docs/heroes/flame_salamander.md) | Fire | Fire Bruiser | 160 | 52 | 45 | Ember Burst & Heavy Strike |
| `bubble_toad` | [Bubble Toad](file:///docs/heroes/bubble_toad.md) | Water | Tactical Defender | 140 | 38 | 50 | Bubble Barrier & Tidal Surge |
| `stream_turtle` | [Stream Turtle](file:///docs/heroes/stream_turtle.md) | Water | Tank & Sponge | 180 | 35 | 30 | Spout Splash & Defensive Shell |
| `moss_shroom` | [Moss Shroom](file:///docs/heroes/moss_shroom.md) | Grass | Healer & Sustain | 150 | 36 | 40 | Spore Heal & Petal Tempest |
| `bramble_hound` | [Bramble Hound](file:///docs/heroes/bramble_hound.md) | Grass | Speed Skirmisher | 130 | 44 | 58 | Vine Whip & Flank Rush |
| `volt_hedgehog` | [Volt Hedgehog](file:///docs/heroes/volt_hedgehog.md) | Electric | Speed Blitzer | 110 | 48 | 75 | Spark Zap & Thunder Bolt |
| `spark_finch` | [Spark Finch](file:///docs/heroes/spark_finch.md) | Electric | Swift Scout | 105 | 42 | 80 | Charge Dash & First-Strike |
| `crag_golem` | [Crag Golem](file:///docs/heroes/crag_golem.md) | Stone | Juggernaut | 210 | 46 | 25 | Boulder Slam & Rock Armor |
| `pebble_armadillo` | [Pebble Armadillo](file:///docs/heroes/pebble_armadillo.md) | Stone | Armor Vanguard | 170 | 38 | 42 | Pebble Throw & Hazard Armor |

---

## Elemental Affinity Matchups

Elemental interactions apply a **1.5x damage bonus** when attacking an element you counter, and **0.75x damage reduction** when striking a resistant element:

```
    Fire --------> Grass --------> Water --------> Fire
     |               ^               |
     v               |               v
   Stone <------- Electric <------- Stone
```

- **Fire**: Effective against **Grass**; vulnerable to **Water** and **Stone**.
- **Water**: Effective against **Fire** and **Stone**; vulnerable to **Electric** and **Grass**.
- **Grass**: Effective against **Water** and **Stone**; vulnerable to **Fire**.
- **Electric**: Effective against **Water**; vulnerable to **Stone**.
- **Stone**: Effective against **Fire** and **Electric**; vulnerable to **Grass** and **Water**.

---

## Tactical Squad Roles

1. **Strikers & Blitzers** (`ember_fox`, `volt_hedgehog`, `spark_finch`):
   - Fast initiative; eliminate high-threat squishy enemies before they cast crowd-control spells or spend coins.
2. **Bruisers & Frontliners** (`flame_salamander`, `bramble_hound`, `pebble_armadillo`):
   - Balanced survivability and offense. Excel at lane holding and contest tiles.
3. **Tanks & Juggernauts** (`crag_golem`, `stream_turtle`):
   - Maximum health pools. Soak boss specials, lava hazards, and pipe ambush bursts.
4. **Controllers & Supports** (`bubble_toad`, `moss_shroom`):
   - Provide team shielding, direct HP restoration via spores, and status disruption.

---

## Hero Profiles

Click any hero below to inspect complete tactical stat breakdowns, move mechanics, synergies, and counter strategies:

- [Ember Fox Detailed Profile](file:///docs/heroes/ember_fox.md)
- [Flame Salamander Detailed Profile](file:///docs/heroes/flame_salamander.md)
- [Bubble Toad Detailed Profile](file:///docs/heroes/bubble_toad.md)
- [Stream Turtle Detailed Profile](file:///docs/heroes/stream_turtle.md)
- [Moss Shroom Detailed Profile](file:///docs/heroes/moss_shroom.md)
- [Bramble Hound Detailed Profile](file:///docs/heroes/bramble_hound.md)
- [Volt Hedgehog Detailed Profile](file:///docs/heroes/volt_hedgehog.md)
- [Spark Finch Detailed Profile](file:///docs/heroes/spark_finch.md)
- [Crag Golem Detailed Profile](file:///docs/heroes/crag_golem.md)
- [Pebble Armadillo Detailed Profile](file:///docs/heroes/pebble_armadillo.md)
