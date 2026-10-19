import React, { useEffect, useState } from "react";
import { api, LessonAnalyticsReport } from "../api";
import { Card, CardBody } from "./ui/Card";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const numeric = (value: number | null | undefined) => value == null ? "—" : value.toFixed(3);

export const LessonAnalytics: React.FC<{ scenarioId: string; source: "both" | "simulated" | "uploaded"; refresh: number }> = ({ scenarioId, source, refresh }) => {
  const [dimension, setDimension] = useState<"potion" | "scenario" | "team_size">("potion");
  const [report, setReport] = useState<LessonAnalyticsReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.getLessonAnalytics(scenarioId, source, dimension).then(result => { if (active) { setReport(result); setError(""); } })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [scenarioId, source, dimension, refresh]);
  const exploration = report?.exploration;
  const association = exploration?.association;
  const training = report?.training;
  return <section aria-label="Course analytics">
    <Card><CardBody>
      <h2>Explore and investigate outcomes</h2>
      <p>Chapter 4 · Compare completed rounds, inspect data quality, then investigate possible explanations.</p>
      <label>Compare by <select aria-label="Diagnostic comparison" value={dimension} onChange={e => setDimension(e.target.value as typeof dimension)}>
        <option value="potion">Potion spending</option><option value="scenario">Scenario</option><option value="team_size">Squad size</option>
      </select></label>
      {error && <p role="alert">Lesson analytics unavailable: {error}</p>}
      {exploration && <>
        <p>{exploration.sample_count} distinct deterministic rounds from {exploration.input_records} records. Replays excluded: {exploration.duplicates_excluded}.</p>
        <p>Missing starting snapshots: {exploration.missing_starting_snapshots} · Unknown strategy: {exploration.unknown_strategy_records}.</p>
        <p>Window (UTC): {exploration.window.from || "No rounds"} to {exploration.window.to || "No rounds"}. Uses the scenario/source filters below.</p>
        <div className="lesson-table"><table className="ui-table">
          <caption>Distributions and potential anomalies</caption>
          <thead><tr><th>Measure</th><th>Count</th><th>Mean</th><th>Median</th><th>Q1–Q3</th><th>Range</th><th>IQR flags</th></tr></thead>
          <tbody>{Object.entries(exploration.summaries).map(([name, value]) => <tr key={name}>
            <td>{name.replace(/_/g, " ")}</td><td>{value.count}</td><td>{numeric(value.mean)}</td><td>{numeric(value.median)}</td>
            <td>{numeric(value.q1)}–{numeric(value.q3)}</td><td>{value.min ?? "—"}–{value.max ?? "—"}</td><td>{value.outlier_count}</td>
          </tr>)}</tbody>
        </table></div>
        <h3>Cohort comparison</h3>
        {exploration.cohorts.length ? exploration.cohorts.map(c => <p key={c.group}>
          <strong>{c.group}</strong>: {c.wins}/{c.rounds} wins ({percent(c.win_rate)}) <meter min={0} max={1} value={c.win_rate} aria-label={`${c.group} win proportion`} />
        </p>) : <p>Play rounds to build comparison cohorts.</p>}
        {association && <>
          <h3>Expected counts → association → residuals → strength</h3>
          <p>χ²: {numeric(association.chi_square)} · df: {association.degrees_of_freedom} · Nominal p: {association.nominal_p_value == null ? "Withheld" : association.nominal_p_value.toExponential(3)} · Cramér’s V: {numeric(association.cramers_v)}</p>
          <p>{association.interpretation}</p>
          <div className="lesson-table"><table className="ui-table">
            <caption>Observed, expected under independence, and Pearson residuals</caption>
            <thead><tr><th>Group</th><th>Observed loss/win</th><th>Expected loss/win</th><th>Residual loss/win</th><th>χ² contribution loss/win</th></tr></thead>
            <tbody>{association.rows.map((row, i) => <tr key={row}>
              <td>{row}</td><td>{association.observed[i]?.join(" / ")}</td>
              <td>{association.expected[i]?.map(n => n.toFixed(2)).join(" / ") || "—"}</td>
              <td>{association.residuals[i]?.map(n => n.toFixed(2)).join(" / ") || "—"}</td>
              <td>{association.contributions[i]?.map(n => n.toFixed(2)).join(" / ") || "—"}</td>
            </tr>)}</tbody>
          </table></div>
        </>}
        <h3>Where recorded HP loss came from</h3>
        {exploration.damage_contribution.map(d => <p key={d.category}>{d.category}: {d.damage} HP ({percent(d.share)})</p>)}
        <details><summary>Hourly cohorts and diagnostic limits</summary>
          {exploration.hourly.map(h => <p key={h.hour}>{h.hour}: {h.rounds} rounds, {percent(h.win_rate)} wins</p>)}
          <p>{exploration.seasonality}</p>
          {exploration.limitations.map(note => <p key={note}>{note}</p>)}
        </details>
        <p>Next investigation: {exploration.next_question}</p>
      </>}
    </CardBody></Card>
    <Card><CardBody>
      <h2>Trained prediction model</h2>
      <p>Chapter 5 · Model selection uses validation data; the final test is held aside until the model and threshold are fixed.</p>
      {training?.status !== "trained" ? <p>{training?.message || "Loading model report…"}</p> : <>
        <p><strong>{training.selected_model}</strong> · Training source: {training.data_source}. Target: {training.target}.</p>
        <p>{training.split_method}: {training.split_counts.training} training / {training.split_counts.validation} validation / {training.split_counts.test} test rows.</p>
        <p>Primary comparison: {training.primary_metric}. Prediction moment: {training.prediction_moment}.</p>
        <div className="lesson-table"><table className="ui-table">
          <caption>Candidate comparison on the same validation groups</caption>
          <thead><tr><th>Candidate</th><th>Training Brier</th><th>Validation Brier</th><th>Validation F1</th><th>Validation ROC-AUC</th></tr></thead>
          <tbody>{training.candidates.map(c => <tr key={c.model}><td>{c.model}</td><td>{numeric(c.training.brier)}</td><td>{numeric(c.validation.brier)}</td><td>{numeric(c.validation.f1)}</td><td>{numeric(c.validation.roc_auc)}</td></tr>)}</tbody>
        </table></div>
        <h3>Final test of the selected model</h3>
        <p>Brier: {numeric(training.test.brier)} versus baseline {numeric(training.baseline_test.brier)} · Log loss: {numeric(training.test.log_loss)}.</p>
        <p>Accuracy: {percent(training.test.accuracy)} · Precision: {percent(training.test.precision)} · Recall: {percent(training.test.recall)} · F1: {numeric(training.test.f1)}.</p>
        <p>TP {training.test.confusion_matrix.tp} / FP {training.test.confusion_matrix.fp} / TN {training.test.confusion_matrix.tn} / FN {training.test.confusion_matrix.fn} at threshold {training.threshold.toFixed(2)}.</p>
        <p>Balanced accuracy: {percent(training.test.balanced_accuracy)} · ROC-AUC: {numeric(training.test.roc_auc)} · Average precision: {numeric(training.test.average_precision)}.</p>
        <p>{training.threshold_policy}</p>
        <div className="lesson-table"><table className="ui-table">
          <caption>Selected model calibration on the final test</caption>
          <thead><tr><th>Probability band</th><th>Test rounds</th><th>Mean predicted</th><th>Observed wins</th></tr></thead>
          <tbody>{training.test.calibration.map(bin => <tr key={bin.range}><td>{bin.range}</td><td>{bin.count}</td><td>{percent(bin.predicted)}</td><td>{percent(bin.observed)}</td></tr>)}</tbody>
        </table></div>
        <p>Live evaluation of this model version: {report?.live_model_evaluation.sample_count} rounds · Brier {numeric(report?.live_model_evaluation.brier)}.</p>
        <details><summary>Model evidence and limitations</summary>
          <p>{report?.live_model_evaluation.note}</p>
          {training.global_associations.map(d => <p key={d.feature}>{d.feature}: {d.importance.toFixed(3)} predictive weight/importance</p>)}
          {training.limitations.map(note => <p key={note}>{note}</p>)}
        </details>
      </>}
    </CardBody></Card>
  </section>;
};
