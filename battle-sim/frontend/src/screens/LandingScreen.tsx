import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Scenario, BattleRecord, Creature } from '../api';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Arena } from '../components/Arena';

export const LandingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewBattle, setPreviewBattle] = useState<BattleRecord | null>(null);
  const [previewScenario, setPreviewScenario] = useState<Scenario | null>(null);
  const [creaturesMap, setCreaturesMap] = useState<Record<string, Creature>>({});
  const [quickStarting, setQuickStarting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([api.getScenarios(), api.getCreatures()])
      .then(([scs, creats]) => {
        if (!isMounted) return;
        setScenarios(scs);
        const cmap: Record<string, Creature> = {};
        creats.forEach((c) => { cmap[c.id] = c; });
        setCreaturesMap(cmap);
        setLoading(false);

        if (scs.length > 0) {
          setPreviewScenario(scs[0]);
          // Defer background simulation until after initial paint
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              const res = await api.createBattle({
                scenario_id: scs[0].id,
                player_team: ['ember_fox', 'bubble_toad', 'moss_shroom', 'volt_hedgehog'],
                seed: 42,
                personality: 'opportunistic',
              });
              const bdata = await api.getBattle(res.battle_id);
              if (isMounted) {
                setPreviewBattle(bdata.battle);
              }
            } catch (e) {
              console.error('Failed to run preview battle', e);
            }
          }, 80);
        }
      })
      .catch((err: any) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickBattle = async () => {
    setQuickStarting(true);
    try {
      const scenarioId = scenarios[0]?.id || 'pipe_ambush';
      const result = await api.createBattle({
        scenario_id: scenarioId,
        player_team: ['ember_fox', 'bubble_toad', 'moss_shroom', 'volt_hedgehog'],
        seed: Math.floor(Math.random() * 10000),
        personality: 'opportunistic',
      });
      navigate(`/battles/${result.battle_id}`);
    } catch (err: any) {
      console.error(err);
      navigate('/scenarios');
    } finally {
      setQuickStarting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Hero Section */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-8)',
          alignItems: 'center',
          padding: 'var(--space-8) 0',
        }}
      >
        <div>
          <Badge variant="fire" size="md" hasDot style={{ marginBottom: 'var(--space-3)' }}>
            Mushroom Kingdom × Kanto Arena
          </Badge>
          <h1 className="text-display" style={{ marginBottom: 'var(--space-4)' }}>
            Pick Your Squad. Master the Stages. Win the Cup.
          </h1>
          <p
            className="text-muted text-body"
            style={{ marginBottom: 'var(--space-6)', maxWidth: '520px' }}
          >
            Draft iconic fighters like Mario, Charizard, Link, and Pikachu. Outsmart warp pipes,
            lava geysers, and Bowser boss mechanics in tactical lane skirmishes.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Button
              id="hero-start-battle-btn"
              variant="primary"
              size="lg"
              isLoading={quickStarting}
              onClick={handleQuickBattle}
            >
              ⚔️ Quick Match
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/tournament')}
            >
              🏆 Championship Cup
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/scenarios')}
            >
              🗺️ Select Stage
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/data')}
            >
              📦 Custom Mods
            </Button>
          </div>
        </div>

        {/* Live Battle Preview Arena */}
        <div>
          <Card padding="none" style={{ overflow: 'hidden', border: '1px solid var(--border-strong)' }}>
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="ui-badge-dot" style={{ backgroundColor: 'var(--color-success)' }} />
                <span style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-bold)' }}>
                  Interactive Live Arena
                </span>
              </div>
              <Badge variant="neutral" size="sm">
                Pipe Ambush
              </Badge>
            </div>

            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-app)' }}>
              {previewBattle && previewScenario ? (
                <Arena
                  battle={previewBattle}
                  scenario={previewScenario}
                  creaturesMap={creaturesMap}
                />
              ) : (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Skeleton variant="rectangular" width="100%" height={220} />
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Featured Scenarios */}
      <section style={{ marginTop: 'var(--space-8)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div>
            <h2 className="text-h2">Featured Scenarios</h2>
            <p className="text-muted" style={{ fontSize: 'var(--font-size-small)' }}>
              Battle through handcrafted hazard lanes with unique enemy squads.
            </p>
          </div>
          <Link to="/scenarios" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
            View All Scenarios →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            <Skeleton variant="card" count={3} />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {scenarios.slice(0, 3).map((scenario) => (
              <Card key={scenario.id} variant="interactive" onClick={() => navigate(`/scenarios/${scenario.id}`)}>
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                    <h3 className="text-h3">{scenario.name}</h3>
                    <Badge variant="warning">
                      Lanes: {scenario.lanes}
                    </Badge>
                  </div>
                  <p className="text-muted text-small" style={{ marginBottom: "var(--space-4)", minHeight: "40px" }}>
                    {scenario.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-subtle)" }}>
                    <span className="text-small text-muted">Goal: {scenario.objective.type}</span>
                    <Button variant="ghost" size="sm">
                      Draft Squad →
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Feature Pillars */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-10)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <Card variant="sunken">
          <CardBody>
            <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>🎯</div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--space-1)' }}>100% Fair & Seeded</h3>
            <p className="text-muted text-small">
              No RNG robbery. Every match uses deterministic seed ticks, so identical teams and moves produce identical replays.
            </p>
          </CardBody>
        </Card>

        <Card variant="sunken">
          <CardBody>
            <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>📈</div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--space-1)' }}>Matchup Calculator</h3>
            <p className="text-muted text-small">
              Simulate 50+ scrim matches against enemy squads to inspect win odds, survival rates, and best coin spend strategies.
            </p>
          </CardBody>
        </Card>

        <Card variant="sunken">
          <CardBody>
            <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>🗺️</div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--space-1)' }}>Stage Builder & Balancer</h3>
            <p className="text-muted text-small">
              Place warp pipes, hazard spikes, and question blocks on custom lanes. Auto-tune enemy stats to hit a fair 50/50 win rate.
            </p>
          </CardBody>
        </Card>

        <Card variant="sunken">
          <CardBody>
            <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>📦</div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--space-1)' }}>Custom Fighters & Mods</h3>
            <p className="text-muted text-small">
              Import custom fighter CSVs and community stage packs with instant format validation and replay verification.
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  );
};
