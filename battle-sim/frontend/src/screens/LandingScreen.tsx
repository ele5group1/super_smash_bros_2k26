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
                session_kind: "preview",
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
      {/* Cinematic Showcase Banner */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: 'var(--space-6)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          background: '#090d16',
          height: '240px',
        }}
      >
        <img
          src="/images/hero_mario_pokemon_split.jpg"
          alt="Super Mario x Pokémon Battle Arena"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 28%',
            filter: 'brightness(0.9) contrast(1.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.65) 45%, rgba(15,23,42,0.85) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 32px',
          }}
        >
          <div style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <Badge variant="fire" size="sm" hasDot>
                MARIO × POKÉMON CROSSOVER
              </Badge>
              <Badge variant="warning" size="sm">
                ARCADE EDITION
              </Badge>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⭐ 100% Deterministic Engine
              </span>
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 900, margin: '0 0 6px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              Mushroom Kingdom Meets Kanto Arena
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4' }}>
              Jump over warp pipes, summon flame geysers, and clash in tactical 4v4 lane combat. Seed-based fairness guaranteed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                border: '2px solid #f59e0b',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                background: '#1e293b',
              }}
              title="Official Mascot: Mario-Cap Eevee"
            >
              <img
                src="/images/eevee_mario_mascot.jpg"
                alt="Mario Eevee Mascot"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              isLoading={quickStarting}
              onClick={handleQuickBattle}
              style={{ whiteSpace: 'nowrap' }}
            >
              ⚔️ Play Now
            </Button>
          </div>
        </div>
      </div>

      <section className="halloween-banner" aria-label="Halloween challenge">
        <span aria-hidden="true">🎃 👻</span>
        <div><h2>Luigi's Haunted Pipe Escape</h2><p>Choose a squad. Compare potion plans. Rescue two allies. Learn from every round.</p></div>
        <Button onClick={() => navigate('/scenarios/haunted_pipes')}>Enter haunted pipes</Button>
      </section>
      {/* Hero Section */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-8)',
          alignItems: 'center',
          padding: 'var(--space-4) 0',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-3)' }}>
            <Badge variant="fire" size="md" hasDot>
              Mushroom Kingdom × Kanto Arena
            </Badge>
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src="/images/eevee_mario_mascot.jpg" alt="Mascot" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
              Mascot: Mario Eevee
            </span>
          </div>
          <h1 className="text-display" style={{ marginBottom: 'var(--space-4)' }}>
            Halloween Arcade: Escape the Haunted Pipes.
          </h1>
          <p
            className="text-muted text-body"
            style={{ marginBottom: 'var(--space-6)', maxWidth: '520px' }}
          >
            Draft Mario, Luigi, Charizard, and Pikachu for a Halloween rescue. Outsmart warp pipes,
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

      {/* Arena Modes Visual Showcase */}
      <section style={{ marginTop: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 className="text-h2">Arena Battle Modes & Visual Showcase</h2>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-small)' }}>
            Experience competitive arcade brawls, drafting strategy, and championship tournaments.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
          {/* Roster Showcase */}
          <Card
            variant="interactive"
            onClick={() => navigate('/heroes')}
            style={{ overflow: 'hidden', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ height: '160px', overflow: 'hidden', position: 'relative', background: '#0f172a' }}>
              <img
                src="/images/smash_roster_banner.jpg"
                alt="All-Star Fighters Roster"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '12px 16px',
                }}
              >
                <Badge variant="fire" size="sm">
                  🥊 16+ FIGHTERS
                </Badge>
              </div>
            </div>
            <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 className="text-h3" style={{ marginBottom: 'var(--space-2)' }}>Fighters Roster</h3>
                <p className="text-muted text-small">
                  Compare elemental affinities, attack ranges, and special moves from Mario's Fireball to Charizard's Flamethrower.
                </p>
              </div>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm">
                  View Roster →
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Draft Chamber */}
          <Card
            variant="interactive"
            onClick={() => navigate('/scenarios')}
            style={{ overflow: 'hidden', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ height: '160px', overflow: 'hidden', position: 'relative', background: '#0f172a' }}>
              <img
                src="/images/trainer_mario_yoshis.jpg"
                alt="Trainer Mario & Yoshis"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '12px 16px',
                }}
              >
                <Badge variant="warning" size="sm">
                  ⚔️ SQUAD DRAFT
                </Badge>
              </div>
            </div>
            <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 className="text-h3" style={{ marginBottom: 'var(--space-2)' }}>Stages & Draft</h3>
                <p className="text-muted text-small">
                  Draft your 4-fighter composition at the warp pipe and counter enemy team synergies on custom hazard lanes.
                </p>
              </div>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm">
                  Draft Squad →
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Tournament Clash */}
          <Card
            variant="interactive"
            onClick={() => navigate('/tournament')}
            style={{ overflow: 'hidden', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ height: '160px', overflow: 'hidden', position: 'relative', background: '#0f172a' }}>
              <img
                src="/images/arena_battle_clash.jpg"
                alt="Tournament Arena Clash"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '12px 16px',
                }}
              >
                <Badge variant="error" size="sm">
                  🏆 TOURNAMENT CUP
                </Badge>
              </div>
            </div>
            <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 className="text-h3" style={{ marginBottom: 'var(--space-2)' }}>Championship Cup</h3>
                <p className="text-muted text-small">
                  Compete in an 8-team single elimination championship bracket. Crown the supreme cross-realm fighting champion!
                </p>
              </div>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm">
                  Enter Cup →
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
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
