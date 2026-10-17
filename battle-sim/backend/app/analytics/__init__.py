"""Analytics package."""

from .models import (
    BattleSummaryModel,
    CreatureStatsModel,
    TeamStatsModel,
    HPTimelineModel,
    PositionHeatmapModel,
    CauseTraceModel,
    LossCausesReportModel,
    DecisionAuditReportModel,
    CounterfactualResponseModel,
    WinRatePredictionModel,
    StatePredictionModel,
    PlanCompareResultModel,
    RecommendationReportModel,
    BalanceReportModel,
    SensitivitySweepReportModel,
    JobStatusModel,
)
from .descriptive import (
    battle_summary,
    creature_stats,
    team_stats,
    hp_timeline,
    position_heatmap,
    compute_battle_descriptive_stats,
)
from .diagnostic import (
    cause_trace,
    loss_causes,
    decision_audit,
    counterfactual,
    trace_defeat_causes,
    run_counterfactual_battle,
)
from .predictive import (
    predict_win_rate,
    predict_from_state,
    run_monte_carlo_prediction,
    get_job_progress,
    set_job_progress,
    compute_confidence_interval,
)
from .prescriptive import (
    compare_options,
    recommend_action,
    compare_plan_options,
    recommend_best_actions,
    audit_scenario_balance,
)
from .balance import (
    balance_report,
    sensitivity_sweep,
)

