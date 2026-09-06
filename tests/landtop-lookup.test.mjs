import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LandtopLookupError, buildLandtopSnapshotSeries } from '../utils/landtopLookup.js'

describe('landtopLookup', () => {
  describe('buildLandtopSnapshotSeries', () => {
    it('flattens comparison rows into a "<variant>__<source>" price map', () => {
      const comparison = [
        {
          label: '128G',
          sources: [
            { source: '地標網通', numericPrice: 25900 },
            { source: '傑昇通信', numericPrice: 25500 },
          ],
        },
        {
          label: '256G',
          sources: [{ source: '地標網通', numericPrice: 29900 }],
        },
      ]

      assert.deepEqual(buildLandtopSnapshotSeries(comparison), {
        '128G__地標網通': 25900,
        '128G__傑昇通信': 25500,
        '256G__地標網通': 29900,
      })
    })

    it('keeps null prices instead of dropping the key', () => {
      const comparison = [
        { label: '單一版本', sources: [{ source: '地標網通', numericPrice: null }] },
      ]

      assert.deepEqual(buildLandtopSnapshotSeries(comparison), {
        '單一版本__地標網通': null,
      })
    })

    it('returns an empty object for missing or empty comparison', () => {
      assert.deepEqual(buildLandtopSnapshotSeries(undefined), {})
      assert.deepEqual(buildLandtopSnapshotSeries([]), {})
    })
  })

  describe('LandtopLookupError', () => {
    it('carries statusCode and statusMessage like Nitro createError', () => {
      const error = new LandtopLookupError(404, '地標網通找不到相符型號。')
      assert.equal(error.statusCode, 404)
      assert.equal(error.statusMessage, '地標網通找不到相符型號。')
      assert.ok(error instanceof Error)
    })
  })
})
