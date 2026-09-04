import { buildQuotaCsv, parseQuotaCsv, quotaImportKey } from '../quotaCsv.js'
import { buildReinstallCsv, parseReinstallCsv, reinstallImportKey } from '../reinstallCsv.js'
import { buildShoppingCsv, parseShoppingCsv, shoppingImportKey } from '../shoppingCsv.js'
import { buildTrialPurchaseCsv, parseTrialPurchaseCsv, trialPurchaseImportKey } from '../trialPurchaseCsv.js'
import { buildFinanceCustomCsv, mergeFinanceCustomInstruments, parseFinanceCustomCsv } from '../fengbroFinanceCsv.ts'
import { buildFengbroTubeCsv, parseFengbroTubeCsv } from '../fengTubeCsv.ts'
import { buildFengbroNewsCsv, mergeFengbroNewsSites, parseFengbroNewsCsv } from '../fengbroNewsCsv.ts'
import { FENGBRO_NEWS_SITES_KEY } from '../fengbroNewsSites.ts'
import { buildManualPriceCsv, mergeManualPriceProducts, parseManualPriceCsv } from '../manualPriceCsv.js'
import {
  quotaFromDbRow,
  quotaToDbRow,
  reinstallFromDbRow,
  reinstallToDbRow,
  shoppingItemFromDbRow,
  shoppingItemToDbRow,
  trialPurchaseFromDbRow,
  trialPurchaseToDbRow,
} from '../managementRecords.js'
import {
  buildBankCsv,
  buildCommonAccountCsv,
  buildFoodCsv,
  buildMusicMetaCsv,
  buildRoutineCsv,
  buildSubscriptionCsv,
  buildVideoMetaCsv,
  parseBankCsv,
  parseCommonAccountCsv,
  parseFoodCsv,
  parseMusicMetaCsv,
  parseRoutineCsv,
  parseSubscriptionBackupCsv,
  parseVideoMetaCsv,
} from './simpleCsv.js'
import { csvMenus } from './catalog.js'
import { byName, fetchAllRows, upsertByKey, upsertToolList } from './supabaseTables.js'

const TUBE_CHANNELS_STORAGE_KEY = 'fengbro-tools-tube-channels'
const FINANCE_CUSTOM_INSTRUMENTS_KEY = 'fengbro.tools.finance.customInstruments'
const MANUAL_PRICE_STORAGE_KEY = 'fengbro-tools-manual-prices'

export function csvMenuById(id) {
  return csvMenus().find((entry) => entry.id === id)
}

function loadJson(key, fallback = []) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function subscriptionKey(item) {
  const name = String(item.name || '').trim().toLocaleLowerCase('zh-Hant')
  const account = String(item.account || '').trim().toLocaleLowerCase('zh-Hant')
  return `${name}::${account}`
}

function tubeKey(channel) {
  return String(channel.url || channel.sourceUrl || '').trim()
}

function toTubeChannel(channel) {
  return {
    label: channel.label || channel.alias || '',
    url: channel.url || channel.sourceUrl || '',
  }
}

function mergeTubeChannels(existing, incoming) {
  const map = new Map()
  const order = []
  for (const channel of [...existing, ...incoming].map(toTubeChannel)) {
    const key = tubeKey(channel)
    if (!key) continue
    if (!map.has(key)) order.push(key)
    map.set(key, channel)
  }
  return order.map((key) => map.get(key)).filter(Boolean).slice(0, 80)
}

async function saveToolList(storageKey, syncKey, list) {
  saveJson(storageKey, list)
  try {
    await upsertToolList(syncKey, list)
  } catch {
    // 表尚未建立時仍保留本機資料
  }
}

export async function exportCsvMenu(entry, onProgress) {
  onProgress?.({ stage: 'export-csv', current: 0, total: 1, message: `讀取 ${entry.label}`, menuId: entry.id })

  switch (entry.id) {
    case 'food': {
      const items = await fetchAllRows('food')
      return { csv: buildFoodCsv(items), rows: items.length }
    }
    case 'subscription': {
      const items = await fetchAllRows('subscription')
      return { csv: buildSubscriptionCsv(items), rows: items.length }
    }
    case 'trial-purchase': {
      const items = (await fetchAllRows('trialpurchase')).map(trialPurchaseFromDbRow).filter(Boolean)
      return { csv: buildTrialPurchaseCsv(items), rows: items.length }
    }
    case 'reinstall': {
      const items = (await fetchAllRows('reinstall')).map(reinstallFromDbRow).filter(Boolean)
      return { csv: buildReinstallCsv(items), rows: items.length }
    }
    case 'quota': {
      const items = (await fetchAllRows('quota')).map(quotaFromDbRow).filter(Boolean)
      return { csv: buildQuotaCsv(items), rows: items.length }
    }
    case 'shopping-list': {
      const items = (await fetchAllRows('shoppinglist')).map(shoppingItemFromDbRow).filter(Boolean)
      return { csv: buildShoppingCsv(items), rows: items.length }
    }
    case 'common': {
      const items = await fetchAllRows('commonaccount')
      return { csv: buildCommonAccountCsv(items), rows: items.length }
    }
    case 'bank-stats': {
      const items = await fetchAllRows('bank')
      return { csv: buildBankCsv(items), rows: items.length }
    }
    case 'routine': {
      const items = await fetchAllRows('routine')
      return { csv: buildRoutineCsv(items), rows: items.length }
    }
    case 'music': {
      const items = await fetchAllRows('music')
      return { csv: buildMusicMetaCsv(items), rows: items.length }
    }
    case 'videos': {
      const items = await fetchAllRows('video')
      return { csv: buildVideoMetaCsv(items), rows: items.length }
    }
    case 'price-compare': {
      const items = loadJson(MANUAL_PRICE_STORAGE_KEY)
      return { csv: buildManualPriceCsv(items), rows: items.length }
    }
    case 'fengbro-tube': {
      const items = loadJson(TUBE_CHANNELS_STORAGE_KEY)
      return { csv: buildFengbroTubeCsv(items), rows: items.length }
    }
    case 'fengbro-finance': {
      const items = loadJson(FINANCE_CUSTOM_INSTRUMENTS_KEY)
      return { csv: buildFinanceCustomCsv(items), rows: items.length }
    }
    case 'fengbro-news': {
      const sites = loadJson(FENGBRO_NEWS_SITES_KEY)
      return { csv: buildFengbroNewsCsv(sites), rows: sites.length }
    }
    default:
      throw new Error(`未知的 CSV 選單：${entry.id}`)
  }
}

export async function importCsvMenu(entry, csv, onProgress) {
  const report = (status, rows, message) => ({
    id: entry.id,
    label: entry.label,
    status,
    rows,
    message,
  })
  const progress = (message, current = 0, total = 1) =>
    onProgress?.({ stage: 'import-csv', current, total, message, menuId: entry.id })

  try {
    progress(`匯入 ${entry.label}`)

    switch (entry.id) {
      case 'food': {
        const parsed = parseFoodCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('food')
        const { ok, fail } = await upsertByKey({
          table: 'food',
          existing,
          rows: parsed.data,
          keyOfExisting: byName,
          keyOfRow: byName,
          toDb: (row) => ({
            name: row.name,
            amount: row.amount ?? null,
            todate: row.todate || null,
            photo: row.photo || null,
            price: row.price ?? null,
            shop: row.shop || null,
            photohash: row.photohash || null,
          }),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'subscription': {
        const parsed = parseSubscriptionBackupCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('subscription')
        const { ok, fail } = await upsertByKey({
          table: 'subscription',
          existing,
          rows: parsed.data,
          keyOfExisting: subscriptionKey,
          keyOfRow: subscriptionKey,
          toDb: (row) => ({
            name: row.name,
            site: row.site || null,
            price: row.price ?? null,
            nextdate: row.nextdate || null,
            note: row.note || null,
            account: row.account || null,
            currency: row.currency || 'TWD',
            iscontinue: row.iscontinue !== false,
          }),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'trial-purchase': {
        const parsed = parseTrialPurchaseCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('trialpurchase')
        const { ok, fail } = await upsertByKey({
          table: 'trialpurchase',
          existing,
          rows: parsed.data,
          keyOfExisting: (item) => trialPurchaseImportKey({ name: item.name, account: item.account }),
          keyOfRow: (row) => trialPurchaseImportKey({ name: row.name, account: row.account }),
          toDb: (row) => trialPurchaseToDbRow(row),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'reinstall': {
        const parsed = parseReinstallCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('reinstall')
        const { ok, fail } = await upsertByKey({
          table: 'reinstall',
          existing,
          rows: parsed.data,
          keyOfExisting: (item) => reinstallImportKey({ name: item.name, system: item.system }),
          keyOfRow: (row) => reinstallImportKey({ name: row.name, system: row.system || 'win' }),
          toDb: (row) => reinstallToDbRow(row),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'quota': {
        const parsed = parseQuotaCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('quota')
        const { ok, fail } = await upsertByKey({
          table: 'quota',
          existing,
          rows: parsed.data,
          keyOfExisting: (item) => quotaImportKey({ name: item.name, account: item.account }),
          keyOfRow: (row) => quotaImportKey({ name: row.name, account: row.account }),
          toDb: (row) => quotaToDbRow(row),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'shopping-list': {
        const parsed = parseShoppingCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('shoppinglist')
        const { ok, fail } = await upsertByKey({
          table: 'shoppinglist',
          existing,
          rows: parsed.data,
          keyOfExisting: (item) => shoppingImportKey({ name: item.name }),
          keyOfRow: (row) => shoppingImportKey({ name: row.name }),
          toDb: (row) => shoppingItemToDbRow(row),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'common': {
        const parsed = parseCommonAccountCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('commonaccount')
        const { ok, fail } = await upsertByKey({
          table: 'commonaccount',
          existing,
          rows: parsed.data,
          keyOfExisting: byName,
          keyOfRow: byName,
          toDb: (row) => row,
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'bank-stats': {
        const parsed = parseBankCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('bank')
        const { ok, fail } = await upsertByKey({
          table: 'bank',
          existing,
          rows: parsed.data,
          keyOfExisting: byName,
          keyOfRow: byName,
          toDb: (row) => row,
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'routine': {
        const parsed = parseRoutineCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('routine')
        const { ok, fail } = await upsertByKey({
          table: 'routine',
          existing,
          rows: parsed.data,
          keyOfExisting: byName,
          keyOfRow: byName,
          toDb: (row) => row,
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'music': {
        const parsed = parseMusicMetaCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('music')
        const { ok, fail } = await upsertByKey({
          table: 'music',
          existing,
          rows: parsed.data.map((row) => {
            const match = existing.find(
              (item) => item.name === row.name && String(item.language || '') === row.language,
            )
            return {
              ...row,
              file: match?.file || '',
              cover: match?.cover || '',
              hash: match?.hash || `csv_import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            }
          }),
          keyOfExisting: (item) => `${byName(item)}\0${String(item.language || '').trim()}`,
          keyOfRow: (row) => `${byName(row)}\0${String(row.language || '').trim()}`,
          toDb: (row) => ({
            name: row.name,
            category: row.category || null,
            language: row.language || null,
            lyrics: row.lyrics || null,
            note: row.note || null,
            ref: row.ref || null,
            file: row.file || null,
            cover: row.cover || null,
            hash: row.hash,
          }),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'videos': {
        const parsed = parseVideoMetaCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) return report('error', 0, parsed.errors[0])
        const existing = await fetchAllRows('video')
        const { ok, fail } = await upsertByKey({
          table: 'video',
          existing,
          rows: parsed.data.map((row) => {
            const match = existing.find((item) => item.name === row.name)
            return {
              ...row,
              file: match?.file || '',
              cover: match?.cover || '',
              hash: match?.hash || `csv_import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            }
          }),
          keyOfExisting: byName,
          keyOfRow: byName,
          toDb: (row) => ({
            name: row.name,
            category: row.category || null,
            note: row.note || null,
            ref: row.ref || null,
            file: row.file || null,
            cover: row.cover || null,
            hash: row.hash,
          }),
          onRow: (current, total, name) => progress(`${entry.label} ${name}`, current, total),
        })
        return report(fail ? 'error' : 'ok', ok, fail ? `成功 ${ok}、失敗 ${fail}` : undefined)
      }
      case 'price-compare': {
        const parsed = parseManualPriceCsv(csv)
        if (parsed.errors.length && parsed.data.length === 0) {
          return report('error', 0, parsed.errors[0] || 'CSV 沒有可匯入的價格紀錄')
        }
        const merged = mergeManualPriceProducts(loadJson(MANUAL_PRICE_STORAGE_KEY), parsed.data)
        await saveToolList(MANUAL_PRICE_STORAGE_KEY, 'manual-price-products', merged)
        return report('ok', parsed.data.length)
      }
      case 'fengbro-tube': {
        const parsed = parseFengbroTubeCsv(csv)
        if (parsed.data.length === 0) return report('error', 0, parsed.errors[0] || 'CSV 沒有可匯入的頻道')
        const merged = mergeTubeChannels(loadJson(TUBE_CHANNELS_STORAGE_KEY), parsed.data)
        await saveToolList(TUBE_CHANNELS_STORAGE_KEY, 'tube-channels', merged)
        return report(parsed.errors.length ? 'ok' : 'ok', parsed.data.length, parsed.errors[0])
      }
      case 'fengbro-finance': {
        const parsed = parseFinanceCustomCsv(csv)
        if (parsed.data.length === 0) return report('error', 0, parsed.errors[0] || 'CSV 沒有可匯入的標的')
        const merged = mergeFinanceCustomInstruments(loadJson(FINANCE_CUSTOM_INSTRUMENTS_KEY), parsed.data)
        await saveToolList(FINANCE_CUSTOM_INSTRUMENTS_KEY, 'finance-custom-instruments', merged)
        return report('ok', parsed.data.length)
      }
      case 'fengbro-news': {
        const parsed = parseFengbroNewsCsv(csv)
        if (parsed.data.length === 0) return report('error', 0, parsed.errors[0] || 'CSV 沒有可匯入的新聞來源')
        const merged = mergeFengbroNewsSites(loadJson(FENGBRO_NEWS_SITES_KEY), parsed.data)
        saveJson(FENGBRO_NEWS_SITES_KEY, merged)
        return report('ok', parsed.data.length)
      }
      default:
        return report('skipped', 0, '此選單沒有 CSV 備份')
    }
  } catch (error) {
    return report('error', 0, error instanceof Error ? error.message : '匯入失敗')
  }
}
