# Product

## Register

product

## Platform

web

## Users

Primary user is 鋒兄 (the product owner) managing personal life data day to day on desktop and phone: subscriptions, food expiry, notes, accounts, media libraries, bank records, routines, and utility tools. Context is often quick check-ins between other tasks—confirm an expiry, log a bank move, play media, or open a tool—not long-form exploration.

## Product Purpose

鋒兄 AI Supabase is a personal information management system built on Nuxt and Supabase. It centralizes life admin modules behind one shell (sidebar + pages), with Storage for media, ZIP import/export, PWA/Web Push, and optional email reminders.

Success means everyday CRUD is fast and clear, and time-sensitive items (subscriptions, food) are hard to miss because notifications and home alerts surface them in time.

## Positioning

One personal ops console: keep life data in one place, act on it quickly, and never silently miss an expiry.

## Brand Personality

務實、清楚、有點個性. Voice is direct Traditional Chinese where the UI is Chinese, with light personal flavor (鋒兄 tools, home signals) without turning the shell into a joke app. Prefer clarity and task completion over marketing copy.

## Anti-references

No hard visual bans from the owner—preserve and evolve the existing token system in `app/assets/css/variables.css` rather than inventing a new aesthetic. Do not introduce a second competing design language (e.g. a purple SaaS theme layered on top of the current cool blue product system).

## Design Principles

1. **Task first** — every screen should make the primary job obvious within seconds (find, add, edit, export, or act on alerts).
2. **One system** — shell, primitives, and modules share tokens; avoid one-off hex gradients that fight `variables.css`.
3. **Expiry is product** — alerts and notification affordances are first-class, not afterthoughts.
4. **Personality without noise** — hero/home can carry brand character; dense CRUD pages stay calm and scannable.
5. **Respect dual density** — product modules stay compact; brand-register moments (home) may use more air and display type.

## Accessibility & Inclusion

Support light and dark themes already in the token set. Prefer visible focus, readable body contrast, and `prefers-reduced-motion` for motion-heavy UI. Chinese UI copy should remain short and unambiguous.
