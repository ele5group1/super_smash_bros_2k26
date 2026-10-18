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
    const options = [0,5,10].filter(spend => spend <= budget).map(spend => ({ name: spend ? `${spend*4} HP emergency potion` : "Keep coins for combat moves", team, early_heal_spend: spend }));
    Promise.all([
      api.comparePlan({ scenario_id: scenarioId, seed_count: 100, options }),
      api.recommendPlan({ scenario_id: scenarioId, team, current_coins: budget }),
    ]).then(([r,a]) => { if (active) { setRows(r); setAdvice(a); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scenarioId, team, scenarios]);
  const apply = (spend: number) => {
    localStorage.setItem("last_selected_team", JSON.stringify(team));
    localStorage.setItem("last_selected_scenario", scenarioId);
    localStorage.setItem("last_selected_spend", String(spend));
    navigate(`/scenarios/${scenarioId}`);
  };
  return <div className="page-container">
    <h1 className="text-h1">Strategy Lab</h1>
    <p>Compare affordable plans, apply one, then play a round and inspect the outcome.</p>
    <Card><CardBody>
      <label>Scenario <select aria-label="Strategy scenario" value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
        {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
      <p>Squad: {team.map(id => creatures.find(c => c.id === id)?.name || id).join(", ")}</p>
      <Button variant="secondary" onClick={() => apply(0)}>Change squad</Button>
      <p>A potion is purchased before combat and activates once when a living ally reaches half HP. Unused potions are not refunded. Spending leaves fewer coins for combat moves.</p>
    </CardBody></Card>
    {error && <p role="alert">Analysis failed: {error}</p>}
    {loading && <p role="status">Comparing plans...</p>}
    {advice && <Card><CardBody>
      <h2>Recommended plan</h2><p>{advice.explanation}</p>
      <p>{advice.seed_count} trials per option · Spend: {advice.best_spend} coins · Estimated change versus no potion: {advice.improvement_percentage_points.toFixed(1)} percentage points.</p>
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
