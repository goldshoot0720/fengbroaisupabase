import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readSource(...segments) {
  return readFile(path.join(root, ...segments), 'utf8')
}

describe('shared search control consistency', () => {
  it('gives the canonical control submit, clear, and visible history behavior', async () => {
    const source = await readSource('components', 'ui', 'RecentSearchInput.vue')

    assert.match(source, /aria-label="清除搜尋內容"/)
    assert.match(source, /aria-label="提交搜尋"/)
    assert.match(source, /role="search"/)
  })

  it('submits the search form from Enter and the 提交 button on the same path', async () => {
    const source = await readSource('components', 'ui', 'RecentSearchInput.vue')

    assert.match(source, /@submit\.prevent="handleSubmit"/)
    assert.match(source, /type="submit"/)
    assert.match(source, /enterkeyhint="search"/)
    assert.doesNotMatch(source, /@keyup\.enter/)
    assert.doesNotMatch(source, /event\.key === ['"]Enter['"]/)
  })
})
