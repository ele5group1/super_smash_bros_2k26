# UI Changelog: Battle Simulator Modernization

This document records all changes made during the redesign of the battle simulator from prototype screens into a polished, modern tactical simulation platform.

---

## 1. Design Token Layer (`frontend/src/styles/tokens.css` & `tokens.ts`)

- **Spacing Scale**: Base 4px system implemented with CSS custom properties `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-5` (20px), `--space-6` (24px), `--space-8` (32px), `--space-10` (40px), `--space-12` (48px).
- **Radius Scale**: Standardized radii `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px), and `--radius-full` (9999px).
- **Typography**: 
  - Standardized font family stack (`Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
  - Constrained font weights to exactly two: Regular (400) and Bold (700) / Semi-bold (600).
  - Type scale: Body (`--font-size-body`: 16px), Small (`--font-size-sm`: 14px), Heading 3 (`--font-size-h3`: 18px), Heading 2 (`--font-size-h2`: 22px), Heading 1 (`--font-size-h1`: 28px), and Display (`--font-size-display`: 36px/48px) for headline numbers.
- **Color Palettes**:
  - Semantic neutral ramp (`--color-bg-canvas`, `--color-bg-surface`, `--color-bg-subtle`, `--color-border-subtle`, `--color-border-bold`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`).
  - Brand accents with tailored hover and focus rings (`--color-accent-primary`, `--color-accent-hover`, `--color-accent-subtle`).
  - Elemental Ramp for original creatures:
    - **Fire**: `--color-element-fire` (#ef4444) / `--color-element-fire-bg`
    - **Water**: `--color-element-water` (#0ea5e9) / `--color-element-water-bg`
    - **Grass**: `--color-element-grass` (#10b981) / `--color-element-grass-bg`
    - **Electric**: `--color-element-electric` (#eab308) / `--color-element-electric-bg`
    - **Stone**: `--color-element-stone` (#8b5cf6) / `--color-element-stone-bg`
  - Status feedback colors: Success (`--color-status-success`), Warning (`--color-status-warning`), Danger/Error (`--color-status-danger`), Info (`--color-status-info`).
  - Full support for `[data-theme="dark"]`, `[data-theme="light"]`, and automatic system color scheme detection.
- **Motion Tokens**:
  - Durations: `--duration-short` (150ms), `--duration-medium` (250ms), `--duration-long` (400ms).
  - Curves: `--ease-standard`, `--ease-decelerate`, `--ease-accelerate`.
  - Accessibility override: `@media (prefers-reduced-motion: reduce)` resets all transitions and animations to 0ms instant execution.

---

## 2. Reusable UI Component Library (`frontend/src/components/ui/`)

Replaced fragmented ad-hoc HTML elements across all screens with standardized accessible components:

1. **`Button`**:
   - Variants: `primary`, `secondary`, `ghost`, `danger`.
   - Sizes: `sm`, `md`, `lg`.
   - Features: Loading spinner state, disabled attributes, consistent focus ring (`focus-visible`), icon support.
2. **`Card`**:
   - Container component with header, body, and footer slots.
   - Variants: `default`, `interactive` (hover elevation and outline), and `accent`.
3. **`Badge`**:
   - Compact visual tags for creature elemental types, scenario difficulties, and battle states.
   - Supports: `default`, `success`, `warning`, `danger`, `fire`, `water`, `grass`, `electric`, `stone`.
4. **`Input`**:
   - Field wrapper with integrated label, helper text, and accessible error message linked via `aria-describedby` and `aria-invalid`.
5. **`Select`**:
   - Accessible dropdown wrapper supporting options, labels, error states, and custom styling.
6. **`Tabs`**:
   - Keyboard-navigable segmented control / tab group with WAI-ARIA `role="tablist"` and `role="tab"` with `aria-selected` tracking.
7. **`Drawer`**:
   - Slide-over overlay modal for detail views (e.g., creature stats, validation error inspectors).
   - Includes backdrop click-to-close, Esc key listener, focus trapping, and `aria-modal="true"`.
8. **`Toast` & `ToastContext`**:
   - Global notification manager anchored in a consistent bottom-right viewport corner.
   - Auto-dismissible with configurable duration, manual close button, and status iconography (`success`, `warning`, `danger`, `info`).
9. **`Skeleton`**:
   - Shimmer placeholder component for async loading states to prevent layout shifts.
10. **`EmptyState`**:
    - Dedicated fallback component with iconography, friendly title, description, and primary call-to-action button.
11. **`Table`**:
    - Responsive, overflow-safe table container with styled headers, alternating rows, hover rows, and sort indicators.

---

## 3. Site Structure & Navigation

- **Persistent Sidebar Navigation (Desktop)**:
  - Collapsible sidebar with quick links to `Landing`, `Scenarios`, `Planner`, `Author`, `Data`, and `Settings`.
  - Collapse state persisted in `localStorage`.
- **Mobile Bottom Tab Bar (`BottomNav`)**:
  - Responsive bottom navigation bar active on mobile viewports (< 768px) with high-contrast active icons and touch targets >= 44px.
- **Dedicated Routes & URLs**:
  - `/`: Modern landing page.
  - `/scenarios`: Scenario library and squad builder.
  - `/scenarios/:id`: Direct permalink to a specific scenario squad builder.
  - `/battles/:id`: Direct permalink to the live/replay arena.
  - `/report/:id`: Direct permalink to detailed post-combat analytics.
  - `/plan`: Squad comparison matrix and meta recommendations.
  - `/author`: Dual-view scenario visual map & JSON authoring tool.
  - `/data`: Dataset import, validation inspection, and raw tables.
  - `/settings`: Appearance, accessibility, and motion controls.
- **Command Palette (`Ctrl+K` / `Cmd+K`)**:
  - Global spotlight modal allowing instant search and keyboard navigation to screens, scenarios, and creatures.
- **Keyboard Shortcut Help (`?`)**:
  - Help overlay displaying global shortcuts (`Ctrl+K`, `?`, Space for battle pause, Arrow keys for scrub/step).
- **Dynamic Breadcrumbs**:
  - Responsive breadcrumb trail showing hierarchical location on deep routes.
- **Settings Screen (`/settings`)**:
  - Controls for Theme (`dark`, `light`, `system`), reduced motion toggle, and font scaling options stored in `localStorage`.

---

## 4. Screen-by-Screen Revisions

### Landing Screen (`/`)
- **Hero Section**: High-impact tactical introduction with primary "Launch Quick Battle" and "Explore Scenarios" CTAs.
- **Interactive Arena Preview**: Embedded live tick simulation demonstration showing original creatures in real-time combat.
- **Featured Scenarios Grid**: Visual cards for popular battle scenarios showing terrain traits, enemy preview, and difficulty badges.
- **Feature Pillars**: Quick highlights for deterministic engine, deep analytics, and custom data importing.

### Scenario & Squad Builder (`/scenarios`, `/scenarios/:id`)
- **Responsive Scenario Grid**: Filterable cards displaying scenario difficulty badge, terrain hazard icons, and recorded win rate.
- **Drag-and-Drop + Keyboard Squad Slots**: 4 dedicated tactical slots supporting drag-and-drop from the creature roster as well as an accessible keyboard slot selector (numbered 1-4).
- **Live Win-Rate Meter**: Real-time debounced simulation estimator recalculating squad win-rate against scenario enemies with visual confidence intervals.
- **Creature Details Drawer**: Clicking a creature opens a non-disruptive slide-out drawer with base stats, elemental affinities, moves, and tactical roles.
- **Quick Battle**: One-click action to seed a balanced default team and jump immediately into combat.

### Arena & Battle Replay (`/battles/:id`)
- **Responsive Scaled Canvas**: Dynamic CSS aspect-ratio arena scaling gracefully to desktop and mobile viewports.
- **Media Player Control Bar**: Play/Pause button, Step forward/back, playback speed toggle (0.5x, 1x, 2x, 4x), and interactive scrub bar.
- **Tick Timeline Strip**: Granular tick bar with one segment per simulation tick, highlighting damage spikes and KO events with clickable tick jumps.
- **Plain-Language Event Ticker**: Real-time event log summarizing hits, elemental bonuses, and faint events in natural language.
- **Accessible Motion**: KO shake and hit flashes automatically turn off when reduced-motion is enabled.

### Post-Combat Report (`/report/:id`)
- **Results Banner**: High-contrast outcome banner (Victory / Defeat) displaying headline survival rate and ticks elapsed.
- **Segmented Analytics Tabs**:
  - **Summary**: Key performance indicators, MVP creature, and damage breakdown.
  - **Creatures**: Per-creature cards with damage dealt, healing done, damage taken, and KO counts.
  - **Timeline**: Chronological combat event stream with timestamped event filters.
  - **Heatmap**: Positional action intensity and hazard interaction grid.
  - **Cause Trace**: Vertical chronology of decisive turning points; clicking any moment jumps the arena to that exact tick.
- **Counterfactual "Try a Change" Panel**: Side-by-side simulated comparison testing adjustments to creature moves or stats.
- **Replay Verification Status**: Clear badges distinguishing simulated versus uploaded battles and showing replay determinism hash matches.

### Strategy Planner (`/plan`)
- **Top Recommendation Card**: Contextual optimal squad recommendation backed by statistical confidence and win-rate gains.
- **Filter Chips**: Interactive toggle chips to filter by scenario, team size, healer presence, and data source.
- **Sortable Comparison Table**: Win-rate progress bars with shaded 95% confidence intervals, average combat duration, and survival rates.

### Scenario Authoring Tool (`/author`)
- **Synchronized Split View**:
  - **Left**: Draggable visual map editor for lanes, spawn points, and elemental hazards.
  - **Right**: Real-time synchronized JSON configuration editor.
- **Inline Validation Gutter**: Immediate syntax and schema error reporting with gutter error indicators and validation summary drawer.
- **Live Balance Meter**: Color-coded indicator evaluating whether the scenario falls within the 25%–75% competitive target band.

### Data Management (`/data`)
- **Kind Drop Zones**: 3 dedicated import cards for Creatures, Scenarios, and Battle Logs with downloadable template samples.
- **4-Step Upload Progress Card**: Clear state progression (`Checking format` -> `Validating schema` -> `Imported` or `Needs fixes`).
- **Interactive Validation Report Drawer**: Side-by-side error list; clicking any validation error automatically highlights and scrolls to the problematic row in the preview table.
- **Sortable Dataset Registry**: Searchable and sortable preview of imported datasets with row counts and source badges.

---

## 5. Cross-Cutting Behavior & Accessibility (a11y)

- **Zero Layout Breakages**: Verified responsive behavior across 1280px desktop and 390px mobile viewports without horizontal page overflow.
- **Zero Critical/Serious Axe Violations**: Fixed interactive parent-child elements (e.g. converting nested slider buttons to proper semantic grouped controls with ARIA labels).
- **Asynchronous Feedback**: Every network-dependent surface includes Skeleton loaders, EmptyStates with actionable next steps, and error retry buttons.
- **Non-Color Dependent Indicators**: Every status (badges, charts, diffs, balance meter) includes icons, plain-text labels, and ARIA annotations.
- **High-Contrast Focus Rings**: Accessible `focus-visible` styling on all interactive elements across light and dark modes.
