"""Tournament bracket simulation engine for round-robin and single-elimination formats."""

import uuid
from typing import Dict, List, Optional, Any
from app.engine.models import Scenario, Creature
from app.engine.tick import TickEngine
from .models import (
    TournamentSquadModel,
    TournamentMatchModel,
    TournamentRoundModel,
    TournamentReportModel,
)

DEFAULT_TOURNAMENT_SQUADS = [
    {"id": "sq_red_shell", "name": "Red Shell Strikers", "creatures": ["ember_fox", "flame_salamander"]},
    {"id": "sq_phantom", "name": "Phantom Poltergeists", "creatures": ["volt_hedgehog", "crag_golem"]},
    {"id": "sq_thunder", "name": "Thunder Bolts", "creatures": ["spark_finch", "volt_hedgehog"]},
    {"id": "sq_aqua", "name": "Aqua Bastion", "creatures": ["bubble_toad", "stream_turtle"]},
    {"id": "sq_verdant", "name": "Verdant Brambles", "creatures": ["moss_shroom", "bramble_hound"]},
    {"id": "sq_titans", "name": "Seismic Titans", "creatures": ["crag_golem", "pebble_armadillo"]},
    {"id": "sq_hybrids", "name": "Prismatic Duo", "creatures": ["ember_fox", "bubble_toad"]},
    {"id": "sq_sparks", "name": "Skyward Sparks", "creatures": ["spark_finch", "moss_shroom"]},
]


def simulate_tournament(
    scenario: Scenario,
    custom_squads: Optional[List[Dict[str, Any]]] = None,
    seed: int = 1000,
    all_creatures_map: Optional[Dict[str, Creature]] = None,
) -> TournamentReportModel:
    """
    Simulates a full 8-squad single elimination tournament bracket.
    Runs Quarterfinals (4 matches) -> Semifinals (2 matches) -> Grand Finals (1 match).
    Tracks KO statistics, scores, survivors, and declares the tournament champion and MVP.
    """
    cmap = all_creatures_map or {}
    squad_pool = custom_squads or DEFAULT_TOURNAMENT_SQUADS
    # Take first 8 squads
    squad_defs = squad_pool[:8]
    while len(squad_defs) < 8:
        # Fallback if fewer than 8 squads provided
        squad_defs.append(DEFAULT_TOURNAMENT_SQUADS[len(squad_defs) % len(DEFAULT_TOURNAMENT_SQUADS)])

    squads: List[TournamentSquadModel] = [
        TournamentSquadModel(
            id=s["id"],
            name=s["name"],
            creatures=[str(c) for c in s["creatures"]],
        )
        for s in squad_defs
    ]

    rounds: List[TournamentRoundModel] = []
    current_pool = list(squads)
    match_counter = 1
    creature_ko_counts: Dict[str, int] = {}
    runner_up: Optional[TournamentSquadModel] = None

    round_names = ["Quarterfinals", "Semifinals", "Grand Finals"]

    for r_idx, r_name in enumerate(round_names):
        next_pool: List[TournamentSquadModel] = []
        matches: List[TournamentMatchModel] = []

        for i in range(0, len(current_pool), 2):
            squad_a = current_pool[i]
            squad_b = current_pool[i + 1]

            # Build Creature lists for squad_a and squad_b
            team_a = [cmap[cid] for cid in squad_a.creatures if cid in cmap]
            team_b = [cmap[cid] for cid in squad_b.creatures if cid in cmap]

            # If creature not in cmap, fallback lookup
            if not team_a or not team_b:
                from app.storage import db
                if not team_a:
                    team_a = [c for cid in squad_a.creatures if (c := db.get_creature(cid)) is not None]
                if not team_b:
                    team_b = [c for cid in squad_b.creatures if (c := db.get_creature(cid)) is not None]

            # Run deterministic match
            match_seed = seed + match_counter * 37
            engine = TickEngine(
                scenario=scenario,
                player_creatures=team_a,
                enemy_creatures=team_b,
                seed=match_seed,
                personality="opportunistic",
            )
            result = engine.run()

            # Squad A wins if outcome == "win", else Squad B wins
            a_won = result.outcome == "win"
            winner = squad_a if a_won else squad_b
            loser = squad_b if a_won else squad_a
            next_pool.append(winner)

            if r_idx == len(round_names) - 1:
                runner_up = loser

            # Count KOs for MVP tracking
            for ev in result.events:
                if ev.ko and ev.actor:
                    creature_ko_counts[ev.actor] = creature_ko_counts.get(ev.actor, 0) + 1

            score_a = sum(1 for ev in result.events if ev.target in squad_b.creatures and ev.ko)
            score_b = sum(1 for ev in result.events if ev.target in squad_a.creatures and ev.ko)

            summary = (
                f"{winner.name} defeated {loser.name} in {result.ticks_elapsed} ticks "
                f"with {result.survivors} survivor(s) remaining."
            )

            match_model = TournamentMatchModel(
                match_id=f"match_r{r_idx+1}_{i//2+1}",
                round_name=r_name,
                squad_a=squad_a,
                squad_b=squad_b,
                winner_squad=winner,
                score_a=score_a,
                score_b=score_b,
                ticks_elapsed=result.ticks_elapsed,
                survivors=result.survivors,
                summary=summary,
            )
            matches.append(match_model)
            match_counter += 1

        rounds.append(
            TournamentRoundModel(
                round_index=r_idx + 1,
                round_name=r_name,
                matches=matches,
            )
        )
        current_pool = next_pool

    champion = current_pool[0]
    mvp = max(creature_ko_counts.items(), key=lambda kv: kv[1])[0] if creature_ko_counts else "mario"

    return TournamentReportModel(
        tournament_id=f"tourn_{uuid.uuid4().hex[:8]}",
        scenario_id=scenario.id,
        scenario_name=scenario.name,
        champion=champion,
        runner_up=runner_up,
        mvp_creature=mvp,
        total_matches=len([m for r in rounds for m in r.matches]),
        rounds=rounds,
    )
