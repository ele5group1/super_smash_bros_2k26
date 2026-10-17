"""Pydantic models for the battle simulation analytics layer."""

from __future__ import annotations
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field


# --- Descriptive Analytics Models ---

class BattleSummaryModel(BaseModel):
    battle_id: str
    scenario_id: str
    outcome: Literal["win", "loss"]
    ticks_elapsed: int
    survivors: int
    coins_left: int
    objective_status: str
    summary_sentence: str


class CreatureStatsModel(BaseModel):
    id: str
    name: Optional[str] = None
    damage_dealt: int = 0
    damage_taken: int = 0
    kos: int = 0
    ticks_spent_in_hazard_zones: int = 0
    status_effects_applied: int = 0
    survival: bool = True
    final_hp: int = 0


class TeamStatsModel(BaseModel):
    scenario_id: str
    team: List[str]
    sample_count: int
    win_rate: float
    win_rate_percent: float
    avg_ticks_to_victory: float
    avg_survivors: float
    avg_coins_left: float


class HPTimelinePointModel(BaseModel):
    tick: int
    coins: int
    creatures: Dict[str, int]
    hazard_events: List[str] = Field(default_factory=list)
    ko_events: List[str] = Field(default_factory=list)
    key_events: List[str] = Field(default_factory=list)


class HPTimelineModel(BaseModel):
    battle_id: str
    ticks: List[HPTimelinePointModel]


class PositionHeatmapCellModel(BaseModel):
    lane: int
    tile: int
    time_spent: int = 0
    kos: int = 0
    damage: int = 0


class PositionHeatmapModel(BaseModel):
    lanes: int = 3
    tiles: int = 8
    grid: List[List[PositionHeatmapCellModel]]
    hottest_cells: List[Dict[str, Any]] = Field(default_factory=list)
    text_summary: str


# --- Diagnostic Analytics Models ---

class CauseTraceEventModel(BaseModel):
    tick: int
    event_id: Optional[str] = None
    category: str
    description: str
    target: Optional[str] = None
    damage: Optional[int] = None


class CauseTraceModel(BaseModel):
    battle_id: str
    is_defeat: bool
    earliest_pivotal_tick: Optional[int] = None
    root_cause: Optional[str] = None
    explanation: str
    events: List[CauseTraceEventModel] = Field(default_factory=list)


class LossCauseShareModel(BaseModel):
    cause: str
    count: int
    share_percent: float
    description: str


class LossCausesReportModel(BaseModel):
    scenario_id: Optional[str] = None
    source: str
    total_losses_analyzed: int
    causes: List[LossCauseShareModel] = Field(default_factory=list)
    primary_cause: Optional[str] = None


class DecisionAuditItemModel(BaseModel):
    tick: int
    actor: str
    chosen_action: str
    chosen_score: float
    best_action: str
    best_score: float
    score_gap: float
    flagged: bool = True
    options_considered: List[Dict[str, Any]] = Field(default_factory=list)


class DecisionAuditReportModel(BaseModel):
    battle_id: str
    threshold: float
    total_decisions: int
    flagged_decisions_count: int
    decisions: List[DecisionAuditItemModel] = Field(default_factory=list)


class CauseTraceDiffModel(BaseModel):
    original_pivotal_tick: Optional[int] = None
    new_pivotal_tick: Optional[int] = None
    original_cause: Optional[str] = None
    new_cause: Optional[str] = None
    explanation: str


class CounterfactualResponseModel(BaseModel):
    original_battle_id: str
    new_battle_id: str
    seed: int
    outcome_changed: bool
    original_outcome: str
    new_outcome: str
    first_divergent_tick: Optional[int] = None
    ticks_diff: int
    survivors_diff: int
    coins_diff: int
    cause_trace_diff: Optional[CauseTraceDiffModel] = None
    new_battle: Optional[Any] = None


# --- Predictive Analytics & Calibration Models ---

class CalibrationModel(BaseModel):
    upload_id: Optional[str] = None
    simulated_win_rate: float
    simulated_win_rate_percent: float
    simulated_interval: float
    uploaded_win_rate: Optional[float] = None
    uploaded_win_rate_percent: Optional[float] = None
    uploaded_interval: Optional[float] = None
    gap: Optional[float] = None
    gap_percent: Optional[float] = None
    gap_exceeds_interval: bool = False
    uploaded_samples: int = 0
    mismatched_samples_excluded: int = 0
    note: str


class WinRatePredictionModel(BaseModel):
    scenario_id: str
    team: List[str]
    seed_count: int
    base_seed: int
    win_rate: float
    win_rate_percent: float
    confidence_interval_95: float
    confidence_interval_percent: float = 0.0
    interval_method: Literal["normal", "wilson"]
    ci_lower: float
    ci_upper: float
    survivor_distribution: List[int]
    survivor_distribution_percent: List[float]
    avg_coins_left: float
    avg_ticks: float
    calibration: Optional[CalibrationModel] = None


class StatePredictionModel(BaseModel):
    current_tick: int
    seed_count: int
    predicted_win_rate: float
    predicted_win_rate_percent: float
    confidence_interval_95: float
    ci_lower: float
    ci_upper: float
    visible_allies_alive: int
    visible_enemies_alive: int


# --- Prescriptive Analytics Models ---

class PlanCompareResultModel(BaseModel):
    name: str
    team: List[str]
    early_heal_spend: int = 0
    win_rate: float
    win_rate_percent: float
    confidence_interval_95: float
    ci_lower: float
    ci_upper: float
    avg_survivors: float
    avg_coins_left: float


class RecommendedActionModel(BaseModel):
    action: str
    predicted_win_rate: float
    predicted_win_rate_percent: float
    confidence_interval_95: float
    ci_lower: float
    ci_upper: float
    explanation: str


class RecommendationReportModel(BaseModel):
    scenario_id: str
    team: List[str]
    top_recommendations: List[RecommendedActionModel] = Field(default_factory=list)
    summary_advice: str
    best_spend: Optional[int] = 0
    best_win_rate_percent: Optional[float] = 0.0
    explanation: Optional[str] = ""
    options: Optional[List[Dict[str, Any]]] = None


# --- Balance & Sensitivity Models ---

class TeamBalanceEvaluationModel(BaseModel):
    team_name: str
    team: List[str]
    win_rate_percent: float
    avg_ticks: float
    dominant: bool = False


class BalancePacingModel(BaseModel):
    avg_ticks: float
    max_ticks: int
    timeout_percent: float
    pacing_rating: Literal["fast", "balanced", "prolonged"]


class BalanceReportModel(BaseModel):
    scenario_id: str
    scenario_name: str
    overall_win_rate_percent: float
    target_band: str = "25% - 75%"
    is_balanced: bool
    balance_flag: Optional[str] = None
    dominant_strategies_detected: bool = False
    dominant_strategy_notes: List[str] = Field(default_factory=list)
    pacing: BalancePacingModel
    teams_evaluated: List[TeamBalanceEvaluationModel] = Field(default_factory=list)


class SensitivitySweepPointModel(BaseModel):
    parameter_value: Any
    win_rate: float
    win_rate_percent: float
    is_balanced: bool


class SensitivitySweepReportModel(BaseModel):
    scenario_id: str
    parameter: str
    values: List[Any]
    points: List[SensitivitySweepPointModel] = Field(default_factory=list)
    optimal_range: str


# --- Background Job Models ---

class JobStatusModel(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    progress: float = 0.0
    result: Optional[Any] = None
    error: Optional[str] = None
