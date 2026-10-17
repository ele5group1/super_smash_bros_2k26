import React from "react";
import { Creature } from "../api";

interface CreatureCardProps {
  creature: Creature;
  selected?: boolean;
  onSelect?: (c: Creature) => void;
  compact?: boolean;
}

export const CreatureAvatar: React.FC<{
  type: string;
  size?: number;
  avatar?: string | null;
  id?: string;
}> = ({ type, size = 48, avatar, id }) => {
  const charKey = (avatar || id || "").toLowerCase();

  // 1. Mario (Signature red cap with M, bulbous nose, mustache, blue collar)
  if (charKey === "mario") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Mario">
        <circle cx="24" cy="24" r="22" fill="#991b1b" stroke="#f59e0b" strokeWidth="2" />
        {/* Cap Visor & Dome */}
        <path d="M12 20 C12 12 18 8 24 8 C30 8 36 12 36 20 Z" fill="#ef4444" />
        <ellipse cx="24" cy="20" rx="15" ry="3.5" fill="#dc2626" />
        {/* Emblem White Circle with Red M */}
        <circle cx="24" cy="14" r="5" fill="#fff" />
        <path d="M21.5 16.5 L21.5 12 L24 14.5 L26.5 12 L26.5 16.5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Face */}
        <ellipse cx="24" cy="27" rx="10" ry="8" fill="#fed7aa" />
        {/* Blue Overalls Collar */}
        <path d="M16 34 Q24 40 32 34 L32 40 Q24 46 16 40 Z" fill="#2563eb" />
        <circle cx="20" cy="38" r="1.5" fill="#facc15" />
        <circle cx="28" cy="38" r="1.5" fill="#facc15" />
        {/* Eyes */}
        <ellipse cx="20.5" cy="25" rx="1.5" ry="2.5" fill="#1d4ed8" />
        <ellipse cx="27.5" cy="25" rx="1.5" ry="2.5" fill="#1d4ed8" />
        <circle cx="20" cy="24" r="0.7" fill="#fff" />
        <circle cx="27" cy="24" r="0.7" fill="#fff" />
        {/* Big Nose */}
        <ellipse cx="24" cy="27" rx="4" ry="2.8" fill="#fdba74" />
        {/* Mustache */}
        <path d="M16 29 C18 27 21 28 24 29.5 C27 28 30 27 32 29 C33 32 30 33 27 31 C24 32.5 21 31.5 16 29 Z" fill="#451a03" />
      </svg>
    );
  }

  // 2. Luigi (Signature green cap with L, curved mustache)
  if (charKey === "luigi") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Luigi">
        <circle cx="24" cy="24" r="22" fill="#14532d" stroke="#86efac" strokeWidth="2" />
        {/* Green Cap */}
        <path d="M13 19 C13 10 18 7 24 7 C30 7 35 10 35 19 Z" fill="#16a34a" />
        <ellipse cx="24" cy="19" rx="14" ry="3.5" fill="#15803d" />
        {/* White Emblem with green L */}
        <circle cx="24" cy="13" r="4.5" fill="#fff" />
        <path d="M22.5 11 L22.5 15.5 L25.5 15.5" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Face */}
        <ellipse cx="24" cy="26" rx="9" ry="8" fill="#fed7aa" />
        {/* Green Shirt Collar & Overalls */}
        <path d="M17 34 Q24 39 31 34 L31 40 Q24 45 17 40 Z" fill="#2563eb" />
        <circle cx="20.5" cy="38" r="1.4" fill="#facc15" />
        <circle cx="27.5" cy="38" r="1.4" fill="#facc15" />
        {/* Eyes */}
        <ellipse cx="21" cy="24.5" rx="1.4" ry="2.5" fill="#1d4ed8" />
        <ellipse cx="27" cy="24.5" rx="1.4" ry="2.5" fill="#1d4ed8" />
        {/* Nose */}
        <ellipse cx="24" cy="26.5" rx="3.5" ry="2.6" fill="#fdba74" />
        {/* Curved Mustache */}
        <path d="M17 28.5 C19 26 22 28 24 29 C26 28 29 26 31 28.5 C31.5 31 29 32 26 30.5 C24 31.5 21 31 17 28.5 Z" fill="#451a03" />
      </svg>
    );
  }

  // 3. Pikachu (Pointed black-tipped ears, electric cheeks, bright yellow face)
  if (charKey === "pikachu") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Pikachu">
        <circle cx="24" cy="24" r="22" fill="#713f12" stroke="#facc15" strokeWidth="2" />
        {/* Left Ear */}
        <polygon points="12,20 6,4 16,14" fill="#facc15" />
        <polygon points="8,9 6,4 12,6" fill="#000" />
        {/* Right Ear */}
        <polygon points="36,20 42,4 32,14" fill="#facc15" />
        <polygon points="40,9 42,4 36,6" fill="#000" />
        {/* Face */}
        <ellipse cx="24" cy="26" rx="14" ry="12" fill="#facc15" />
        {/* Cheeks */}
        <circle cx="14" cy="30" r="3.6" fill="#ef4444" />
        <circle cx="34" cy="30" r="3.6" fill="#ef4444" />
        {/* Eyes */}
        <circle cx="19" cy="24" r="2.8" fill="#18181b" />
        <circle cx="18" cy="23" r="1" fill="#fff" />
        <circle cx="29" cy="24" r="2.8" fill="#18181b" />
        <circle cx="28" cy="23" r="1" fill="#fff" />
        {/* Tiny nose & mouth */}
        <circle cx="24" cy="27" r="0.8" fill="#000" />
        <path d="M21.5 29 Q24 31 26.5 29" stroke="#713f12" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  // 4. Charizard (Orange dragon, horns, teal inner wing)
  if (charKey === "charizard") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Charizard">
        <circle cx="24" cy="24" r="22" fill="#431407" stroke="#ea580c" strokeWidth="2" />
        {/* Dual Horns */}
        <path d="M19 14 C16 8 10 7 8 10 C12 12 15 15 17 18 Z" fill="#ea580c" />
        <path d="M29 14 C32 8 38 7 40 10 C36 12 33 15 31 18 Z" fill="#ea580c" />
        {/* Head */}
        <path d="M16 16 C16 12 32 12 32 16 C34 20 36 28 32 34 C28 38 20 38 16 34 C12 28 14 20 16 16 Z" fill="#f97316" />
        {/* Snout */}
        <ellipse cx="24" cy="30" rx="6" ry="4" fill="#fb923c" />
        <circle cx="22" cy="29" r="0.8" fill="#431407" />
        <circle cx="26" cy="29" r="0.8" fill="#431407" />
        {/* Fierce Eyes */}
        <polygon points="18,22 22,23 20,25" fill="#06b6d4" />
        <polygon points="30,22 26,23 28,25" fill="#06b6d4" />
        {/* Flame Tongue */}
        <path d="M23 33 Q24 37 25 33" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  // 5. Blastoise (Blue turtle with dual silver shoulder cannons)
  if (charKey === "blastoise") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Blastoise">
        <circle cx="24" cy="24" r="22" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
        {/* Hydro Cannons */}
        <rect x="7" y="10" width="7" height="14" rx="2" transform="rotate(-25 10 17)" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
        <rect x="34" y="10" width="7" height="14" rx="2" transform="rotate(25 37 17)" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
        {/* Shell Rim */}
        <ellipse cx="24" cy="32" rx="14" ry="10" fill="#78350f" stroke="#fef08a" strokeWidth="2" />
        {/* Head */}
        <circle cx="24" cy="22" r="9" fill="#60a5fa" />
        {/* Ears */}
        <ellipse cx="16" cy="16" rx="2" ry="4" transform="rotate(-30 16 16)" fill="#bfdbfe" />
        <ellipse cx="32" cy="16" rx="2" ry="4" transform="rotate(30 32 16)" fill="#bfdbfe" />
        {/* Eyes */}
        <ellipse cx="20.5" cy="21" rx="1.5" ry="2" fill="#78350f" />
        <ellipse cx="27.5" cy="21" rx="1.5" ry="2" fill="#78350f" />
        {/* Tough Jaw */}
        <path d="M20 27 Q24 29 28 27" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 6. Venusaur (Turquoise with giant pink flower bloom)
  if (charKey === "venusaur") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Venusaur">
        <circle cx="24" cy="24" r="22" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
        {/* Palm Fronds */}
        <path d="M12 18 C16 12 24 16 24 16 C24 16 20 22 12 18 Z" fill="#15803d" />
        <path d="M36 18 C32 12 24 16 24 16 C24 16 28 22 36 18 Z" fill="#15803d" />
        {/* Big Pink Flower */}
        <circle cx="24" cy="14" r="5" fill="#f43f5e" />
        <circle cx="19" cy="13" r="4" fill="#fb7185" />
        <circle cx="29" cy="13" r="4" fill="#fb7185" />
        <circle cx="24" cy="9" r="4" fill="#fda4af" />
        <circle cx="24" cy="14" r="2.5" fill="#facc15" />
        {/* Broad Head */}
        <path d="M15 24 C14 34 34 34 33 24 C33 20 15 20 15 24 Z" fill="#2dd4bf" />
        {/* Eyes */}
        <polygon points="18,24 22,25 20,27" fill="#ef4444" />
        <polygon points="30,24 26,25 28,27" fill="#ef4444" />
        {/* Fangs */}
        <polygon points="19,30 21,30 20,28" fill="#fff" />
        <polygon points="27,30 29,30 28,28" fill="#fff" />
      </svg>
    );
  }

  // 7. Yoshi (Green snout, big cartoon eyes, orange spikes)
  if (charKey === "yoshi") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Yoshi">
        <circle cx="24" cy="24" r="22" fill="#14532d" stroke="#a3e635" strokeWidth="2" />
        {/* Red Saddle / Crest */}
        <ellipse cx="14" cy="30" rx="3" ry="5" fill="#ef4444" />
        {/* Big Round Green Snout */}
        <ellipse cx="28" cy="26" rx="9" ry="8" fill="#84cc16" />
        {/* White Cheek Patch */}
        <ellipse cx="26" cy="30" rx="7" ry="5" fill="#f7fee7" />
        {/* Big Friendly Eyes */}
        <ellipse cx="20" cy="17" rx="3.5" ry="6" fill="#fff" stroke="#4d7c0f" strokeWidth="1" />
        <ellipse cx="26" cy="17" rx="3.5" ry="6" fill="#fff" stroke="#4d7c0f" strokeWidth="1" />
        <ellipse cx="21" cy="17" rx="1.8" ry="3" fill="#1e3a8a" />
        <ellipse cx="27" cy="17" rx="1.8" ry="3" fill="#1e3a8a" />
        <circle cx="20.5" cy="16" r="0.8" fill="#fff" />
        <circle cx="26.5" cy="16" r="0.8" fill="#fff" />
        {/* Nostril */}
        <circle cx="33" cy="23" r="1.2" fill="#3f6212" />
        {/* Orange Head Spikes */}
        <polygon points="16,14 12,11 16,9" fill="#f97316" />
        <polygon points="17,20 13,17 17,15" fill="#f97316" />
      </svg>
    );
  }

  // 8. Gengar (Purple shadow, glowing red eyes, wide grin)
  if (charKey === "gengar") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Gengar">
        <circle cx="24" cy="24" r="22" fill="#3b0764" stroke="#a855f7" strokeWidth="2" />
        {/* Spiky Ghost Body */}
        <path d="M12 16 L17 12 L20 16 L24 11 L28 16 L31 12 L36 16 C38 24 37 34 24 37 C11 34 10 24 12 16 Z" fill="#6b21a8" />
        {/* Menacing Triangular Red Eyes */}
        <polygon points="16,21 21,24 17,25" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
        <polygon points="32,21 27,24 31,25" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
        {/* Huge Toothy Grin */}
        <path d="M16 28 Q24 36 32 28 Q24 32 16 28 Z" fill="#fff" stroke="#3b0764" strokeWidth="1.2" />
        <line x1="20" y1="29" x2="20" y2="31" stroke="#3b0764" strokeWidth="1" />
        <line x1="24" y1="30" x2="24" y2="33" stroke="#3b0764" strokeWidth="1" />
        <line x1="28" y1="29" x2="28" y2="31" stroke="#3b0764" strokeWidth="1" />
      </svg>
    );
  }

  // 9. King Bowser (Spiked shell, horns, fiery mane, fangs)
  if (charKey === "bowser") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="King Bowser">
        <circle cx="24" cy="24" r="22" fill="#18181b" stroke="#dc2626" strokeWidth="2" />
        {/* Spiked Turtle Shell Backing */}
        <path d="M10 26 C10 14 38 14 38 26 C38 38 10 38 10 26 Z" fill="#15803d" stroke="#f59e0b" strokeWidth="2" />
        {/* Horns */}
        <polygon points="14,14 8,7 18,10" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        <polygon points="34,14 40,7 30,10" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        {/* Red Fiery Hair Mane */}
        <path d="M20 7 Q24 2 28 7 Q24 12 20 7 Z" fill="#ef4444" />
        <path d="M17 10 Q24 4 25 12 Z" fill="#f97316" />
        {/* Snout & Head */}
        <ellipse cx="24" cy="26" rx="9" ry="7" fill="#f59e0b" />
        {/* Angry Glowing Red Eyes */}
        <circle cx="20" cy="22" r="2" fill="#ef4444" />
        <circle cx="28" cy="22" r="2" fill="#ef4444" />
        <circle cx="20" cy="22" r="0.8" fill="#fff" />
        <circle cx="28" cy="22" r="0.8" fill="#fff" />
        {/* Fanged Mouth */}
        <path d="M17 28 Q24 33 31 28" stroke="#78350f" strokeWidth="1.8" fill="none" />
        <polygon points="19,28 20,31 21,28" fill="#fff" />
        <polygon points="27,28 28,31 29,28" fill="#fff" />
      </svg>
    );
  }

  // 10. Mewtwo (Psychic crown, lavender sleek alien feline)
  if (charKey === "mewtwo") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Mewtwo">
        <circle cx="24" cy="24" r="22" fill="#312e81" stroke="#c084fc" strokeWidth="2" />
        {/* Psychic Aura Ring */}
        <circle cx="24" cy="24" r="18" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        {/* Head Crest */}
        <path d="M16 16 C16 9 32 9 32 16 C34 22 32 29 24 34 C16 29 14 22 16 16 Z" fill="#e9d5ff" />
        {/* Ear Ridges */}
        <polygon points="17,14 13,8 20,11" fill="#c084fc" />
        <polygon points="31,14 35,8 28,11" fill="#c084fc" />
        {/* Eyes */}
        <polygon points="19,19 22,21 19,23" fill="#7e22ce" />
        <polygon points="29,19 26,21 29,23" fill="#7e22ce" />
        <circle cx="20" cy="20.5" r="0.6" fill="#fff" />
        <circle cx="28" cy="20.5" r="0.6" fill="#fff" />
        {/* Sleek Snout */}
        <circle cx="24" cy="25" r="0.8" fill="#6b21a8" />
      </svg>
    );
  }

  // 11. Goomba (Brown mushroom body, angry brows, fangs)
  if (charKey === "goomba") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Goomba">
        <circle cx="24" cy="24" r="22" fill="#292524" stroke="#d97706" strokeWidth="2" />
        {/* Mushroom Cap */}
        <path d="M12 28 C10 16 16 10 24 10 C32 10 38 16 36 28 Z" fill="#92400e" />
        {/* Stems & Face */}
        <ellipse cx="24" cy="29" rx="8" ry="6" fill="#fed7aa" />
        {/* Big Angry Brows */}
        <path d="M17 22 L24 25 L31 22" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
        {/* Eyes */}
        <ellipse cx="19.5" cy="25" rx="1.5" ry="2.5" fill="#000" />
        <ellipse cx="28.5" cy="25" rx="1.5" ry="2.5" fill="#000" />
        {/* Pointy Under-fangs */}
        <polygon points="20,33 21.5,30 23,33" fill="#fff" />
        <polygon points="25,33 26.5,30 28,33" fill="#fff" />
      </svg>
    );
  }

  // 12. Koopa Troopa (Yellow beak, green shell)
  if (charKey === "koopa" || charKey === "koopa_troopa") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Koopa Troopa">
        <circle cx="24" cy="24" r="22" fill="#064e3b" stroke="#4ade80" strokeWidth="2" />
        {/* Green Shell */}
        <ellipse cx="24" cy="27" rx="13" ry="11" fill="#22c55e" stroke="#fff" strokeWidth="2" />
        {/* Beak & Head */}
        <ellipse cx="24" cy="18" rx="7" ry="6" fill="#fde047" />
        <ellipse cx="26" cy="21" rx="4" ry="2.5" fill="#facc15" />
        {/* Eye */}
        <ellipse cx="22" cy="16" rx="2" ry="3.5" fill="#fff" stroke="#000" strokeWidth="1" />
        <ellipse cx="22" cy="16" rx="1" ry="2" fill="#000" />
      </svg>
    );
  }

  // 13. Piranha Plant (Green pipe, red spotted head, white razor teeth)
  if (charKey === "piranha" || charKey === "piranha_plant") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Piranha Plant">
        <circle cx="24" cy="24" r="22" fill="#14532d" stroke="#ef4444" strokeWidth="2" />
        {/* Warp Pipe Rim */}
        <rect x="15" y="32" width="18" height="10" rx="1" fill="#16a34a" stroke="#15803d" strokeWidth="1.5" />
        <rect x="13" y="30" width="22" height="4" rx="1" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
        {/* Red Spotted Head */}
        <circle cx="24" cy="19" r="10" fill="#dc2626" />
        <circle cx="19" cy="15" r="2" fill="#fff" />
        <circle cx="28" cy="14" r="1.8" fill="#fff" />
        <circle cx="18" cy="22" r="1.5" fill="#fff" />
        {/* Open White Razor Mouth */}
        <polygon points="16,21 32,21 24,25" fill="#fff" />
        <polygon points="16,21 24,17 32,21" fill="#991b1b" />
      </svg>
    );
  }

  // 14. Onix / Rock Golem
  if (charKey === "onix" || charKey === "golem") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Onix">
        <circle cx="24" cy="24" r="22" fill="#1c1917" stroke="#78716c" strokeWidth="2" />
        <polygon points="24,6 22,15 26,15" fill="#a8a29e" />
        <circle cx="24" cy="22" r="10" fill="#78716c" stroke="#a8a29e" strokeWidth="2" />
        <circle cx="15" cy="33" r="5" fill="#57534e" />
        <circle cx="33" cy="33" r="5" fill="#57534e" />
        <circle cx="24" cy="37" r="4.5" fill="#44403c" />
        <polygon points="20,19 22,21 19,23" fill="#f59e0b" />
        <polygon points="28,19 26,21 29,23" fill="#f59e0b" />
      </svg>
    );
  }

  // Fallback by Elemental Type (Fire, Water, Grass, Electric, Stone)
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
          <path d="M18 33 Q24 37 30 33" stroke="#082f49" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "grass":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Grass Creature">
          <circle cx="24" cy="24" r="22" fill="#052e16" stroke="#22c55e" strokeWidth="2" />
          <path d="M24 10 C14 16 12 30 24 38 C36 30 34 16 24 10 Z" fill="#22c55e" />
          <path d="M24 12 L24 36" stroke="#15803d" strokeWidth="2" />
          <circle cx="19" cy="24" r="2.5" fill="#fff" />
          <circle cx="29" cy="24" r="2.5" fill="#fff" />
        </svg>
      );
    case "electric":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Electric Creature">
          <circle cx="24" cy="24" r="22" fill="#422006" stroke="#eab308" strokeWidth="2" />
          <polygon points="26,8 14,24 23,24 20,40 34,22 25,22" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
          <circle cx="19" cy="20" r="2" fill="#000" />
          <circle cx="29" cy="20" r="2" fill="#000" />
        </svg>
      );
    case "stone":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="Stone Creature">
          <circle cx="24" cy="24" r="22" fill="#1c1917" stroke="#a8a29e" strokeWidth="2" />
          <polygon points="24,10 36,18 34,34 24,40 14,34 12,18" fill="#78716c" stroke="#a8a29e" strokeWidth="2" />
          <rect x="18" y="22" width="4" height="4" fill="#f59e0b" rx="1" />
          <rect x="26" y="22" width="4" height="4" fill="#f59e0b" rx="1" />
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

export const CreatureCard: React.FC<CreatureCardProps> = ({
  creature,
  selected = false,
  onSelect,
  compact = false,
}) => {
  return (
    <div
      onClick={() => onSelect && onSelect(creature)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(creature);
        }
      }}
      className={`arcade-panel creature-card ${selected ? "selected" : ""}`}
      style={{
        cursor: onSelect ? "pointer" : "default",
        borderColor: selected ? "var(--border-highlight)" : undefined,
        background: selected ? "rgba(37, 99, 235, 0.12)" : undefined,
        padding: compact ? "0.75rem" : "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <CreatureAvatar
          type={creature.type}
          avatar={creature.avatar}
          id={creature.id}
          size={compact ? 40 : 52}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: compact ? "0.95rem" : "1.1rem",
                color: "#fff",
              }}
            >
              {creature.name}
            </span>
            <span className={`type-badge type-${creature.type}`}>{creature.type}</span>
            {creature.source && creature.source !== "builtin" && (
              <span
                style={{
                  fontSize: "0.65rem",
                  background: "var(--bg-surface)",
                  color: "var(--text-muted)",
                  padding: "2px 5px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                }}
              >
                Upload
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "4px",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            <span>
              HP: <strong style={{ color: "#fff" }}>{creature.hp}</strong>
            </span>
            <span>
              ATK: <strong style={{ color: "#fff" }}>{creature.attack}</strong>
            </span>
            <span>
              SPD: <strong style={{ color: "#fff" }}>{creature.speed}</strong>
            </span>
          </div>
        </div>
        {selected && (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--primary-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: "0.8rem",
            }}
          >
            ✓
          </div>
        )}
      </div>

      {!compact && creature.moves && creature.moves.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.4rem", fontSize: "0.8rem" }}>
          <span style={{ color: "var(--text-muted)", marginRight: "4px" }}>Moves:</span>
          <span style={{ color: "var(--text-main)" }}>
            {creature.moves.map((m) => m.replace(/_/g, " ")).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
};
