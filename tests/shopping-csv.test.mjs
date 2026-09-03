import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  SHOPPING_CSV_HEADERS,
  buildShoppingCsv,
  parseShoppingCsv,
  shoppingImportKey,
} from '../utils/shoppingCsv.js'

const sample = {
  id: 'item1',
  name: '洗碗機',
  plannedDate: '2026-09-20',
  price: 12900,
  currency: 'TWD',
  quantity: 1,
  shop: 'PChome',
  pickupMethod: '門市購買',
  imageUrl: 'https://example.com/dishwasher.jpg',
  account: 'owner@example.com',
  note: '容量 12 人份, 含安裝',
}

describe('shopping CSV', () => {
  it('exports all shopping fields and round-trips quoted notes', () => {
    assert.deepEqual(SHOPPING_CSV_HEADERS, [
      'name',
      'plannedDate',
      'price',
      'currency',
      'quantity',
      'shop',
      'pickupMethod',
      'imageUrl',
      'account',
      'note',
    ])
    const csv = buildShoppingCsv([sample])
    assert.ok(csv.startsWith('name,plannedDate,price,currency,quantity,shop,pickupMethod,imageUrl,account,note'))
    assert.ok(csv.includes('"容量 12 人份, 含安裝"'))

    const parsed = parseShoppingCsv(csv)
    assert.equal(parsed.errors.length, 0)
    assert.equal(parsed.data.length, 1)
    assert.deepEqual(parsed.data[0], {
      name: '洗碗機',
      plannedDate: '2026-09-20',
      price: 12900,
      currency: 'TWD',
      quantity: 1,
      shop: 'PChome',
      pickupMethod: '門市購買',
      imageUrl: 'https://example.com/dishwasher.jpg',
      account: 'owner@example.com',
      note: '容量 12 人份, 含安裝',
    })
  })

  it('matches by shopping name ignoring case and whitespace', () => {
    assert.equal(shoppingImportKey({ name: '  Switch ' }), shoppingImportKey({ name: 'switch' }))
    assert.notEqual(shoppingImportKey({ name: 'Switch' }), shoppingImportKey({ name: 'PS5' }))
  })

  it('accepts Chinese headers and labels', () => {
    const csv = [
      '購物名稱,預定購買日,價格,幣別,數量,商店,取貨方式,圖片網址,帳號,備註',
      '米 10kg,2026/9/15,650,台幣,2,家樂福,宅配/郵寄,,member1,日常補貨',
      '鮮奶,2026/9/16,98,日圓,1,超市,超商取貨,https://example.com/milk.png,,試喝',
    ].join('\n')
    const parsed = parseShoppingCsv(csv)
    assert.equal(parsed.errors.length, 0)
    assert.equal(parsed.data.length, 2)
    assert.equal(parsed.data[0].name, '米 10kg')
    assert.equal(parsed.data[0].plannedDate, '2026-09-15')
    assert.equal(parsed.data[0].pickupMethod, '宅配/郵寄')
    assert.equal(parsed.data[0].imageUrl, '')
    assert.equal(parsed.data[1].pickupMethod, '超商取貨')
    assert.equal(parsed.data[1].imageUrl, 'https://example.com/milk.png')
  })

  it('rejects bad image URLs and overlong pickup methods', () => {
    const csv = [
      'name,plannedDate,price,currency,quantity,shop,pickupMethod,imageUrl,account,note',
      '壞圖,2026-09-30,100,TWD,1,商店,,ftp://example.com/x.jpg,,',
      '壞圖2,2026-09-30,100,TWD,1,商店,,不是網址,,',
      '太長取貨,2026-09-30,100,TWD,1,商店,這個取貨方式名稱真的超級無敵霹靂長到絕對超過三十個字元了吧我想是的,,,',
      '好圖,2026-09-30,100,TWD,1,商店,門市購買,https://example.com/ok.jpg,,',
    ].join('\n')
    const parsed = parseShoppingCsv(csv)
    assert.equal(parsed.errors.length, 3)
    assert.equal(parsed.data.length, 1)
    assert.equal(parsed.data[0].name, '好圖')
    assert.equal(parsed.data[0].pickupMethod, '門市購買')
    assert.equal(parsed.data[0].imageUrl, 'https://example.com/ok.jpg')
  })

  it('defaults missing optional fields and skips invalid rows', () => {
    const csv = [
      'name,plannedDate,price,currency,quantity,shop,note',
      '衛生紙,2026-09-30,,TWD,,全聯,',
      ',2026-10-01,100,TWD,1,商店,缺少名稱',
      '壞日期,不是日期,100,TWD,1,商店,',
      '壞數量,2026-10-01,100,TWD,abc,商店,',
      '洗衣精,2026-10-05,250,日圓,1,藥妝店,補充',
    ].join('\n')
    const parsed = parseShoppingCsv(csv)
    assert.equal(parsed.errors.length, 3)
    assert.equal(parsed.data.length, 2)
    assert.deepEqual(parsed.data[0], {
      name: '衛生紙',
      plannedDate: '2026-09-30',
      price: 0,
      currency: 'TWD',
      quantity: 1,
      shop: '全聯',
      pickupMethod: '',
      imageUrl: '',
      account: '',
      note: '',
    })
    assert.equal(parsed.data[1].currency, 'JPY')
  })

  it('requires a name header', () => {
    const parsed = parseShoppingCsv('foo,bar\n1,2\n')
    assert.ok(parsed.errors.some((error) => error.includes('name')))
    assert.equal(parsed.data.length, 0)
  })
})
