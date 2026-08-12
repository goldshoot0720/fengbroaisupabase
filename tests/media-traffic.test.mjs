import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmptyMediaTraffic, getMediaTrafficAlertPolicy, recordMediaTraffic } from '../utils/mediaTraffic.js'

const memoryStorage = () => {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('records monthly traffic by category and action', () => {
  const storage = memoryStorage()
  const result = recordMediaTraffic({ bytes: 512, category: 'music', action: 'playback' }, storage)
  assert.equal(result.total, 512)
  assert.equal(result.categories.music, 512)
  assert.equal(result.actions.playback, 512)
})

test('uses the same escalating alert thresholds as Appwrite', () => {
  const gib = 1024 ** 3
  assert.equal(getMediaTrafficAlertPolicy(2.5 * gib), null)
  assert.deepEqual(getMediaTrafficAlertPolicy(3 * gib), { thresholdGiB: 2.5, dailyLimit: 1, level: 'warning' })
  assert.equal(getMediaTrafficAlertPolicy(4.75 * gib).level, 'danger')
  assert.equal(createEmptyMediaTraffic('2026-08').month, '2026-08')
})
