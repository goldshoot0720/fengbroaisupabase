import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  SITE_ORIGIN_DATE,
  daysSinceOrigin,
  daysUntil,
  displaySiteVisitStreak,
  getTaipeiDateKey,
  nextSiteVisitStreak,
  toVisitDateKey,
} from '../utils/siteVisitStreak.js'

describe('site visit streak', () => {
  it('gets the Taipei calendar date key (UTC+8)', () => {
    // 2026-09-03T20:00:00Z = 2026-09-04 04:00 in Taipei.
    const taipeiLate = new Date('2026-09-03T20:00:00Z')
    assert.equal(getTaipeiDateKey(taipeiLate), '2026-09-04')
    // Just before Taipei midnight: 2026-09-03T15:59:00Z = 23:59 Taipei.
    const beforeMidnight = new Date('2026-09-03T15:59:00Z')
    assert.equal(getTaipeiDateKey(beforeMidnight), '2026-09-03')
  })

  it('normalizes an ISO timestamp to the Taipei visit date', () => {
    assert.equal(toVisitDateKey('2026-09-03'), '2026-09-03')
    // 2026-09-03T18:00:00Z is already 09-04 in Taipei.
    assert.equal(toVisitDateKey('2026-09-03T18:00:00.000Z'), '2026-09-04')
    assert.equal(toVisitDateKey(null), null)
    assert.equal(toVisitDateKey(''), null)
  })

  it('counts whole Taipei days between a date key and today', () => {
    // Taipei now = 2026-09-04 (04:00 local, still 09-03 UTC).
    const now = new Date('2026-09-03T20:00:00Z')
    assert.equal(daysUntil('2026-09-05', { now }), 1)
    assert.equal(daysUntil('2026-09-03', { now }), -1)
    assert.equal(daysUntil('2026-09-04', { now }), 0)
    assert.equal(daysUntil(null, { now }), null)
  })

  it('starts a streak at 1 on the first visit', () => {
    const now = new Date('2026-09-03T12:00:00Z')
    const result = nextSiteVisitStreak({ now })
    assert.deepEqual(result, {
      today: '2026-09-03',
      lastVisitDate: null,
      currentStreak: 1,
    })
  })

  it('keeps the streak when visiting again the same Taipei day', () => {
    const now = new Date('2026-09-03T12:00:00Z')
    const result = nextSiteVisitStreak({
      lastVisitDate: '2026-09-03',
      lastVisitAt: '2026-09-03T01:00:00Z',
      currentStreak: 3,
      now,
    })
    assert.equal(result.currentStreak, 3)
  })

  it('increments the streak when the previous visit was yesterday', () => {
    const now = new Date('2026-09-04T12:00:00Z')
    const result = nextSiteVisitStreak({
      lastVisitDate: '2026-09-03',
      currentStreak: 5,
      now,
    })
    assert.equal(result.currentStreak, 6)
  })

  it('resets to 1 when a Taipei day was skipped', () => {
    const now = new Date('2026-09-06T12:00:00Z')
    const result = nextSiteVisitStreak({
      lastVisitDate: '2026-09-03',
      currentStreak: 5,
      now,
    })
    assert.equal(result.currentStreak, 1)
  })

  it('falls back to the ISO lastVisitAt when lastVisitDate is missing', () => {
    // Taipei now = 09-05; the ISO timestamp is 09-04 in Taipei (one day before).
    const now = new Date('2026-09-04T20:00:00Z')
    const result = nextSiteVisitStreak({
      lastVisitAt: '2026-09-03T18:00:00Z',
      currentStreak: 2,
      now,
    })
    assert.equal(result.today, '2026-09-05')
    assert.equal(result.currentStreak, 3)
  })

  it('shows 0 on the About page once the streak is stale', () => {
    const now = new Date('2026-09-06T12:00:00Z')
    const stale = displaySiteVisitStreak({ lastVisitDate: '2026-09-03', currentStreak: 5, now })
    assert.equal(stale, 0)
    const alive = displaySiteVisitStreak({ lastVisitDate: '2026-09-05', currentStreak: 5, now })
    assert.equal(alive, 5)
  })

  it('counts site operating days from the origin date', () => {
    const now = new Date('2026-09-03T12:00:00Z')
    assert.equal(SITE_ORIGIN_DATE, '2025-09-28')
    // 2025-09-28 → 2026-09-03 in Taipei.
    assert.equal(daysSinceOrigin(now), 340)
  })
})
