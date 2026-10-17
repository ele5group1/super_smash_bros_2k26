/** Typed API Client for Puffcap Arena Simulator API */

export interface Move {
  id: string;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  cost_coins: number;
  target_type: string;
  effect?: string | null;
  effect_chance: number;
}

export interface Creature {
  id: string;
  name: string;
  type: "fire" | "water" | "grass" | "electric" | "stone";
  hp: number;
  attack: number;
  speed: number;
  moves: string[];
  source?: string;
  avatar?: string | null;
}

export interface HeroMove {
  id: string;
  name: string;
  type: string;
  power: number;
  accuracy: number;
  cost_coins: number;
  target_type: string;
  effect?: string | null;
  effect_chance: number;
}

export interface Hero {
  id: string;
  name: string;
  type: "fire" | "water" | "grass" | "electric" | "stone";
  hp: number;
  attack: number;
  speed: number;
  moves: string[];
  moves_detail?: HeroMove[];
  avatar?: string | null;
  role: string;
  description: string;
}

export interface MapTile {
  scenario_id?: string;
  lane: number;
  tile_index: number;
  tile_type: "normal" | "pipe" | "question_block" | "hazard_zone" | "exit" | "lava" | "coin_cache";
}

export interface HazardSchedule {
  scenario_id?: string;
  tick: number;
  type: string;
  lane: number;
  params: Record<string, any>;
}

export interface ScenarioObjective {
  type: "reach_exit" | "defeat_all" | "collect_coins" | "survive_ticks" | "defeat_boss";
  min_survivors: number;
  target_coins?: number;
  target_tick?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  lanes: number;
  ticks: number;
  map: MapTile[];
  hazard_schedule: HazardSchedule[];
  objective: ScenarioObjective;
  starting_resources: { coins: number };
  enemy_team: string[];
  source?: string;
}

export interface EventLog {
  battle_id: string;
  tick: number;
  actor?: string | null;
  action: string;
  target?: string | null;
  damage: number;
  hp_before: number;
  hp_after: number;
  status_change?: string | null;
  hazard_hit?: string | null;
  pickup?: string | null;
  ko: boolean;
  coin_change: number;
  event_type: "hazard" | "move" | "status" | "pickup" | "death" | "objective" | "info" | "block" | "synergy" | "boss_phase";
}

export type BattleEvent = EventLog;
export type ScenarioSummary = Scenario;

export interface BattleRecord {
  battle_id: string;
  scenario_id: string;
  seed: number;
  engine_version: string;
  player_team: string[];
  personality: "aggressive" | "defensive" | "opportunistic";
  outcome: "win" | "loss";
  ticks_elapsed: number;
  survivors: number;
  coins_left: number;
  source: string;
  events: EventLog[];
  created_at?: string;
}

export interface SynergyCombo {
  id: string;
  name: string;
  pair: [string, string];
  power: number;
  effect: string;
  description: string;
  anim: string;
}

export interface TournamentSquad {
  id: string;
  name: string;
  members: string[];
  seed: number;
  color: string;
}

export interface TournamentMatch {
  match_id: string;
  round: string;
  squad_a: TournamentSquad;
  squad_b: TournamentSquad;
  winner: TournamentSquad;
  loser: TournamentSquad;
  battle_id: string;
  ticks_elapsed: number;
  survivors_left: number;
  coins_collected: number;
  score_a: number;
  score_b: number;
}

export interface TournamentRound {
  name: string;
  matches: TournamentMatch[];
}

export interface TournamentReport {
  tournament_id: string;
  squads: TournamentSquad[];
  rounds: TournamentRound[];
  champion: TournamentSquad;
  runner_up: TournamentSquad;
  mvp_creature: { id: string; name: string; kos: number; damage: number };
}

export interface OptimizationIteration {
  iteration: number;
  param_value: number;
  win_rate_percent: number;
  wins: number;
  battles: number;
  distance_to_target: number;
}

export interface OptimizationReport {
  scenario_id: string;
  parameter_name: string;
  target_win_rate_percent: number;
  initial_param_value: number;
  optimal_param_value: number;
  final_win_rate_percent: number;
  converged: boolean;
  total_iterations: number;
  iterations: OptimizationIteration[];
}

export interface ReplayStatus {
  battle_id: string;
  status: "match" | "mismatch" | "not_replayable";
  first_differing_tick?: number | null;
  details: string;
}

export interface DescriptiveAnalytics {
  battle_id: string;
  scenario_id: string;
  outcome: string;
  ticks_elapsed: number;
  survivors: number;
  coins_left: number;
  creatures_stats: Array<{
    id: string;
    damage_dealt: number;
    damage_taken: number;
    kos: number;
    survived: boolean;
    hazard_ticks: number;
    final_hp: number;
  }>;
  hp_timeline: Array<{
    tick: number;
    coins: number;
    creatures: Record<string, number>;
    hazard_events: string[];
    ko_events: string[];
  }>;
  heatmap: Array<Array<{ damage: number; kos: number }>>;
}

export interface DiagnosticAnalytics {
  is_defeat: boolean;
  root_cause: string | null;
  explanation: string;
  turning_points: Array<{
    tick: number;
    category: string;
    title: string;
    description: string;
  }>;
  recommendation?: string;
}

export interface PredictionResult {
  scenario_id: string;
  team: string[];
  seed_count: number;
  win_rate: number;
  win_rate_percent: number;
  confidence_interval_percent: number;
  survivor_distribution: number[];
  survivor_distribution_percent: number[];
  avg_coins_left: number;
  avg_ticks: number;
  calibration?: {
    upload_id: string;
    uploaded_samples: number;
    uploaded_win_rate?: number;
    uploaded_win_rate_percent?: number;
    gap?: number;
    gap_percent?: number;
    interpretation?: string;
    message?: string;
  } | null;
}

export interface UploadRecord {
  id: string;
  kind: "scenarios" | "creatures" | "battles";
  filename: string;
  row_count: number;
  status: "valid" | "rejected";
  errors: string[];
  warnings: string[];
  preview: any[];
  upload_group?: string | null;
  created_at: string;
}

const API_BASE = "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    let errDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.errors && Array.isArray(errJson.errors)) {
        errDetail = errJson.errors.join("; ");
      }
    } catch {
      errDetail = await res.text();
    }
    throw new Error(errDetail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

const clientCache: {
  scenarios?: Scenario[];
  creatures?: Creature[];
  synergies?: SynergyCombo[];
  heroes?: Hero[];
} = {};

export const api = {
  checkHealth: () => request<{ status: string }>("/health"),

  getScenarios: async (source?: string, forceRefresh = false) => {
    if (!source && !forceRefresh && clientCache.scenarios) {
      return clientCache.scenarios;
    }
    const data = await request<Scenario[]>(`/scenarios${source ? `?source=${source}` : ""}`);
    if (!source) clientCache.scenarios = data;
    return data;
  },

  listScenarios: async (source?: string) => {
    if (!source && clientCache.scenarios) return clientCache.scenarios;
    const data = await request<Scenario[]>(`/scenarios${source ? `?source=${source}` : ""}`);
    if (!source) clientCache.scenarios = data;
    return data;
  },

  getScenario: (id: string) => request<Scenario>(`/scenarios/${id}`),

  saveScenario: async (scenario: Scenario) => {
    clientCache.scenarios = undefined;
    return request<Scenario>("/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenario),
    });
  },

  getCreatures: async (source?: string, forceRefresh = false) => {
    if (!source && !forceRefresh && clientCache.creatures) {
      return clientCache.creatures;
    }
    const data = await request<Creature[]>(`/creatures${source ? `?source=${source}` : ""}`);
    if (!source) clientCache.creatures = data;
    return data;
  },

  createBattle: (data: {
    scenario_id: string;
    player_team: string[];
    seed: number;
    personality: string;
  }) =>
    request<{
      battle_id: string;
      scenario_id: string;
      outcome: string;
      ticks_elapsed: number;
      survivors: number;
      coins_left: number;
      event_count: number;
    }>("/battles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getBattle: (id: string) =>
    request<{ battle: BattleRecord; replay_status?: ReplayStatus | null }>(`/battles/${id}`),

  getDescriptiveAnalytics: (id: string) =>
    request<DescriptiveAnalytics>(`/battles/${id}/analytics/descriptive`),

  getDiagnosticAnalytics: (id: string) =>
    request<DiagnosticAnalytics>(`/battles/${id}/analytics/diagnostic`),

  rerunCounterfactual: (
    id: string,
    data: {
      tick: number;
      actor: string;
      action_type: string;
      target_lane?: number;
      heal_amount?: number;
      move_id?: string;
    }
  ) =>
    request<{
      original_outcome: string;
      new_outcome: string;
      outcome_changed: boolean;
      survivors_diff: number;
      ticks_diff: number;
      coins_diff: number;
      first_differing_tick: number;
      new_battle: BattleRecord;
    }>(`/battles/${id}/counterfactual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  predictPlan: (data: {
    scenario_id: string;
    team: string[];
    seed_count: number;
    calibrate_with_upload_id?: string | null;
  }) =>
    request<PredictionResult>("/plan/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  comparePlan: (data: {
    scenario_id: string;
    options: Array<{ name: string; team: string[]; early_heal_spend: number }>;
    seed_count: number;
  }) =>
    request<
      Array<{
        name: string;
        team: string[];
        early_heal_spend: number;
        win_rate: number;
        win_rate_percent: number;
        avg_survivors: number;
        avg_coins_left: number;
      }>
    >("/plan/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  recommendPlan: (data: { scenario_id: string; team: string[]; current_coins: number }) =>
    request<{
      scenario_id: string;
      team: string[];
      best_spend: number;
      best_win_rate_percent: number;
      explanation: string;
      options: Array<{
        spend: number;
        reserve_kept: number;
        win_rate: number;
        win_rate_percent: number;
        avg_coins_left: number;
      }>;
    }>("/plan/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  auditBalance: (id: string, calibrateId?: string | null) =>
    request<{
      scenario_id: string;
      scenario_name: string;
      is_balanced: boolean;
      overall_win_rate_percent: number;
      target_band: string;
      balance_flag: string | null;
      pacing: { avg_ticks: number; max_ticks: number; timeout_percent: number };
      archetypes: Array<{ archetype: string; team: string[]; win_rate_percent: number }>;
      hazard_impact: Array<{ tick: number; type: string; lane: number; damage: number }>;
      calibration?: any;
    }>(`/author/scenarios/${id}/balance${calibrateId ? `?calibrate_with_upload_id=${calibrateId}` : ""}`),

  getUploads: () => request<UploadRecord[]>("/uploads"),

  getUpload: (id: string) => request<UploadRecord>(`/uploads/${id}`),

  deleteUpload: (id: string) =>
    request<{ id: string; deleted: boolean; message: string }>(`/uploads/${id}`, {
      method: "DELETE",
    }),

  getHeroes: async () => {
    if (clientCache.heroes) return clientCache.heroes;
    const data = await request<Hero[]>("/heroes");
    clientCache.heroes = data;
    return data;
  },

  // Analytics endpoints
  getBattleSummary: (id: string) => request<any>(`/battles/${id}/analytics/summary`),
  getBattleCreatures: (id: string) => request<any>(`/battles/${id}/analytics/creatures`),
  getBattleTimeline: (id: string) => request<any>(`/battles/${id}/analytics/timeline`),
  getBattleHeatmap: (id: string) => request<any>(`/battles/${id}/analytics/heatmap`),
  getBattleCauseTrace: (id: string) => request<any>(`/battles/${id}/analytics/cause-trace`),
  getBattleDecisions: (id: string, threshold: number = 0.05) =>
    request<any>(`/battles/${id}/analytics/decisions?threshold=${threshold}`),
  runCounterfactual: (id: string, tick: number, newAction: string) =>
    request<any>(`/battles/${id}/counterfactual`, {
      method: "POST",
      body: JSON.stringify({ tick, new_action: newAction }),
    }),
  getTeamStats: (scenarioId?: string, source?: string) => {
    const params = new URLSearchParams();
    if (scenarioId) params.append("scenario_id", scenarioId);
    if (source) params.append("source", source);
    return request<any[]>(`/analytics/team-stats?${params.toString()}`);
  },
  getLossCauses: (scenarioId?: string, source?: string) => {
    const params = new URLSearchParams();
    if (scenarioId) params.append("scenario_id", scenarioId);
    if (source) params.append("source", source);
    return request<any[]>(`/analytics/loss-causes?${params.toString()}`);
  },
  getSensitivitySweep: (scenarioId: string, param: string = "enemy_hp_multiplier") =>
    request<any>(`/author/scenarios/${scenarioId}/sensitivity`, {
      method: "POST",
      body: JSON.stringify({ parameter: param, min_val: 0.5, max_val: 1.5, steps: 5 }),
    }),
  getJobStatus: (jobId: string) => request<any>(`/jobs/${jobId}`),

  // Synergies, Tournament, and Auto-tuning
  getSynergies: async () => {
    if (clientCache.synergies) return clientCache.synergies;
    const data = await request<SynergyCombo[]>("/synergies");
    clientCache.synergies = data;
    return data;
  },
  runTournament: (squadSize: number = 3, seed?: number) =>
    request<TournamentReport>("/tournament/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ squad_size: squadSize, seed: seed || Date.now() % 100000 }),
    }),
  autoTuneScenario: (scenarioId: string, param: string = "enemy_hp_multiplier", targetWinRate: number = 50.0) =>
    request<OptimizationReport>(`/author/scenarios/${scenarioId}/auto-tune`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parameter: param, target_win_rate_percent: targetWinRate }),
    }),

  uploadFile: async (file: File, kind: string, uploadGroup?: string): Promise<UploadRecord> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    if (uploadGroup) {
      formData.append("upload_group", uploadGroup);
    }
    const res = await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.errors ? json.errors.join("\n") : (json.detail || "Upload validation failed");
      const err = new Error(msg);
      (err as any).uploadRecord = json;
      throw err;
    }
    return json;
  },
};
