# Agent notes

Project-specific guidance for coding agents working in this repo.

## Agent skills

Installed under `.agents/skills/`:

- **Matt Pocock skills** (`mattpocock/skills`) — engineering workflow: grill, TDD, implement, triage, architecture, etc.
- **Impeccable** (`impeccable.style`) — design skill with 23 commands (`/impeccable init|polish|audit|…`)

### Issue tracker

GitHub Issues on `goldshoot0720/fengbroaisupabase` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Design context (Impeccable)

- `PRODUCT.md` — product register, users, voice (initialized)
- `DESIGN.md` — visual system tokens/components (documented from `variables.css`)
- Live config: `.impeccable/live/config.json` (Nuxt `app/app.vue`)
- Hook consent: `.impeccable/config.local.json`

## Domain context

See `CONTEXT.md` for bank workflow, notifications, and shared module ownership rules. Prefer those module boundaries when editing.
