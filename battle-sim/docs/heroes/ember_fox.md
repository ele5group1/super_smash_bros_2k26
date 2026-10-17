# Ember Fox (`ember_fox`)

**Role**: Burst Striker  
**Affinity**: Fire  
**Tier**: High Initiative Carry  
**Source**: Built-in Core Roster

---

## Base Attributes

| Attribute | Base Value | Rating | Tactical Impact |
| :--- | :---: | :---: | :--- |
| **HP** | 120 | Moderate | Fragile if targeted by water or stone heavy-hitters. |
| **Attack** | 45 | High | Deals swift, punishing burst damage across all lanes. |
| **Speed** | 65 | Very High | Consistently secures early-tick initiative before enemy moves. |

---

## Tactical Move Pool

### 1. `flame_spit`
- **Type**: Fire
- **Power**: 25
- **Accuracy**: 95%
- **Coin Cost**: 0
- **Effect**: Burn (25% chance)
- **Description**: Rapid projectile of flame that tests enemy defenses and applies lingering heat damage.

### 2. `ember_burst`
- **Type**: Fire
- **Power**: 40
- **Accuracy**: 85%
- **Coin Cost**: 2 coins
- **Effect**: High-impact elemental eruption.
- **Description**: Consumes 2 tactical coins to release an explosive fireball capable of finishing weakened frontliners.

### 3. `fire_shield`
- **Type**: Fire
- **Power**: 0 (Defensive Buff)
- **Accuracy**: 100%
- **Coin Cost**: 1 coin
- **Effect**: Shield (100% chance, 1 tick duration)
- **Description**: Envelops Ember Fox in a ring of protective embers, deflecting the next incoming blow.

---

## Synergies & Team Compositions

- **Optimal Partner**: `bubble_toad` (Water) or `moss_shroom` (Grass).
  - Bubble Toad's barrier negates Ember Fox's low HP vulnerability.
  - Moss Shroom cleanses debuffs and heals through long endurance trials.
- **Best Against**: Grass-type combatants (`moss_shroom`, `bramble_hound`) and low-armor backline snipers.
- **Weak Against**: Stone tanks (`crag_golem`, `pebble_armadillo`) and heavy water bruisers (`stream_turtle`).

---

## AI Decision Behavior

When controlled by the Opportunistic AI (`AIDecisionMaker`):
- If coins $\ge 2$ and an enemy target HP is $< 50$, Ember Fox evaluates `ember_burst` with an aggressive $+15$ kill-pressure priority bonus.
- If Ember Fox HP drops below $30\%$, it scores `fire_shield` at high tactical value to ensure round survival.
