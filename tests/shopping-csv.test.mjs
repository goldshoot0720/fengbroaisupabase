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
  pickupMethod: '宅配',
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
      'account',
      'note',
    ])
    const csv = buildShoppingCsv([sample])
    assert.ok(csv.startsWith('name,plannedDate,price,currency,quantity,shop,pickupMethod,account,note'))
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
      pickupMethod: '宅配',
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
      '購物名稱,預定購買日,價格,幣別,數量,商店,取貨方式,帳號,備註',
      '米 10kg,2026/9/15,650,台幣,2,家樂福,取貨付款,member1,日常補貨',
    ].join('\n')
    const parsed = parseShoppingCsv(csv)
    assert.equal(parsed.errors.length, 0)
    assert.equal(parsed.data.length, 1)
    assert.deepEqual(parsed.data[0], {
      name: '米 10kg',
      plannedDate: '2026-09-15',
      price: 650,
      currency: 'TWD',
      quantity: 2,
      shop: '家樂福',
      pickupMethod: '取貨付款',
      account: 'member1',
      note: '日常補貨',
    })
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
