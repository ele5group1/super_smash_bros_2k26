import React from "react";
import { Creature } from "../api";
import { Badge } from "./ui/Badge";

interface CreatureCardProps {
  creature: Creature;
  selected?: boolean;
  onSelect?: (c: Creature) => void;
  onInspect?: (c: Creature) => void;
  compact?: boolean;
  isDraggable?: boolean;
}

export const CreatureAvatar: React.FC<{
  type: string;
  size?: number;
  avatar?: string | null;
  id?: string;
}> = ({ type, size = 48, avatar, id }) => {
  const charKey = (avatar || id || "").toLowerCase();

  // 1. Ember Fox (Fiery pointed fox face with flame ears and amber eyes)
  if (charKey === "ember_fox") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Ember Fox">
        <circle cx="24" cy="24" r="22" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
        {/* Ears */}
        <polygon points="12,18 16,6 22,16" fill="#ef4444" stroke="#f59e0b" strokeWidth="1.5" />
        <polygon points="36,18 32,6 26,16" fill="#ef4444" stroke="#f59e0b" strokeWidth="1.5" />
        {/* Fox Face Contour */}
        <polygon points="12,18 36,18 24,38" fill="#ea580c" />
        <polygon points="17,21 31,21 24,34" fill="#fed7aa" />
        {/* Eyes */}
        <ellipse cx="20" cy="23" rx="2" ry="3" fill="#0f172a" />
        <ellipse cx="28" cy="23" rx="2" ry="3" fill="#0f172a" />
        <circle cx="20.5" cy="22" r="0.8" fill="#facc15" />
        <circle cx="28.5" cy="22" r="0.8" fill="#facc15" />
        {/* Nose & Whiskers */}
        <polygon points="23,31 25,31 24,33" fill="#0f172a" />
        <line x1="14" y1="27" x2="19" y2="28" stroke="#f97316" strokeWidth="1.5" />
        <line x1="34" y1="27" x2="29" y2="28" stroke="#f97316" strokeWidth="1.5" />
      </svg>
    );
  }

  // 2. Bubble Toad (Water toad with round eyes and gentle bubble cheeks)
  if (charKey === "bubble_toad") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Bubble Toad">
        <circle cx="24" cy="24" r="22" fill="#082f49" stroke="#06b6d4" strokeWidth="2" />
        {/* Head */}
        <ellipse cx="24" cy="26" rx="14" ry="11" fill="#0284c7" />
        {/* Big eyes */}
        <circle cx="16" cy="18" r="5" fill="#38bdf8" stroke="#082f49" strokeWidth="1.5" />
        <circle cx="32" cy="18" r="5" fill="#38bdf8" stroke="#082f49" strokeWidth="1.5" />
        <circle cx="16" cy="18" r="2" fill="#0f172a" />
        <circle cx="32" cy="18" r="2" fill="#0f172a" />
        <circle cx="17" cy="17" r="0.8" fill="#fff" />
        <circle cx="33" cy="17" r="0.8" fill="#fff" />
        {/* Cheeks & Smile */}
        <ellipse cx="24" cy="29" rx="8" ry="4" fill="#bae6fd" />
        <path d="M19 28 Q24 33 29 28" stroke="#0369a1" strokeWidth="1.8" strokeLinecap="round" />
        {/* Droplets */}
        <circle cx="10" cy="12" r="2" fill="#7dd3fc" opacity="0.8" />
        <circle cx="38" cy="13" r="2.5" fill="#7dd3fc" opacity="0.8" />
      </svg>
    );
  }

  // 3. Moss Shroom (Spore mushroom cap with cute curious eyes)
  if (charKey === "moss_shroom") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Moss Shroom">
        <circle cx="24" cy="24" r="22" fill="#052e16" stroke="#22c55e" strokeWidth="2" />
        {/* Cap */}
        <path d="M12 24 C12 12 36 12 36 24 Z" fill="#16a34a" />
        <circle cx="18" cy="18" r="2.5" fill="#86efac" />
        <circle cx="30" cy="18" r="2.5" fill="#86efac" />
        <circle cx="24" cy="14" r="2" fill="#86efac" />
        {/* Stem */}
        <rect x="18" y="24" width="12" height="12" rx="3" fill="#f0fdf4" />
        <circle cx="21" cy="28" r="1.5" fill="#052e16" />
        <circle cx="27" cy="28" r="1.5" fill="#052e16" />
        <path d="M22 32 Q24 34 26 32" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 4. Volt Hedgehog (Electric spiky quills and energetic spark cheeks)
  if (charKey === "volt_hedgehog") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Volt Hedgehog">
        <circle cx="24" cy="24" r="22" fill="#422006" stroke="#eab308" strokeWidth="2" />
        {/* Spikes */}
        <polygon points="24,6 20,16 28,16" fill="#eab308" />
        <polygon points="14,10 18,18 10,18" fill="#eab308" />
        <polygon points="34,10 38,18 30,18" fill="#eab308" />
        <polygon points="8,22 18,22 14,28" fill="#eab308" />
        <polygon points="40,22 34,28 30,22" fill="#eab308" />
        {/* Body */}
        <circle cx="24" cy="27" r="11" fill="#fef08a" />
        <circle cx="20" cy="26" r="1.8" fill="#713f12" />
        <circle cx="28" cy="26" r="1.8" fill="#713f12" />
        <polygon points="23,31 25,31 24,33" fill="#713f12" />
        <line x1="21" y1="21" x2="23" y2="24" stroke="#ca8a04" strokeWidth="1.5" />
        <line x1="27" y1="21" x2="25" y2="24" stroke="#ca8a04" strokeWidth="1.5" />
      </svg>
    );
  }

  // 5. Crag Golem (Ancient carved stone slab with glowing runes)
  if (charKey === "crag_golem") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Crag Golem">
        <circle cx="24" cy="24" r="22" fill="#1c1917" stroke="#a8a29e" strokeWidth="2" />
        {/* Stone block head */}
        <polygon points="14,14 34,14 38,34 10,34" fill="#78716c" stroke="#a8a29e" strokeWidth="1.5" />
        {/* Glowing runic eye slits */}
        <rect x="16" y="21" width="5" height="3" rx="1" fill="#38bdf8" />
        <rect x="27" y="21" width="5" height="3" rx="1" fill="#38bdf8" />
        {/* Cracks */}
        <path d="M24 14 L24 20 L22 25 L24 34" stroke="#44403c" strokeWidth="1.5" />
      </svg>
    );
  }

  // 6. Flame Salamander (Amphibious fire lizard with crest)
  if (charKey === "flame_salamander") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Flame Salamander">
        <circle cx="24" cy="24" r="22" fill="#450a0a" stroke="#f97316" strokeWidth="2" />
        {/* Head */}
        <ellipse cx="24" cy="26" rx="13" ry="10" fill="#dc2626" />
        {/* Flame Frills */}
        <polygon points="11,20 6,14 13,16" fill="#f59e0b" />
        <polygon points="37,20 42,14 35,16" fill="#f59e0b" />
        <polygon points="10,26 4,24 10,28" fill="#f97316" />
        <polygon points="38,26 44,24 38,28" fill="#f97316" />
        {/* Eyes */}
        <circle cx="18" cy="23" r="3" fill="#fef08a" />
        <circle cx="30" cy="23" r="3" fill="#fef08a" />
        <ellipse cx="18" cy="23" rx="1" ry="2.5" fill="#450a0a" />
        <ellipse cx="30" cy="23" rx="1" ry="2.5" fill="#450a0a" />
        {/* Snout */}
        <ellipse cx="24" cy="30" rx="5" ry="2" fill="#991b1b" />
      </svg>
    );
  }

  // 7. Stream Turtle (Domed water turtle with shell)
  if (charKey === "stream_turtle") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Stream Turtle">
        <circle cx="24" cy="24" r="22" fill="#082f49" stroke="#0ea5e9" strokeWidth="2" />
        {/* Shell */}
        <ellipse cx="24" cy="27" rx="14" ry="11" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
        {/* Shell plates */}
        <polygon points="24,20 18,25 24,30 30,25" fill="#0284c7" />
        {/* Head */}
        <circle cx="24" cy="15" r="7" fill="#38bdf8" />
        <circle cx="21" cy="14" r="1.5" fill="#082f49" />
        <circle cx="27" cy="14" r="1.5" fill="#082f49" />
      </svg>
    );
  }

  // 8. Bramble Hound (Spiky foliage canine with pointed ears)
  if (charKey === "bramble_hound") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Bramble Hound">
        <circle cx="24" cy="24" r="22" fill="#052e16" stroke="#4ade80" strokeWidth="2" />
        {/* Hound Ears */}
        <polygon points="12,19 8,8 18,15" fill="#15803d" />
        <polygon points="36,19 40,8 30,15" fill="#15803d" />
        {/* Head */}
        <polygon points="14,17 34,17 29,33 19,33" fill="#16a34a" />
        {/* Muzzle */}
        <polygon points="20,27 28,27 24,35" fill="#86efac" />
        <circle cx="24" cy="33" r="1.5" fill="#052e16" />
        {/* Eyes */}
        <circle cx="19" cy="22" r="2" fill="#fef08a" />
        <circle cx="29" cy="22" r="2" fill="#fef08a" />
        <circle cx="19" cy="22" r="1" fill="#052e16" />
        <circle cx="29" cy="22" r="1" fill="#052e16" />
      </svg>
    );
  }

  // 9. Spark Finch (Swift lightning bird with sharp crest)
  if (charKey === "spark_finch") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Spark Finch">
        <circle cx="24" cy="24" r="22" fill="#422006" stroke="#facc15" strokeWidth="2" />
        {/* Crest */}
        <polygon points="24,6 20,15 28,15" fill="#facc15" />
        <polygon points="26,10 32,8 29,16" fill="#f59e0b" />
        {/* Head */}
        <circle cx="24" cy="22" r="10" fill="#eab308" />
        {/* Beak */}
        <polygon points="24,24 24,32 32,27" fill="#f97316" />
        {/* Eye */}
        <circle cx="21" cy="20" r="2.5" fill="#fff" />
        <circle cx="21" cy="20" r="1.2" fill="#422006" />
      </svg>
    );
  }

  // 10. Pebble Armadillo (Banded rock armadillo)
  if (charKey === "pebble_armadillo") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Pebble Armadillo">
        <circle cx="24" cy="24" r="22" fill="#1c1917" stroke="#78716c" strokeWidth="2" />
        {/* Armored bands */}
        <ellipse cx="24" cy="26" rx="14" ry="11" fill="#57534e" />
        <path d="M13 22 Q24 16 35 22" stroke="#a8a29e" strokeWidth="2" fill="none" />
        <path d="M11 27 Q24 21 37 27" stroke="#a8a29e" strokeWidth="2" fill="none" />
        <path d="M13 32 Q24 26 35 32" stroke="#a8a29e" strokeWidth="2" fill="none" />
        {/* Snout */}
        <polygon points="21,32 27,32 24,38" fill="#d6d3d1" />
        <circle cx="24" cy="36" r="1" fill="#1c1917" />
        {/* Eyes */}
        <circle cx="18" cy="26" r="1.5" fill="#0f172a" />
        <circle cx="30" cy="26" r="1.5" fill="#0f172a" />
      </svg>
    );
  }

  // Default Elemental Icons
  switch (type.toLowerCase()) {
    case "fire":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Fire Creature">
          <circle cx="24" cy="24" r="22" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
          <path d="M24 8 C18 16 14 22 14 28 C14 34 18 38 24 38 C30 38 34 34 34 28 C34 22 30 16 24 8 Z" fill="#ef4444" />
          <path d="M24 16 C20 22 18 26 18 30 C18 34 21 36 24 36 C27 36 30 34 30 30 C30 26 28 22 24 16 Z" fill="#f59e0b" />
          <circle cx="20" cy="26" r="2.5" fill="#fff" />
          <circle cx="28" cy="26" r="2.5" fill="#fff" />
        </svg>
      );
    case "water":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Water Creature">
          <circle cx="24" cy="24" r="22" fill="#082f49" stroke="#06b6d4" strokeWidth="2" />
          <path d="M24 8 C24 8 13 22 13 29 C13 35 18 40 24 40 C30 40 35 35 35 29 C35 22 24 8 24 8 Z" fill="#06b6d4" />
          <circle cx="20" cy="28" r="3" fill="#fff" />
          <circle cx="28" cy="28" r="3" fill="#fff" />
        </svg>
      );
    case "grass":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Grass Creature">
          <circle cx="24" cy="24" r="22" fill="#052e16" stroke="#22c55e" strokeWidth="2" />
          <path d="M24 10 C14 16 12 30 24 38 C36 30 34 16 24 10 Z" fill="#22c55e" />
          <circle cx="19" cy="24" r="2.5" fill="#fff" />
          <circle cx="29" cy="24" r="2.5" fill="#fff" />
        </svg>
      );
    case "electric":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Electric Creature">
          <circle cx="24" cy="24" r="22" fill="#422006" stroke="#eab308" strokeWidth="2" />
          <polygon points="26,8 14,24 23,24 20,40 34,22 25,22" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
        </svg>
      );
    case "stone":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Stone Creature">
          <circle cx="24" cy="24" r="22" fill="#1c1917" stroke="#a8a29e" strokeWidth="2" />
          <polygon points="24,10 36,18 34,34 24,40 14,34 12,18" fill="#78716c" stroke="#a8a29e" strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Creature Avatar">
          <circle cx="24" cy="24" r="22" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="24" cy="24" r="10" fill="#94a3b8" />
        </svg>
      );
  }
};

const FLAVOR_QUOTES: Record<string, string> = {
  mario: '"Let\'s-a go!" • All-round Mushroom Kingdom champion',
  charizard: '"Spits fire hot enough to melt solid boulders."',
  luigi: '"I\'m-a number one!" • High-mobility poltergeist master',
  gengar: '"Hides in shadows, waiting for the critical strike."',
  pikachu: '"Pika-pika!" • High voltage electric speed demon',
  link_hero: '"Courage never yields." • Master sword tactician',
  samus: '"Hunter of the stars." • Armored power beam sniper',
  mewtwo: '"A legendary psychic creation of unparalleled psionic power."',
  kirby: '"Poyo!" • Inhales hazards and turns the tides',
  yoshi: '"Yoshi!" • Egg-flinging agile team defender',
  bowser_boss: '"King of the Koopas • Lord of Molten Flame"',
  ember_fox: '"Swift ember stalker of the cinder forest."',
  bubble_toad: '"Splashes high-pressure bubbles in muddy lanes."',
  moss_shroom: '"Durable fungal guardian absorbing heavy shocks."',
  volt_hedgehog: '"Zips through obstacles with static fury."',
  crag_golem: '"Living bedrock immovable by ordinary force."',
};

export const CreatureCard: React.FC<CreatureCardProps> = ({
  creature,
  selected = false,
  onSelect,
  onInspect,
  compact = false,
  isDraggable = true,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", creature.id);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onClick={() => onSelect && onSelect(creature)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(creature);
        }
      }}
      className={`ui-card ui-card-interactive ${selected ? "ui-card-accent" : ""}`}
      style={{
        padding: compact ? "var(--space-2)" : "var(--space-3)",
        borderColor: selected ? "var(--accent-primary)" : undefined,
        background: selected ? "var(--accent-subtle)" : undefined,
      }}
      data-testid={`creature-card-${creature.id}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <CreatureAvatar
          type={creature.type}
          avatar={creature.avatar}
          id={creature.id}
          size={compact ? 36 : 48}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span style={{ fontWeight: "var(--font-weight-bold)", fontSize: compact ? "13px" : "15px" }}>
              {creature.name}
            </span>
            <Badge variant={creature.type as any} size="sm">
              {creature.type}
            </Badge>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "2px", fontSize: "12px", color: "var(--text-muted)" }}>
            <span>HP: <strong style={{ color: "var(--text-primary)" }}>{creature.hp}</strong></span>
            <span>ATK: <strong style={{ color: "var(--text-primary)" }}>{creature.attack}</strong></span>
            <span>SPD: <strong style={{ color: "var(--text-primary)" }}>{creature.speed}</strong></span>
          </div>
          {!compact && (
            <div style={{ fontSize: "11px", fontStyle: "italic", color: "var(--text-muted)", marginTop: "3px" }}>
              {FLAVOR_QUOTES[creature.id] || "Ready for combat in the arena."}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          {onInspect && (
            <button
              type="button"
              className="ui-btn ui-btn-ghost ui-btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(creature);
              }}
              title="Inspect creature details"
              aria-label={`Inspect ${creature.name}`}
            >
              ℹ️
            </button>
          )}

          {selected && (
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--accent-primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
