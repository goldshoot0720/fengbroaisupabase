import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FENGBRO_TUBE_CSV_HEADERS,
  buildFengbroTubeCsv,
  parseFengbroTubeCsv,
} from '../utils/fengTubeCsv.ts'

describe('fengbroTubeCsv', () => {
  it('exports then re-imports normal channels unchanged', () => {
    const channels = [
      { id: 'a', label: 'ABC', handle: '@abc', url: 'https://www.youtube.com/@abc/videos' },
      { id: 'b', label: 'XYZ', handle: '@xyz', url: 'https://www.youtube.com/@xyz/videos' },
    ]
    assert.deepEqual(FENGBRO_TUBE_CSV_HEADERS, ['alias', 'sourceUrl'])
    const result = parseFengbroTubeCsv(buildFengbroTubeCsv(channels))
    assert.deepEqual(result.errors, [])
    assert.deepEqual(result.data, [
      { alias: 'ABC', sourceUrl: 'https://www.youtube.com/@abc/videos' },
      { alias: 'XYZ', sourceUrl: 'https://www.youtube.com/@xyz/videos' },
    ])
  })

  it('reports removed default channels instead of silently returning empty data', () => {
    const csv = 'alias,sourceUrl\n政經孫老師,https://www.youtube.com/@sunlao'
    const result = parseFengbroTubeCsv(csv)
    assert.deepEqual(result.data, [])
    assert.deepEqual(result.errors, ['略過已下架的預設頻道 1 個：@sunlao'])
  })

  it('keeps valid channels and reports removed ones as warnings', () => {
    const csv = [
      'alias,sourceUrl',
      '正常頻道,https://www.youtube.com/@abc/videos',
      '政經孫老師,https://www.youtube.com/@sunlao',
    ].join('\n')
    const result = parseFengbroTubeCsv(csv)
    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].sourceUrl, 'https://www.youtube.com/@abc/videos')
    assert.deepEqual(result.errors, ['略過已下架的預設頻道 1 個：@sunlao'])
  })

  it('does not report removed channels when the CSV has none', () => {
    const result = parseFengbroTubeCsv('alias,sourceUrl\n,https://www.youtube.com/@normal/videos')
    assert.equal(result.data.length, 1)
    assert.deepEqual(result.errors, [])
  })

  it('accepts @handle shorthand and Chinese headers, rejects bad rows', () => {
    const csv = [
      '頻道別名,頻道網址',
      'Cheap,@cheap',
      '壞列,ftp://example.com',
      ',@empty-alias',
    ].join('\n')
    const result = parseFengbroTubeCsv(csv)
    // @handle 兩列都合法（alias 可為空），ftp 列被擋下。
    assert.equal(result.data.length, 2)
    assert.equal(result.data[0].alias, 'Cheap')
    assert.equal(result.data[0].sourceUrl, '@cheap')
    assert.equal(result.data[1].alias, '')
    assert.equal(result.data[1].sourceUrl, '@empty-alias')
    assert.ok(result.errors.some((error) => error.includes('第 3 行')))
    assert.equal(result.errors.length, 1)
  })

  it('requires a sourceUrl header', () => {
    const result = parseFengbroTubeCsv('alias\nabc\n')
    assert.ok(result.errors.some((error) => error.includes('sourceUrl')))
    assert.equal(result.data.length, 0)
  })
})
