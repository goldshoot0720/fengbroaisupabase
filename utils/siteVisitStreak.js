// Shared pure helpers for About-page site-visit stats (visit count + streak).
// Safe for composables and Node test runners (no Vue / window dependency).

export const SITE_ORIGIN_DATE = '2025-09-28'
export const SITE_VISIT_SESSION_KEY = 'fengbro-site-visit-logged'
export const MENU_USAGE_SESSION_FLUSH_KEY = 'feng-menu-usage-session-flush'

const DAY_MS = 24 * 60 * 60 * 1000

/** Calendar date key (YYYY-MM-DD) in the given IANA timezone (default Asia/Taipei). */
export const getDateKeyInTimeZone = (date = new Date(), timeZone = 'Asia/Taipei') =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

export const getTaipeiDateKey = (date = new Date()) => getDateKeyInTimeZone(date, 'Asia/Taipei')

const dateKeyToUtcMs = (dateKey) => {
  const match = String(dateKey || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const yearNum = Number(year)
  const monthNum = Number(month)
  const dayNum = Number(day)
  if (!yearNum || !monthNum || !dayNum) return null
  return Date.UTC(yearNum, monthNum - 1, dayNum)
}

/**
 * Whole-day delta from "today" (in timeZone) to the target date string.
 * Returns null when the date is missing/invalid. Positive = future.
 */
export const daysUntil = (dateStr, { timeZone = 'Asia/Taipei', now = new Date() } = {}) => {
  if (!dateStr) return null
  const targetMs = dateKeyToUtcMs(String(dateStr).slice(0, 10))
  const todayMs = dateKeyToUtcMs(getDateKeyInTimeZone(now, timeZone))
  if (targetMs == null || todayMs == null) return null
  return Math.round((targetMs - todayMs) / DAY_MS)
}

const asStreak = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** Normalize a YYYY-MM-DD key or ISO timestamp to a Taipei calendar date. */
export const toVisitDateKey = (value) => {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return getTaipeiDateKey(parsed)
}

export const resolveLastVisitDate = (lastVisitDate, lastVisitAt) =>
  toVisitDateKey(lastVisitDate) || toVisitDateKey(lastVisitAt)

/**
 * Advance the consecutive-day streak when a new browser session is recorded.
 * Same Taipei calendar day keeps the streak; yesterday increments; any gap resets to 1.
 */
export const nextSiteVisitStreak = (input) => {
  const now = input?.now ?? new Date()
  const today = getTaipeiDateKey(now)
  const lastVisitDate = resolveLastVisitDate(input?.lastVisitDate, input?.lastVisitAt)
  const stored = asStreak(input?.currentStreak)

  if (!lastVisitDate) {
    return { today, lastVisitDate: null, currentStreak: 1 }
  }

  const delta = daysUntil(lastVisitDate, { now })
  if (delta === 0) {
    return { today, lastVisitDate, currentStreak: Math.max(stored, 1) }
  }
  if (delta === -1) {
    return { today, lastVisitDate, currentStreak: Math.max(stored, 1) + 1 }
  }
  return { today, lastVisitDate, currentStreak: 1 }
}

/**
 * Streak shown on the About page: still alive if last visit was today or yesterday,
 * otherwise 0 until the next visit starts a new run.
 */
export const displaySiteVisitStreak = (input) => {
  const now = input?.now ?? new Date()
  const lastVisitDate = resolveLastVisitDate(input?.lastVisitDate, input?.lastVisitAt)
  if (!lastVisitDate) return 0
  const delta = daysUntil(lastVisitDate, { now })
  if (delta === 0 || delta === -1) return Math.max(asStreak(input?.currentStreak), 1)
  return 0
}

/** Whole calendar days since the site-origin date (2025-09-28), by Taipei date. */
export const daysSinceOrigin = (now = new Date()) => {
  const delta = daysUntil(SITE_ORIGIN_DATE, { now })
  return delta === null ? 0 : -delta
}
