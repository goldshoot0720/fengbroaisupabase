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

## 介面設計參考

新建網頁、改版既有介面或檢視 UI 設計時，自動讀取本機的 Hallmark 技能（`~/.agents/skills/hallmark/SKILL.md`），作為設計與驗收參考。依任務範圍及專案既有設計系統，檢查視覺層級、主要操作、桌面與手機排版，以及觸控和鍵盤操作。[Hallmark 來源](https://github.com/Nutlope/hallmark)

### Design context (Impeccable)

- `PRODUCT.md` — product register, users, voice (initialized)
- `DESIGN.md` — visual system tokens/components (documented from `variables.css`)
- Live config: `.impeccable/live/config.json` (Nuxt `app/app.vue`)
- Hook consent: `.impeccable/config.local.json`

## 工程技能參考

規劃需求、撰寫規格、實作、除錯、測試、重構或審查變更時，依目前任務自動選讀相符的 AI Hero 技能。優先讀取本機 `~/.agents/skills/<技能名稱>/SKILL.md`，其他開發環境可使用專案的 `.agents/skills/`。需要確認用途時查閱 [AI Hero 技能目錄](https://www.aihero.dev/skills)。

## Domain context

See `CONTEXT.md` for bank workflow, notifications, and shared module ownership rules. Prefer those module boundaries when editing.
