import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Hero } from '../api';
import { CreatureAvatar } from '../components/CreatureCard';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';

export const HeroesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'hp' | 'attack' | 'speed'>('name');

  // Selected hero for detail inspection drawer
  const [activeHero, setActiveHero] = useState<Hero | null>(null);

  useEffect(() => {
    async function fetchHeroes() {
      setLoading(true);
      try {
        const data = await api.getHeroes();
        setHeroes(data);
      } catch (err: any) {
        setErrorMsg('Failed to load heroes directory: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHeroes();
  }, []);

  // Filtered & Sorted heroes list
  const filteredHeroes = useMemo(() => {
    return heroes
      .filter((hero) => {
        // Search query
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          hero.name.toLowerCase().includes(q) ||
          hero.role.toLowerCase().includes(q) ||
          hero.type.toLowerCase().includes(q) ||
          hero.description.toLowerCase().includes(q) ||
          hero.moves.some((m) => m.toLowerCase().includes(q));

        // Element filter
        const matchesElement =
          selectedElement === 'all' || hero.type.toLowerCase() === selectedElement.toLowerCase();

        // Role filter
        const matchesRole =
          selectedRole === 'all' ||
          hero.role.toLowerCase().includes(selectedRole.toLowerCase());

        return matchesQuery && matchesElement && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === 'hp') return b.hp - a.hp;
        if (sortBy === 'attack') return b.attack - a.attack;
        if (sortBy === 'speed') return b.speed - a.speed;
        return a.name.localeCompare(b.name);
      });
  }, [heroes, searchQuery, selectedElement, selectedRole, sortBy]);

  const handleDraftHero = (hero: Hero) => {
    try {
      const saved = localStorage.getItem('last_selected_team');
      let team: string[] = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(team)) team = [];

      if (!team.includes(hero.id)) {
        if (team.length >= 4) {
          team[team.length - 1] = hero.id;
        } else {
          team.push(hero.id);
        }
        localStorage.setItem('last_selected_team', JSON.stringify(team));
        success(`${hero.name} drafted to battle squad!`);
      } else {
        success(`${hero.name} is already in your active squad.`);
      }
    } catch {
      localStorage.setItem('last_selected_team', JSON.stringify([hero.id]));
    }
    navigate('/scenarios');
  };

  const getElementColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fire':
        return '#ef4444';
      case 'water':
        return '#0284c7';
      case 'grass':
        return '#16a34a';
      case 'electric':
        return '#eab308';
      case 'stone':
        return '#78716c';
      default:
        return '#64748b';
    }
  };

  const getElementAffinityInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fire':
        return { strongAgainst: ['Grass'], weakAgainst: ['Water', 'Stone'] };
      case 'water':
        return { strongAgainst: ['Fire', 'Stone'], weakAgainst: ['Electric', 'Grass'] };
      case 'grass':
        return { strongAgainst: ['Water', 'Stone'], weakAgainst: ['Fire'] };
      case 'electric':
        return { strongAgainst: ['Water'], weakAgainst: ['Stone'] };
      case 'stone':
        return { strongAgainst: ['Fire', 'Electric'], weakAgainst: ['Water', 'Grass'] };
      default:
        return { strongAgainst: [], weakAgainst: [] };
    }
  };

  return (
    <div className="heroes-screen page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Smash All-Stars Roster Banner */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '24px',
          border: '2px solid rgba(234, 179, 8, 0.4)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          background: '#090d16',
          height: '210px',
        }}
      >
        <img
          src="/images/smash_roster_banner.jpg"
          alt="Super Smash Bros All-Stars Roster"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 22%',
            filter: 'brightness(0.9) contrast(1.15)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.9) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 32px',
          }}
        >
          <div style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <Badge variant="fire" size="sm">🥊 SMASH ALL-STARS</Badge>
              <Badge variant="warning" size="sm">16+ PLAYABLE FIGHTERS</Badge>
              <span style={{ fontSize: '12px', color: '#facc15', fontWeight: 600 }}>⭐ All Affinities Unlocked</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 6px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
              Fighters & Combatants Roster
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              Inspect base stats, elemental affinities, special moves, and recruit units directly to your squad.
            </p>
          </div>

          <Button variant="primary" size="md" onClick={() => navigate('/scenarios')} style={{ whiteSpace: 'nowrap' }}>
            ⚔️ Go to Battle Draft
          </Button>
        </div>
      </div>

        {/* Filter Controls Bar */}
        <div
          className="heroes-controls"
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            background: 'var(--card-bg, #1e293b)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #334155)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search box */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔍</span>
            <input
              type="text"
              placeholder="Search hero, role, or move..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ui-input"
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                background: 'var(--input-bg, #0f172a)',
                border: '1px solid var(--border-color, #334155)',
                color: 'var(--text-primary, #f8fafc)',
              }}
              id="hero-search-input"
            />
          </div>

          {/* Element Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginRight: '4px' }}>Element:</span>
            {['all', 'fire', 'water', 'grass', 'electric', 'stone'].map((elem) => (
              <button
                key={elem}
                type="button"
                onClick={() => setSelectedElement(elem)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  border: selectedElement === elem ? '1px solid currentColor' : '1px solid transparent',
                  background:
                    selectedElement === elem
                      ? `${getElementColor(elem)}25`
                      : 'rgba(255, 255, 255, 0.05)',
                  color: selectedElement === elem ? getElementColor(elem) : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                {elem === 'all' ? 'All Elements' : elem}
              </button>
            ))}
          </div>

          {/* Sort By Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="ui-select"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'var(--input-bg, #0f172a)',
                border: '1px solid var(--border-color, #334155)',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '13px',
              }}
              id="hero-sort-select"
            >
              <option value="name">Name (A-Z)</option>
              <option value="hp">Highest HP</option>
              <option value="attack">Highest Attack</option>
              <option value="speed">Highest Speed</option>
            </select>
          </div>
        </div>

      {/* Hero Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height="280px" style={{ borderRadius: '12px' }} />
          ))}
        </div>
      ) : errorMsg ? (
        <EmptyState title="Error Loading Heroes" description={errorMsg} />
      ) : filteredHeroes.length === 0 ? (
        <EmptyState
          title="No Heroes Found"
          description={`No combatants match search "${searchQuery}" with the current element and role filters.`}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedElement('all');
            setSelectedRole('all');
          }}
        />
      ) : (
        <div
          className="heroes-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredHeroes.map((hero) => {
            const elemColor = getElementColor(hero.type);
            const maxHp = 220;
            const maxAtk = 60;
            const maxSpd = 85;

            return (
              <Card
                key={hero.id}
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color, #334155)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                }}
                className="hero-card-hover"
              >
                {/* Header Banner */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: `linear-gradient(135deg, ${elemColor}18 0%, rgba(15, 23, 42, 0.7) 100%)`,
                    borderBottom: '1px solid var(--border-color, #334155)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        padding: '4px',
                        borderRadius: '50%',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: `2px solid ${elemColor}`,
                      }}
                    >
                      <CreatureAvatar type={hero.type} size={48} id={hero.id} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                        {hero.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: elemColor,
                            color: '#fff',
                          }}
                        >
                          {hero.type}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#cbd5e1',
                          }}
                        >
                          {hero.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <CardBody style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1, gap: '14px' }}>
                  {/* Description */}
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    {hero.description}
                  </p>

                  {/* Attributes Gauges */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* HP */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>Health (HP)</span>
                        <span style={{ color: '#f8fafc', fontWeight: 700 }}>{hero.hp}</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (hero.hp / maxHp) * 100)}%`,
                            background: '#10b981',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Attack */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>Attack (Power)</span>
                        <span style={{ color: '#f8fafc', fontWeight: 700 }}>{hero.attack}</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (hero.attack / maxAtk) * 100)}%`,
                            background: '#ef4444',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Speed */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>Speed (Initiative)</span>
                        <span style={{ color: '#f8fafc', fontWeight: 700 }}>{hero.speed}</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (hero.speed / maxSpd) * 100)}%`,
                            background: '#38bdf8',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Moves Tag Previews */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                      Move Pool ({hero.moves.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {hero.moves.map((moveId) => {
                        const detail = hero.moves_detail?.find((m) => m.id === moveId);
                        return (
                          <span
                            key={moveId}
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{detail?.name || moveId.replace('_', ' ')}</span>
                            {detail && detail.cost_coins > 0 && (
                              <span style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 700 }}>
                                🪙{detail.cost_coins}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ flex: 1 }}
                      onClick={() => setActiveHero(hero)}
                    >
                      📖 Inspect
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      style={{ flex: 1 }}
                      onClick={() => handleDraftHero(hero)}
                    >
                      ➕ Draft Hero
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inspect Hero Detail Drawer */}
      <Drawer
        isOpen={activeHero !== null}
        onClose={() => setActiveHero(null)}
        title={activeHero ? `${activeHero.name} — Combat Dossier` : 'Hero Dossier'}
      >
        {activeHero && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
            {/* Hero Profile Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${getElementColor(activeHero.type)}25 0%, rgba(15, 23, 42, 0.8) 100%)`,
                border: `1px solid ${getElementColor(activeHero.type)}50`,
              }}
            >
              <CreatureAvatar type={activeHero.type} size={64} id={activeHero.id} />
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>{activeHero.name}</h2>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <Badge variant={activeHero.type as any}>{activeHero.type.toUpperCase()}</Badge>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                    }}
                  >
                    {activeHero.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Lore */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px 0', color: '#94a3b8' }}>
                TACTICAL PROFILE
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
                {activeHero.description}
              </p>
            </div>

            {/* Matchup Advantages */}
            {(() => {
              const aff = getElementAffinityInfo(activeHero.type);
              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, #334155)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                      🔥 Super Effective (1.5x)
                    </span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {aff.strongAgainst.length > 0 ? (
                        aff.strongAgainst.map((e) => (
                          <span
                            key={e}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#064e3b',
                              color: '#6ee7b7',
                            }}
                          >
                            {e}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Neutral</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                      ⚠️ Vulnerable To (0.75x)
                    </span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {aff.weakAgainst.length > 0 ? (
                        aff.weakAgainst.map((e) => (
                          <span
                            key={e}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#450a0a',
                              color: '#fca5a5',
                            }}
                          >
                            {e}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Neutral</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Detailed Moves Table */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px 0', color: '#94a3b8' }}>
                TACTICAL MOVES & TECHNIQUES
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeHero.moves_detail && activeHero.moves_detail.length > 0 ? (
                  activeHero.moves_detail.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color, #334155)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>{m.name}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: getElementColor(m.type),
                              color: '#fff',
                              fontWeight: 700,
                            }}
                          >
                            {m.type.toUpperCase()}
                          </span>
                          {m.cost_coins > 0 ? (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                fontWeight: 700,
                              }}
                            >
                              🪙 {m.cost_coins} Coins
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: '#94a3b8',
                              }}
                            >
                              Free
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
                        <span>
                          Power: <strong style={{ color: '#f8fafc' }}>{m.power > 0 ? m.power : '— (Utility)'}</strong>
                        </span>
                        <span>
                          Accuracy: <strong style={{ color: '#f8fafc' }}>{Math.round(m.accuracy * 100)}%</strong>
                        </span>
                        <span>
                          Target: <strong style={{ color: '#f8fafc' }}>{m.target_type}</strong>
                        </span>
                        {m.effect && (
                          <span>
                            Effect: <strong style={{ color: '#38bdf8' }}>{m.effect} ({Math.round(m.effect_chance * 100)}%)</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>No move details available.</span>
                )}
              </div>
            </div>

            {/* Bottom Drawer CTA */}
            <div style={{ marginTop: '10px' }}>
              <Button
                variant="primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => {
                  handleDraftHero(activeHero);
                  setActiveHero(null);
                }}
              >
                ⚔️ Add {activeHero.name} to Battle Squad
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
