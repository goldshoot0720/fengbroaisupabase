import assert from 'node:assert/strict'
import test from 'node:test'
import { findNavigationPages } from '../composables/useNavigation.js'

const destinations = query => findNavigationPages(query).flatMap(page =>
  page.children?.map(child => child.id) ?? [page.id]
)

test('Enter on a page name selects the destination even when its group also matches', () => {
  assert.deepEqual(destinations('關於'), ['about'])
  assert.deepEqual(destinations('ｔｏｏｌｓ：ｆｉｎａｎｃｅ'), ['tools:finance'])
})

test('group names expose their destinations and unmatched queries return an empty list', () => {
  assert.ok(destinations('日常管理').includes('food'))
  assert.deepEqual(destinations('no-such-module'), [])
  assert.deepEqual(destinations('　 '), destinations(''))
})
