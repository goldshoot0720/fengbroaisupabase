---
name: 鋒兄 AI Supabase
description: Supabase-register console shell — IBM Plex Sans/Mono, Noto Sans TC, brand green #3ECF8E on neutral paper, 4px layout contract.
colors:
  canvas: "#F5F6F5"
  surface: "#FFFFFF"
  muted: "#ECEEEC"
  inset: "#E6E9E6"
  strong: "#1C1C1C"
  text-primary: "#171717"
  text-secondary: "#4E534F"
  text-muted: "#7C817D"
  text-inverse: "#F5F6F5"
  primary: "#3ECF8E"
  primary-hover: "#24996B"
  primary-solid: "#3ECF8E"
  primary-text: "#10775A"
  on-primary: "#0B1F16"
  accent: "#24B47E"
  success: "#2E9E68"
  warning: "#B4761A"
  danger: "#B4402F"
  info: "#3B6B93"
  dark-canvas: "#1C1C1C"
  dark-surface: "#222222"
  dark-text: "#EDEDED"
typography:
  display:
    fontFamily: "IBM Plex Sans, Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.22
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, Noto Sans TC, PingFang TC, Microsoft JhengHei, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.12em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  full: "999px"
spacing:
  2xs: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.primary-solid}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  sidebar:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.text-primary}"
---

## Overview

Personal-ops console in the **Supabase register**: neutral paper (a hair of green in the grays),
white card faces, hairline rules, and Supabase's brand green `#3ECF8E` as the single accent.
Dark mode is Supabase studio — `#1C1C1C` canvas, `#222222` cards, `#2E2E2E` rules. The shell
(header + sidebar) is paper one shade darker than the canvas, never a dark chrome panel.

Source of truth for values is `app/assets/css/variables.css`. Never hardcode a hex in new work —
every colour, radius, shadow, space and duration has a token.

## The two green rules

Green is bright. Two rules keep it legible and keep it meaningful:

1. **Green fills carry dark text.** `--primary` / `--primary-solid` (`#3ECF8E`) pair with
   `--on-primary` (`#0B1F16`), never `--on-solid`. White on `#3ECF8E` is 1.9:1. The semantic
   solids (`--success-solid`, `--warning-solid`, `--danger-solid`, `--info-solid`,
   `--neutral-solid`) are the ones that carry `--on-solid` (near-white).
2. **Green means "actionable" or "succeeded", not "fine".** Primary buttons, active nav, links,
   focus rings, success toasts. A row that is merely normal / 使用中 gets a **neutral** badge —
   otherwise a table of healthy records turns into a wall of green and nothing reads as clickable.

On paper, green *text* is `--primary-text` / `--primary-strong` (`#10775A`), not `--primary`.

## Colors

Warm hues are gone; neutrals sit near hue 120 at very low chroma so they agree with the accent.
**One** chromatic accent. Green / amber / red / blue stay as *semantics* only: success, warning,
danger, info.

Three families of colour role, and mixing them up is the usual bug:

| Family | Tokens | Use for |
| --- | --- | --- |
| Expressive | `--primary`, `--success`, `--warning`, `--danger`, `--info` | icons, borders, chart marks, accents. Flips lightness between themes. |
| On-tint text | `--primary-text`, `--success-text`, `--warning-text`, `--danger-text`, `--info-text` | text and links on paper or on a `-light` tint. Deeper in light mode, brighter in dark — always ≥ 4.5:1. |
| Solid fill | `--primary-solid` (+ `--on-primary`), `--success-solid`, `--danger-solid`, … (+ `--on-solid`) | filled buttons and badges. Same lightness in both themes, so the text stays legible. |

Tints (`--primary-light`, `--danger-light`, …) are `color-mix` washes for callout backgrounds;
pair them with the matching `-text` token, never with the expressive one.

Overlays use `--overlay-scrim`, not `rgba(0,0,0,…)`.

## Typography

One family for everything readable, one for everything countable.

- **UI / display**: IBM Plex Sans 500–600, Chinese via Noto Sans TC. Page titles 20px
  (`--text-xl`), header title 17px (`--text-lg`), tracking `-0.01em`.
- **Body**: IBM Plex Sans 400, `--text-md` (15px), line-height 1.6.
- **Data**: IBM Plex Mono for numbers, amounts, dates, IDs and small uppercase labels
  (`.eyebrow` / `.kicker`, table headers, stat titles) at `--text-2xs` (11px) / `0.12em`.
- **Scale**: `--text-2xs` 11 → `--text-3xl` 30, plus `--display-lg` / `--display-xl` for Home only.
- Numbers use tabular figures automatically (`.stat-number`, `.stat-value`, `[data-numeric]`, `time`).

No serif display face:襯線標題和中文並排時字重與字面對不齊。

## Layout contract (4px grid)

Spacing comes from `--sp-1` … `--sp-16` (4/8/12/16/20/24/32/40/48/64) and nothing else; the old
`--spacing-*` names are aliases onto the same scale. Ad-hoc values like `0.35rem` / `0.55rem` /
`0.85rem` are the thing this contract exists to remove.

| Item | Token | Value |
| --- | --- | --- |
| Control height | `--control-h-sm` / `--control-h` / `--control-h-lg` | 30 / 36 / 44px |
| Table row | `--row-h` | 44px |
| Header brand row | `--header-h-brand` | 60px |
| Header nav row | `--header-h-nav` | 44px |
| Header sub-nav row | `--header-h-subnav` | 46px |
| Card padding | `--card-pad` | 16px |
| Radius | `--radius-sm` / `md` / `lg` / `full` | 6 / 10 / 12 / 999 |
| Container | — | `min(1720px, 100%)` |

Page skeleton, same on every module: header (brand row → nav row → optional sub-nav) → page
header (H1 left, actions right, 24px below) → stat row (4 columns, 2 on tablet/phone) → optional
alert strip → toolbar → content card. Tables always live inside an `overflow-x: auto` card so the
page body never scrolls sideways.

## Elevation

Resting surfaces are **flat**: a hairline (`--border-subtle`) does the separating work, with at
most `--elevation-1`. `--elevation-2` / `--elevation-3` are reserved for things that genuinely
float — dropdowns, modals, toasts, the mobile sidebar. No coloured glows, no gradients as fills.
Z-index ladder: dropdown → sticky → fixed → modal-backdrop → modal → popover → tooltip.

## Components

Shared UI in `components/ui/` (`BaseButton`, `BaseCard`, `BaseModal`, `Badge`, `StatCard`,
`ToastContainer`, …); shell in `components/layout/`; pages in `components/pages/`.

Active nav is a 2px underline in `--primary` plus `--primary-text` on the label; sub-nav is a
pill on `--bg-surface` with a hairline. Badges are fixed height (18 / 22 / 26px) so they never
grow a table row.

## Do's and Don'ts

**Do**

- Use tokens from `variables.css` for colour, type, space, radius, motion.
- Match the text token to the surface: `--on-primary` on green fills, `--on-solid` on semantic
  fills, `-text` on tints and paper.
- Keep CRUD pages dense and scannable; spend the personality on Home / brand-register surfaces.
- Honour light/dark and reduced-motion.

**Don't**

- Put white text on `--primary` / `--primary-solid`.
- Use green for "normal / 使用中" row states.
- Introduce a second palette (warm clay, blue/indigo SaaS, purple gradients, neon glass).
- Use a gradient as a fill, or stack a thick border and a large soft shadow on the same surface.
- Invent a spacing value outside the 4px scale, or a control height outside 30 / 36 / 44.
- Duplicate notification or bank-workflow logic outside the modules documented in `CONTEXT.md`.
