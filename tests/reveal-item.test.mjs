import assert from 'node:assert/strict'
import { it } from 'node:test'
import { REVEAL_GAP_PX, computeRevealScrollTop, revealItem } from '../utils/revealItem.js'

it('parks the item just below the sticky header', () => {
  // 目前捲到 1000，項目在視窗 600px 處，黏頂表頭下緣在 260px。
  const top = computeRevealScrollTop({ scrollY: 1000, itemTop: 600, obstructionBottom: 260 })
  assert.equal(top, 1000 + 600 - 260 - REVEAL_GAP_PX)
})

it('scrolls up when the item is hidden behind the header', () => {
  const top = computeRevealScrollTop({ scrollY: 1000, itemTop: 100, obstructionBottom: 260, gap: 20 })
  assert.equal(top, 820)
})

it('never scrolls above the top of the page', () => {
  assert.equal(computeRevealScrollTop({ scrollY: 0, itemTop: 50, obstructionBottom: 260 }), 0)
})

it('treats a missing header as no obstruction', () => {
  assert.equal(computeRevealScrollTop({ scrollY: 0, itemTop: 500, gap: 16 }), 484)
})

it('is a no-op outside the browser', async () => {
  assert.equal(await revealItem('abc'), false)
})
