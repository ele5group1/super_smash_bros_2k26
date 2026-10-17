# Frontend UI & Architectural Audit

**Date**: 2026-10-17  
**Project**: Scenario Battle Simulator  
**Scope**: Frontend code inspection, accessibility, layout responsiveness, and design consistency.

---

## 1. Screen & Route Inventory

| Route | Component | Purpose & Current Implementation |
|---|---|---|
| `/` | `SelectScreen` | Currently acts as the home screen combining Scenario selection, 4-member squad drafting, live win rate estimation, and battle launch. Lacks a dedicated marketing/welcome hero, quick-battle action, and creature drawer. |
| `/battle/:id` | `BattleScreen` | Loads battle record from `/api/battles/:id`. Embeds the `Arena` component with playback controls, current tick state, and event ticker. Lacks standalone media-bar layout and separate interactive timeline strip. |
| `/report/:id` | `ReportScreen` | Displays outcome banner, statistics, HP timeline chart, heatmap, defeat root cause breakdown, and counterfactual test form. Currently stacked in one long page rather than organized with segmented tabs. |
| `/plan` | `PlanScreen` | Runs Monte Carlo prediction with calibration option, side-by-side strategy comparison table, and spend recommendations. Needs sortable columns, confidence intervals, and scenario filter chips. |
| `/author` | `AuthorScreen` | Creates or updates scenario models. Uses stacked form fields and JSON textarea rather than a dual synchronized split-view with visual map drag-and-drop. |
| `/data` | `DataScreen` | File upload dropzone, dataset management, and validation results. Lacks step-by-step progress indicator and side panel for line-level error review. |

---

## 2. Inconsistencies & Duplicated Components

1. **Buttons & Controls**:
   - Multiple ad-hoc button classes (`btn-arcade`, `btn-primary`, `btn-secondary`, `btn-accent`) mixed with inline styles for padding, font sizes (`0.85rem`, `0.75rem`), and hex colors (`#450a0a`, `#082f49`).
   - No unified `Button` component with variant support (`primary`, `secondary`, `ghost`, `danger`) or loading spinners.
2. **Cards & Panels**:
   - Container class `.arcade-panel` is repeated across screens with differing padding (`0.75rem`, `1rem`, `1.25rem`), border radii, and inline background overrides.
3. **Data Tables**:
   - `PreviewTable`, Plan comparison table, and DataScreen upload lists all use distinct custom `<table>` markup with inconsistent headers, zebra striping, and cell padding.
4. **Empty States**:
   - Empty teams, empty battle histories, and empty upload lists render plain text paragraphs without actionable buttons or illustrations.

---

## 3. Hardcoded Styling & Token Deficits

- **Hardcoded Colors**: Repeated raw hex codes across components: `#10b981`, `#ef4444`, `#3b82f6`, `#f59e0b`, `#78716c`, `#1e1b4b`, `#0f172a`, `#334155`, `#e2e8f0`.
- **Font Sizes**: Freeform font size values (`0.65rem`, `0.75rem`, `0.85rem`, `0.95rem`, `1.1rem`, `1.25rem`, `1.5rem`) without a strict modular typography scale.
- **Spacing Scale**: Spacings alternate arbitrarily between `0.4rem`, `0.5rem`, `8px`, `10px`, `12px`, `1rem`, `1.25rem`, `1.5rem`, and `2rem` instead of a 4px base scale.
- **Theming**: Dark mode is hardcoded; no light mode or system theme preference support.

---

## 4. Missing Loading, Error, and Empty States

- **Loading States**: Full-page loads show bare "Loading..." text strings rather than skeleton loaders matching screen geometry.
- **Error States**: Errors are rendered as red alert banners at the top of the form, without inline field-level validation messages or retry buttons.
- **Async Feedback**: Battle launch, upload processing, and Monte Carlo runs lack non-blocking toast notifications.

---

## 5. Responsive & Layout Breakpoints

- **Desktop (< 1280px)**: Multi-column grids in `SelectScreen` and `ReportScreen` crowd each other, pushing key metric cards out of view.
- **Mobile (390px)**:
  - Top navigation bar collapses awkwardly with text truncation.
  - Tables lack explicit horizontal scrolling wrappers, risking viewport overflow.
  - Arena timeline controls overflow when playback speed buttons and scrubbers share one row.
- **Navigation**: Missing persistent collapsible sidebar for desktop and bottom navigation bar for mobile.

---

## 6. Accessibility (A11y) Gaps

1. **Color-Only Indicators**: Several status badges (outcome, upload status, win rate health) rely solely on red/green tinting without text labels or high-contrast icons.
2. **Focus Management & Rings**: Custom interactive `div` elements in scenarios and creature cards lack consistent focus outlines on all browsers.
3. **Missing ARIA Attributes**: Replay slider, timeline markers, and modal dialogs lack `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`.
4. **Keyboard Traps & Drawer Traps**: No focus trapping on open drawers or dialogs; ESC key does not consistently dismiss open modals.
5. **Reduced Motion**: Some SVG animations and CSS keyframe pulses lack explicit `prefers-reduced-motion` suppression.

---

## 7. Action Plan

1. **Tokens & Primitives**: Create `tokens.css` and `tokens.ts` (4px spacing scale, 2-weight typography, light/dark/system themes, motion tokens).
2. **Shared UI Library**: Build atomic `Button`, `Card`, `Badge`, `Input`, `Select`, `Tabs`, `Drawer`, `Toast`, `Skeleton`, `EmptyState`, and `Table`.
3. **Navigation Architecture**: Landing page at `/`, dedicated `/scenarios`, `/scenarios/:id`, `/battles/:id`, command palette (`Cmd/Ctrl+K`), breadcrumbs, settings page, and keyboard shortcuts modal (`?`).
4. **Screen Revamps**: Redesign Select, Battle, Report, Plan, Author, and Data screens according to Step 5 specifications.
5. **Testing & Validation**: Ensure deterministic engine stability, update and add component tests + Playwright E2E + axe a11y checks, and generate desktop/mobile screenshots.
