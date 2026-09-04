import { withBom } from './csvText.js'
import {
  CSV_BUNDLE_DIR,
  MANIFEST_NAME,
  MENU_BACKUP_ENTRIES,
  REPORT_NAME,
  ZIP_BUNDLE_DIR,
  buildManifest,
  csvMenus,
  csvPathFor,
  identifyBackupFile,
  zipMenus,
  zipPathFor,
} from './catalog.js'
import { exportCsvMenu, importCsvMenu } from './csvMenus.js'
import { exportZipMenu, importZipMenu } from './zipMenus.js'

function downloadBlob(blob, filename) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function formatReport(kind, results) {
  const lines = [
    '鋒兄選單備份',
    `kind: ${kind}`,
    `exportedAt: ${new Date().toISOString()}`,
    '',
  ]
  for (const result of results) {
    const status = result.status === 'ok' ? 'ok' : result.status
    lines.push(`${result.label} (${result.id}): ${status} ${result.rows} 筆${result.message ? ` — ${result.message}` : ''}`)
  }
  return lines.join('\n')
}

export function summarize(results) {
  const ok = results.filter((result) => result.status === 'ok').length
  const fail = results.filter((result) => result.status === 'error').length
  const skipped = results.filter((result) => result.status === 'skipped').length
  const details = results
    .filter((result) => result.status === 'error')
    .map((result) => `${result.label}：${result.message || '失敗'}`)
    .slice(0, 8)
  return [
    `完成 ${ok} 個選單${fail ? `，失敗 ${fail}` : ''}${skipped ? `，略過 ${skipped}` : ''}。`,
    ...details,
  ].join('\n')
}

function collectEntries(zip) {
  return Object.values(zip.files)
    .filter((file) => !file.dir)
    .map((file) => ({ path: file.name.replace(/\\/g, '/'), file }))
}

function entryById(id) {
  return MENU_BACKUP_ENTRIES.find((entry) => entry.id === id)
}

function todayStamp() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function getBackupFilename(kind) {
  return `supabase-${kind === 'csv' ? 'all-csv' : 'all-menus'}-${todayStamp()}.zip`
}

export async function exportMenuBundle(kind, filename, helpers = {}, onProgress) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const results = []
  const included = []
  const csvTargets = csvMenus().filter((entry) => kind === 'csv' || !entry.zipBundle)
  const zipTargets = kind === 'all' ? zipMenus() : []
  const total = csvTargets.length + zipTargets.length
  let done = 0

  for (const entry of csvTargets) {
    onProgress?.({
      stage: 'export-csv',
      current: done + 1,
      total,
      message: `匯出 ${entry.label} CSV`,
      menuId: entry.id,
    })
    try {
      const { csv, rows } = await exportCsvMenu(entry, onProgress)
      zip.file(csvPathFor(entry), withBom(csv))
      results.push({ id: entry.id, label: entry.label, status: 'ok', rows })
      included.push(entry.id)
    } catch (error) {
      results.push({
        id: entry.id,
        label: entry.label,
        status: 'error',
        rows: 0,
        message: error instanceof Error ? error.message : '匯出失敗',
      })
    }
    done += 1
  }

  for (const entry of zipTargets) {
    onProgress?.({
      stage: 'export-zip',
      current: done + 1,
      total,
      message: `匯出 ${entry.label} ZIP`,
      menuId: entry.id,
    })
    try {
      const blob = await exportZipMenu(entry, helpers, onProgress)
      zip.file(zipPathFor(entry), blob)
      results.push({ id: entry.id, label: entry.label, status: 'ok', rows: 1, message: '已打包 ZIP' })
      included.push(entry.id)
    } catch (error) {
      results.push({
        id: entry.id,
        label: entry.label,
        status: 'error',
        rows: 0,
        message: error instanceof Error ? error.message : '匯出失敗',
      })
    }
    done += 1
  }

  zip.file(MANIFEST_NAME, JSON.stringify(buildManifest(kind, included), null, 2))
  zip.file(REPORT_NAME, formatReport(kind, results))
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, filename)
  return { kind, results, blob }
}

export async function importMenuBundle(file, kind, helpers = {}, onProgress) {
  const results = []
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv')) {
    const identified = identifyBackupFile(file.name)
    const entry = identified ? entryById(identified.id) : undefined
    if (!entry || !entry.csvOnly) {
      return {
        kind,
        results: [{ id: 'unknown', label: file.name, status: 'error', rows: 0, message: '無法辨識這個 CSV 屬於哪個選單' }],
      }
    }
    const text = await file.text()
    results.push(await importCsvMenu(entry, text, onProgress))
    return { kind, results }
  }

  if (!name.endsWith('.zip')) {
    return {
      kind,
      results: [{ id: 'unknown', label: file.name, status: 'error', rows: 0, message: '請選擇 .zip 或 .csv' }],
    }
  }

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(file)
  const files = collectEntries(zip)
  const csvJobs = []
  const zipJobs = []
  const seenCsv = new Set()
  const seenZip = new Set()

  for (const { path, file: zipFile } of files) {
    const identified = identifyBackupFile(path)
    if (!identified) continue
    const entry = entryById(identified.id)
    if (!entry) continue

    if (identified.kind === 'zip') {
      if (kind === 'csv') continue
      if (seenZip.has(entry.id)) continue
      seenZip.add(entry.id)
      zipJobs.push({ entry, blob: zipFile.async('blob') })
      continue
    }

    if (identified.kind === 'csv') {
      if (kind === 'all' && entry.zipBundle) continue
      if (seenCsv.has(entry.id)) continue
      seenCsv.add(entry.id)
      csvJobs.push({ entry, text: zipFile.async('string') })
    }
  }

  const total = csvJobs.length + zipJobs.length
  let done = 0
  for (const job of csvJobs) {
    onProgress?.({
      stage: 'import-csv',
      current: done + 1,
      total,
      message: `匯入 ${job.entry.label} CSV`,
      menuId: job.entry.id,
    })
    try {
      results.push(await importCsvMenu(job.entry, await job.text, onProgress))
    } catch (error) {
      results.push({
        id: job.entry.id,
        label: job.entry.label,
        status: 'error',
        rows: 0,
        message: error instanceof Error ? error.message : '匯入失敗',
      })
    }
    done += 1
  }

  for (const job of zipJobs) {
    onProgress?.({
      stage: 'import-zip',
      current: done + 1,
      total,
      message: `匯入 ${job.entry.label} ZIP`,
      menuId: job.entry.id,
    })
    try {
      results.push(await importZipMenu(job.entry, await job.blob, helpers, onProgress))
    } catch (error) {
      results.push({
        id: job.entry.id,
        label: job.entry.label,
        status: 'error',
        rows: 0,
        message: error instanceof Error ? error.message : '匯入失敗',
      })
    }
    done += 1
  }

  if (results.length === 0) {
    results.push({
      id: 'unknown',
      label: file.name,
      status: 'error',
      rows: 0,
      message: kind === 'csv'
        ? `ZIP 裡沒有可辨識的 CSV（請放在 ${CSV_BUNDLE_DIR}/ 或檔名含選單名稱）`
        : `ZIP 裡沒有可辨識的 CSV / ZIP（請放在 ${CSV_BUNDLE_DIR}/ 與 ${ZIP_BUNDLE_DIR}/）`,
    })
  }

  return { kind, results }
}
