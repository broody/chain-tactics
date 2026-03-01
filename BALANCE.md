# Hashfront — Balance Reference

Source of truth for unit stats, terrain modifiers, and combat rules.
Contracts (`contracts/src/helpers/unit_stats.cairo`) must match these values.

---

## Units

| | Infantry | Tank | Ranger |
|---|:---:|:---:|:---:|
| **HP** | 3 | 5 | 3 |
| **ATK** | 2 | 4 | 3 |
| **Move** | 4 | 2 | 3 |
| **Range** | 1 | 1 | 2–3 |
| **Cost** | 1 | 4 | 2 |
| **Accuracy** | 90 | 85 | 88 |

### Abilities

| | Infantry | Tank | Ranger |
|---|:---:|:---:|:---:|
| **Capture** | yes | — | yes |
| **Mountains** | yes | — | — |
| **Road Bonus** | — | +2 | +2 |
| **Attack After Move** | yes | yes | — |

---

## Terrain

| Tile | Move Cost | Defense | Evasion |
|---|:---:|:---:|:---:|
| Grass | 1 | 0 | 0 |
| Road | 1 | 0 | 0 |
| DirtRoad | 1 | 0 | 0 |
| Tree | 1 | 1 | 5 |
| City | 1 | 1 | 8 |
| Factory | 1 | 1 | 8 |
| HQ | 1 | 2 | 10 |
| Mountain | 2 | 2 | 12 |
| Ocean | — | 0 | 0 |

Traversal restrictions: Mountains = Infantry only. Ocean = impassable (future: air/naval).

---

## Combat

```
hit_chance = clamp(75, 95, base_accuracy - terrain_evasion - move_penalty - range_penalty)
damage     = max(attack_power - terrain_defense, 1)
```

| Modifier | Value | Condition |
|---|:---:|---|
| Move penalty | 5 | Attacker moved this turn |
| Range penalty | 5 | Ranger attacking at range 3 |

**Graze**: On miss, deal 1 damage — but only if `damage >= 2`. Otherwise true whiff (0).

**Counterattack**: If defender survives and attacker is within defender's range, defender counterattacks (same formula, move_penalty = 0, uses attacker's terrain for evasion/defense).
