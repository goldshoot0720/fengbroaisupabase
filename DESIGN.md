---
name: 鋒兄 AI Supabase
description: Cool-blue product shell for personal ops — Manrope body, Space Grotesk display, OKLCH tokens.
colors:
  canvas: "oklch(0.97 0.01 240)"
  surface: "oklch(0.995 0.004 240)"
  muted: "oklch(0.945 0.012 240)"
  inset: "oklch(0.93 0.01 240)"
  strong: "oklch(0.18 0.02 248)"
  text-primary: "oklch(0.23 0.03 250)"
  text-secondary: "oklch(0.40 0.02 248)"
  text-muted: "oklch(0.52 0.014 248)"
  text-inverse: "oklch(0.98 0.004 255)"
  primary: "oklch(0.52 0.16 250)"
  primary-hover: "oklch(0.47 0.16 250)"
  accent: "oklch(0.74 0.12 92)"
  success: "oklch(0.48 0.13 150)"
  warning: "oklch(0.68 0.14 80)"
  danger: "oklch(0.52 0.19 25)"
  info: "oklch(0.50 0.10 220)"
  dark-canvas: "oklch(0.15 0.02 248)"
  dark-surface: "oklch(0.19 0.018 248)"
  dark-text: "oklch(0.95 0.01 255)"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.6rem + 2vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "999px"
spacing:
  2xs: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "1rem"
  sidebar:
    backgroundColor: "{colors.strong}"
    textColor: "{colors.text-inverse}"
---

## Overview

Product-register web app: dark cool-blue sidebar, light cool-neutral canvas, OKLCH token system in `app/assets/css/variables.css`. Display type (Space Grotesk) for home/hero; Manrope for body and dense CRUD. Light/dark themes; optional `data-register="brand"` on main content for roomier home moments.

Source of truth for values is CSS variables — prefer `var(--primary)` over hardcoded hex in new work.

## Colors

Cool blue-gray neutrals (hue ~240–250) with a saturated primary blue and a warm gold accent for highlights. Semantic success / warning / danger / info use OKLCH with light mix tints for backgrounds.

Dark mode rebinds canvas/surface/text/elevation while keeping the same primary/accent roles. Sidebar stays deep (`--sidebar-bg` gradient) in both schemes.

## Typography

- **Display**: Space Grotesk, weights 500–700, tracking ~`-0.03em`, clamp scale via `--display-lg` / `--display-xl`.
- **Body**: Manrope 400–800; default body size `--text-md` (0.9375rem), line-height 1.5.
- **Scale**: `--text-xs` through `--text-3xl` plus display clamps.
- Avoid display letter-spacing tighter than `-0.04em`.

## Elevation

Resting cards prefer border + flat surface (`--elevation-0` / subtle `--elevation-1`). Raised work uses `--elevation-2` / `--elevation-3` with soft cool shadows. Prefer a single strategy: either a clear border or a modest shadow—not both as heavy decoration. Radius product default: 12px (`--radius-md`).

Z-index ladder: dropdown → sticky → fixed → modal-backdrop → modal → popover → tooltip.

## Components

Shared UI under `components/ui/` (`BaseButton`, `BaseCard`, `BaseInput`, `BaseModal`, `Toast`, …) and shell under `components/layout/`. Pages live in `components/pages/`.

New UI should consume tokens (`--primary`, `--bg-surface`, `--radius-md`, motion durations) rather than one-off Tailwind-like hex gradients. Where legacy components still use fixed gradients (e.g. some button variants), migrate toward solid token fills when touching those files.

## Do's and Don'ts

**Do**

- Use OKLCH tokens from `variables.css` for color, type, space, radius, motion.
- Keep CRUD pages dense and scannable; put personality on Home / brand-register surfaces.
- Honor light/dark and reduced-motion.
- Wire new chrome into the existing z-index and toast/modal patterns.

**Don't**

- Invent a second palette (purple SaaS, cream paper, neon glass) on top of the cool-blue system.
- Stack 32px+ card radii or thick border + huge soft shadow on the same surface.
- Duplicate notification or bank-workflow logic outside the modules documented in `CONTEXT.md`.
- Gate critical content visibility only on entrance animations.
