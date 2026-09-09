import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FENG_TUBE_STALE_DAYS,
  getFengTubeFreshness,
} from '../utils/fengTubeChannels.ts'

const NOW = Date.parse('2026-09-10T00:00:00Z')
const daysAgo = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString()

describe('鋒兄tube 停更頻道偵測', () => {
  it('三個月門檻為 90 天', () => {
    assert.equal(FENG_TUBE_STALE_DAYS, 90)
  })

  it('挑出最新一部影片，未超過三個月不算停更', () => {
    const result = getFengTubeFreshness([daysAgo(120), daysAgo(5), daysAgo(60)], NOW)
    assert.equal(result.latestPublished, daysAgo(5))
    assert.equal(result.daysSinceLatest, 5)
    assert.equal(result.isStale, false)
  })

  it('超過 90 天沒有新影片就標記為停更', () => {
    const result = getFengTubeFreshness([daysAgo(91), daysAgo(400)], NOW)
    assert.equal(result.daysSinceLatest, 91)
    assert.equal(result.isStale, true)
  })

  it('剛好 90 天還不算超過三個月', () => {
    assert.equal(getFengTubeFreshness([daysAgo(90)], NOW).isStale, false)
  })

  it('沒有影片或時間格式壞掉時不誤報停更', () => {
    assert.deepEqual(getFengTubeFreshness([], NOW), {
      latestPublished: '',
      daysSinceLatest: null,
      isStale: false,
    })
    assert.deepEqual(getFengTubeFreshness(['not-a-date'], NOW), {
      latestPublished: '',
      daysSinceLatest: null,
      isStale: false,
    })
  })

  it('壞掉的時間不影響其他影片的判讀', () => {
    const result = getFengTubeFreshness(['', 'not-a-date', daysAgo(200)], NOW)
    assert.equal(result.latestPublished, daysAgo(200))
    assert.equal(result.isStale, true)
  })
})
