import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Scenario, Creature } from "../api";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type Comparison = Awaited<ReturnType<typeof api.comparePlan>>[number];
type Recommendation = Awaited<ReturnType<typeof api.recommendPlan>>;
export const PlanScreen: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [scenarioId, setScenarioId] = useState("");
  const [team, setTeam] = useState<string[]>([]);
  const [rows, setRows] = useState<Comparison[]>([]);
  const [advice, setAdvice] = useState<Recommendation | null>(null);
  const [objective, setObjective] = useState<"win_probability" | "balanced" | "survival">("win_probability");
  const [minReserve, setMinReserve] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([api.getScenarios(), api.getCreatures()]).then(([s,c]) => {
      if (!active) return;
      setScenarios(s); setCreatures(c);
      setScenarioId(s.find(x => x.id === localStorage.getItem("last_selected_scenario"))?.id ?? s[0]?.id ?? "");
      let draft: string[] = [];
      try { const value = JSON.parse(localStorage.getItem("last_selected_team") || "[]"); if (Array.isArray(value)) draft = value; } catch { /* defaults */ }
      const valid = [...new Set(draft)].filter(id => c.some(x => x.id === id)).slice(0,4);
      setTeam(valid.length ? valid : c.slice(0,4).map(x => x.id));
    }).catch(e => { if (active) { setError(e.message); setLoading(false); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario || !team.length) return;
    let active = true;
    setLoading(true); setError(""); setAdvice(null); setRows([]);
    const budget = scenario.starting_resources.coins;
    const options = [0,5,10].filter(spend => spend <= budget-Math.min(minReserve,budget)).map(spend => ({ name: spend ? `${spend*4} HP emergency potion` : "Keep coins for combat moves", team, early_heal_spend: spend }));
    Promise.all([
      api.comparePlan({ scenario_id: scenarioId, seed_count: 100, options }),
      api.recommendPlan({ scenario_id: scenarioId, team, current_coins: budget, objective, min_reserve: Math.min(minReserve,budget) }),
    ]).then(([r,a]) => { if (active) { setRows(r); setAdvice(a); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scenarioId, team, scenarios, objective, minReserve]);
  const apply = (spend: number) => {
    localStorage.setItem("last_selected_team", JSON.stringify(team));
    localStorage.setItem("last_selected_scenario", scenarioId);
    localStorage.setItem("last_selected_spend", String(spend));
    localStorage.setItem("planning_objective", objective);
    localStorage.setItem("minimum_reserve", String(Math.min(minReserve,scenarios.find(s => s.id === scenarioId)?.starting_resources.coins ?? 0)));
    navigate(`/scenarios/${scenarioId}`);
  };
  return <div className="page-container">
    <h1 className="text-h1">Strategy Lab</h1>
    <p>Compare affordable plans, apply one, then play a round and inspect the outcome.</p>
    <Card><CardBody>
      <label>Scenario <select aria-label="Strategy scenario" value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
        {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
      <p><label>Decision objective <select aria-label="Decision objective" value={objective} onChange={e => setObjective(e.target.value as typeof objective)}>
        <option value="win_probability">Maximize chance of winning</option>
        <option value="survival">Maximize expected survivors</option>
        <option value="balanced">Balance wins, survivors, and coins</option>
      </select></label></p>
      <p><label>Keep at least this many coins before combat <input aria-label="Minimum coin reserve" type="number" min={0}
        max={scenarios.find(s => s.id === scenarioId)?.starting_resources.coins ?? 0} value={minReserve}
        onChange={e => setMinReserve(Math.max(0,Math.min(Number(e.target.value)||0,scenarios.find(s => s.id === scenarioId)?.starting_resources.coins ?? 0)))} /></label></p>
      <p>Squad: {team.map(id => creatures.find(c => c.id === id)?.name || id).join(", ")}</p>
      <Button variant="secondary" onClick={() => apply(0)}>Change squad</Button>
      <p>A potion is purchased before combat and activates once when a living ally reaches half HP. Unused potions are not refunded. Spending leaves fewer coins for combat moves.</p>
    </CardBody></Card>
    {error && <p role="alert">Analysis failed: {error}</p>}
    {loading && <p role="status">Comparing plans...</p>}
    {advice && <Card><CardBody>
      <h2>Recommended plan</h2><p>{advice.explanation}</p>
      <p>{advice.seed_count} trials per option · Spend: {advice.best_spend} coins · Estimated change versus no potion: {advice.improvement_percentage_points.toFixed(1)} percentage points.</p>
      <p>Objective: {advice.decision_model.utility_formula}. {advice.decision_model.weights_note}</p>
      <p>Budget: {advice.decision_model.hard_constraints.budget} coins; minimum initial reserve: {advice.decision_model.hard_constraints.minimum_initial_reserve} coins.</p>
      <p>{advice.decision_model.scope}</p>
      <div className="lesson-table"><table className="ui-table">
        <caption>Downside and tradeoffs among feasible plans</caption>
        <thead><tr><th>Spend</th><th>Failure chance</th><th>10th percentile survivors</th><th>Mean utility</th></tr></thead>
        <tbody>{advice.options.map(option => <tr key={option.spend}><td>{option.spend} coins</td><td>{(option.failure_probability*100).toFixed(1)}%</td><td>{option.survivor_p10}</td><td>{option.objective_value.toFixed(3)}</td></tr>)}</tbody>
      </table></div>
      <h3>Fresh-seed check of the chosen plan</h3>
      <p>{advice.holdout_comparison.seed_count} matched trials after selection: utility change {advice.holdout_comparison.mean_utility_change.toFixed(3)}, approximate 95% interval [{advice.holdout_comparison.approximate_95_interval.map(n => n.toFixed(3)).join(", ")}]. Win-rate change: {advice.holdout_comparison.win_change_percentage_points.toFixed(1)} percentage points.</p>
      <p>{advice.holdout_comparison.interpretation}</p>
      <details><summary>Sensitivity to player preferences</summary>
        {advice.sensitivity.map(row => <p key={row.objective}>{row.objective.replace(/_/g, " ")}: choose {row.best_spend} coins.</p>)}
      </details>
      <p>The recommendation uses separate seeds from the comparison below, so estimates can differ.</p>
      <Button onClick={() => apply(advice.best_spend)}>Apply recommendation</Button>
    </CardBody></Card>}
    {!!rows.length && <Card><CardBody>
      <h2>Strategy comparison — 100 trials per option</h2>
      <div style={{ overflowX: "auto" }}><table className="ui-table">
        <thead><tr><th>Plan</th><th>Cost</th><th>Win estimate</th><th>95% interval</th><th>Survivors</th><th>Coins left</th><th>Play</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.early_heal_spend}>
          <td>{r.name}</td><td>{r.early_heal_spend}</td><td>{r.win_rate_percent}%</td>
          <td>{r.ci_lower}%–{r.ci_upper}%</td><td>{r.avg_survivors}</td><td>{r.avg_coins_left}</td>
          <td><Button size="sm" onClick={() => apply(r.early_heal_spend)}>Use plan</Button></td>
        </tr>)}</tbody>
      </table></div>
      <p>Intervals describe simulation sampling uncertainty. Compare saved predictions with actual outcomes on the shared analytics screen.</p>
    </CardBody></Card>}
  </div>;
};
