# Design

Operate-mode product UI with an Apple-native feel. Brand lives in one tint, the display face and three authored moments. Tokens live in `src/app/globals.css`.

## Color

OKLCH tokens, cool neutrals (hue 265), light and dark via `prefers-color-scheme`. Every text pair verified at WCAG AA (4.5:1) in both themes.

| Token | Role |
|---|---|
| `bg`, `surface`, `surface-2`, `line` | page, cards, grouped fills and inputs, hairlines (also the default border color) |
| `ink`, `ink-2`, `ink-3` | primary, secondary, tertiary text |
| `tint` / `on-tint` / `tint-ink` / `tint-soft` | ember accent: primary actions, current selection, streak; text on tint; tint as text; tinted fills |
| `ok`, `bad` (+ `-soft`) | day completed; failures and punishments |
| `rare`, `legend` | mystery box rarities; `rare` also marks freeze days |
| `wheel-alt`, `wheel-rim` | roulette alternate segment and rim |

One accent only. Red is reserved for consequences.

## Type

- UI: system stack (SF Pro on Apple). Body 17px.
- Display: Bricolage Grotesque (optical sizing) for large titles, card titles and numerals.
- Classes: `title-large` 34/-0.03em, `title-1` 26/-0.02em, `title-2` 20, `headline` 17 semibold, `footnote` 14, `caption` 13 (+0.01em), `numeral` (tabular, -0.04em).
- No kickers or eyebrows above headings: metadata goes below the title.

## Shape and depth

Radii: cards 20px (`rounded-card`), controls 12px (`rounded-control`), chips and segmented controls are pills. Shadows are soft and offset (`shadow-card`, `shadow-lift`). Floating bars use the `material` class (backdrop blur), which becomes solid under `prefers-reduced-transparency`.

## Layout

iPhone: bottom tab bar (Hoy, Guardados, Caja, Castigos, Ajustes) with safe-area padding. iPad/Mac (`md+`): sidebar. Section rhythm: 16px gutters on phone, 32px on desktop; more space above headings than below.

## Motion

- Press feedback on pointer-down: `scale(0.97)` in 100ms.
- Default springs are critically damped (`bounce: 0`); bounce only when a gesture carried momentum.
- Authored moments:
  - **Roulette**: 1:1 drag, flick hands its velocity to a free spin, then a critically damped spring lands on the server-chosen segment; the pointer flap kicks as pegs pass.
  - **Mystery box**: lid flies off with a spring, a rarity-tinted wash reveals via clip-path, the topic card rises and unblurs.
  - **Streak**: the number rolls from yesterday's value to today's.
- `prefers-reduced-motion`: all three become short cross-fades.

## Icons

Phosphor, regular weight; filled weight marks the selected tab.
