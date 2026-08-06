/**
 * 鋒兄金融 CSV · Supabase Storage image URLs round-trip (no test runner required).
 * Run: node scripts/test-fengbro-finance-csv.mjs
 */
import assert from 'node:assert/strict'
import {
  normalizeFinanceImageUrls,
  unwrapFinanceMediaProxyUrl
} from '../utils/fengbroFinanceCustom.ts'
import {
  buildFinanceCustomCsv,
  imageUrlsToCsvCell,
  parseFinanceCustomCsv
} from '../utils/fengbroFinanceCsv.ts'

// Node needs --experimental-strip-types (or a TS loader) for .ts imports.

const SUPABASE_A =
  'https://wj6qu04.supabase.co/storage/v1/object/public/uploads/finance/kospi-a.jpg'
const SUPABASE_B =
  'https://xxxx.supabase.co/storage/v1/object/public/my-bucket/finance/b.webp?token=abc'

let passed = 0
function ok(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

ok('keeps full Supabase Storage public URLs', () => {
  assert.deepEqual(normalizeFinanceImageUrls(SUPABASE_A), [SUPABASE_A])
  assert.deepEqual(normalizeFinanceImageUrls(SUPABASE_B), [SUPABASE_B])
})

ok('unwraps media-proxy to original storage URL', () => {
  const proxied = `/api/media-proxy?url=${encodeURIComponent(SUPABASE_A)}&_key=super-secret-key`
  assert.equal(unwrapFinanceMediaProxyUrl(proxied), SUPABASE_A)
  assert.deepEqual(normalizeFinanceImageUrls(proxied), [SUPABASE_A])
  assert.ok(!normalizeFinanceImageUrls(proxied)[0]?.includes('super-secret'))
})

ok('parses multi-value cells with semicolon without mangling query strings', () => {
  const urls = normalizeFinanceImageUrls(`${SUPABASE_A};${SUPABASE_B}`)
  assert.deepEqual(urls, [SUPABASE_A, SUPABASE_B])
})

ok('does not split a single Storage URL on punctuation', () => {
  const urls = normalizeFinanceImageUrls(SUPABASE_B)
  assert.deepEqual(urls, [SUPABASE_B])
})

ok('exports Supabase Storage URLs in imageUrls and re-imports them', () => {
  const instruments = [
    {
      name: 'KOSPI 指數',
      symbol: '^KS11',
      provider: 'yahoo',
      group: 'korea',
      imageUrl: SUPABASE_A,
      imageUrls: [SUPABASE_A, SUPABASE_B]
    }
  ]

  const csv = buildFinanceCustomCsv(instruments)
  assert.ok(csv.includes('imageUrls'))
  assert.ok(csv.includes('storage/v1/object/public'))
  assert.ok(csv.includes(SUPABASE_A))
  assert.ok(csv.includes(SUPABASE_B))
  assert.match(
    csv,
    /"https:\/\/wj6qu04\.supabase\.co[^"]+;https:\/\/xxxx\.supabase\.co[^"]+"/
  )

  const { data, errors } = parseFinanceCustomCsv(csv)
  assert.equal(errors.length, 0, errors.join('; '))
  assert.equal(data.length, 1)
  assert.deepEqual(data[0].imageUrls, [SUPABASE_A, SUPABASE_B])
  assert.equal(data[0].imageUrl, SUPABASE_A)
})

ok('imports imageUrls that were media-proxy links as clean storage URLs', () => {
  const proxied = `/api/media-proxy?url=${encodeURIComponent(SUPABASE_A)}&_key=secret`
  const csv = [
    'name,symbol,provider,group,imageUrls,youtubeUrl,bilibiliUrl,relatedLinks,featured',
    `TSMC,2330.TW,yahoo,taiwan,"${proxied}",,,,0`
  ].join('\n')

  const { data, errors } = parseFinanceCustomCsv(csv)
  assert.equal(errors.length, 0, errors.join('; '))
  assert.equal(data.length, 1)
  assert.deepEqual(data[0].imageUrls, [SUPABASE_A])
})

ok('imageUrlsToCsvCell joins with semicolon', () => {
  const cell = imageUrlsToCsvCell({
    name: 'x',
    symbol: 'X',
    provider: 'yahoo',
    group: 'us',
    imageUrls: [SUPABASE_A, SUPABASE_B]
  })
  assert.equal(cell, `${SUPABASE_A};${SUPABASE_B}`)
})

ok('keeps site-relative /finance paths', () => {
  assert.deepEqual(normalizeFinanceImageUrls('/finance/kospi-cats.jpg'), [
    '/finance/kospi-cats.jpg'
  ])
})

if (!process.exitCode) {
  console.log(`\n${passed} tests passed`)
}
