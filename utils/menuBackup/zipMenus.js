import { parseCsvObjects, escapeCsvValue } from './csvText.js'
import { fetchAllRows, requireClient } from './supabaseTables.js'
import {
  packRecordsMediaIntoZip,
  reuploadLocalMediaFromZip,
  stripRecordMeta,
} from '../zipMediaBundle.js'

function zipEntry(zip, path) {
  if (!path) return null
  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '')
  if (zip.files[normalized]) return zip.files[normalized]
  const found = Object.keys(zip.files).find((name) => name.replace(/\\/g, '/') === normalized)
  return found ? zip.files[found] : null
}

function csvTable(headers, rows) {
  return [headers.join(','), ...rows.map((row) => row.map((cell) => escapeCsvValue(cell ?? '')).join(','))].join('\n')
}

const SPECS = {
  images: {
    table: 'image',
    innerCsvName: 'image.csv',
    jsonFileName: 'images.json',
    csvHeaders: ['name', 'file', 'filetype', 'category', 'note', 'ref', 'hash'],
    mediaMap: {
      file: { folder: 'images', fallbackExt: 'jpg', prefixes: ['images/', 'media/'], storageFolder: 'gallery', mimeFallback: 'image/jpeg', filetypeField: 'filetype' },
      cover: { folder: 'covers', fallbackExt: 'png', prefixes: ['covers/'], storageFolder: 'gallery-covers', mimeFallback: 'image/jpeg' },
    },
    match: (item, row) => item.name === row.name,
    toCsvRow: (item) => [item.name || '', item.file || '', item.filetype || '', item.category || '', item.note || '', item.ref || '', item.hash || ''],
    toDb: (row) => ({
      name: row.name || '',
      file: row.file || '',
      filetype: row.filetype || '',
      category: row.category || '',
      note: row.note || '',
      ref: row.ref || '',
      hash: row.hash || `zip_import_${Date.now()}`,
      cover: row.cover || false,
    }),
  },
  videos: {
    table: 'video',
    innerCsvName: 'video.csv',
    jsonFileName: 'videos.json',
    csvHeaders: ['name', 'file', 'cover', 'filetype', 'category', 'note', 'ref', 'hash'],
    mediaMap: {
      file: { folder: 'videos', fallbackExt: 'mp4', prefixes: ['videos/', 'media/'], storageFolder: 'video', mimeFallback: 'video/mp4', filetypeField: 'filetype' },
      cover: { folder: 'covers', fallbackExt: 'png', prefixes: ['covers/'], storageFolder: 'video-covers', mimeFallback: 'image/jpeg' },
    },
    match: (item, row) => item.name === row.name,
    toCsvRow: (item) => [item.name || '', item.file || '', item.cover || '', item.filetype || '', item.category || '', item.note || '', item.ref || '', item.hash || ''],
    toDb: (row) => ({
      name: row.name || '',
      file: row.file || '',
      cover: row.cover || '',
      filetype: row.filetype || '',
      category: row.category || '',
      note: row.note || '',
      ref: row.ref || '',
      hash: row.hash || `zip_import_${Date.now()}`,
    }),
  },
  music: {
    table: 'music',
    innerCsvName: 'music.csv',
    jsonFileName: 'music.json',
    csvHeaders: ['name', 'file', 'cover', 'filetype', 'category', 'language', 'lyrics', 'note', 'ref', 'hash'],
    mediaMap: {
      file: { folder: 'music', fallbackExt: 'mp3', prefixes: ['music/', 'media/'], storageFolder: 'music', mimeFallback: 'audio/mpeg', filetypeField: 'filetype' },
      cover: { folder: 'covers', fallbackExt: 'png', prefixes: ['covers/'], storageFolder: 'music-covers', mimeFallback: 'image/jpeg' },
    },
    match: (item, row) => item.name === row.name && String(item.language || '') === String(row.language || ''),
    toCsvRow: (item) => [
      item.name || '',
      item.file || '',
      item.cover || '',
      item.filetype || '',
      item.category || '',
      item.language || '',
      item.lyrics || '',
      item.note || '',
      item.ref || '',
      item.hash || '',
    ],
    toDb: (row) => ({
      name: row.name || '',
      file: row.file || '',
      cover: row.cover || '',
      filetype: row.filetype || '',
      category: row.category || '',
      language: row.language || '',
      lyrics: row.lyrics || '',
      note: row.note || '',
      ref: row.ref || '',
      hash: row.hash || `zip_import_${Date.now()}`,
    }),
  },
  podcast: {
    table: 'podcast',
    innerCsvName: 'podcast.csv',
    jsonFileName: 'podcast.json',
    csvHeaders: ['name', 'file', 'cover', 'filetype', 'category', 'note', 'ref', 'hash'],
    mediaMap: {
      file: { folder: 'podcast', fallbackExt: 'mp3', prefixes: ['podcast/', 'media/'], storageFolder: 'podcast', mimeFallback: 'audio/mpeg', filetypeField: 'filetype' },
      cover: { folder: 'covers', fallbackExt: 'png', prefixes: ['covers/'], storageFolder: 'podcast-covers', mimeFallback: 'image/jpeg' },
    },
    match: (item, row) => item.name === row.name,
    toCsvRow: (item) => [item.name || '', item.file || '', item.cover || '', item.filetype || '', item.category || '', item.note || '', item.ref || '', item.hash || ''],
    toDb: (row) => ({
      name: row.name || '',
      file: row.file || '',
      cover: row.cover || '',
      filetype: row.filetype || '',
      category: row.category || '',
      note: row.note || '',
      ref: row.ref || '',
      hash: row.hash || `zip_import_${Date.now()}`,
    }),
  },
  documents: {
    table: 'commondocument',
    innerCsvName: 'document.csv',
    jsonFileName: 'documents.json',
    csvHeaders: ['name', 'file', 'cover', 'filetype', 'category', 'note', 'ref', 'hash'],
    mediaMap: {
      file: { folder: 'files', fallbackExt: 'pdf', prefixes: ['files/', 'media/'], storageFolder: 'documents', mimeFallback: 'application/octet-stream' },
      cover: { folder: 'covers', fallbackExt: 'png', prefixes: ['covers/'], storageFolder: 'document-covers', mimeFallback: 'image/jpeg' },
    },
    match: (item, row) => item.name === row.name,
    toCsvRow: (item) => [item.name || '', item.file || '', item.cover || '', item.filetype || '', item.category || '', item.note || '', item.ref || '', item.hash || ''],
    toDb: (row) => ({
      name: row.name || '',
      file: row.file || '',
      cover: row.cover || '',
      filetype: row.filetype || '',
      category: row.category || '',
      note: row.note || '',
      ref: row.ref || '',
      hash: row.hash || `zip_import_${Date.now()}`,
    }),
  },
}

async function upsertMediaRows(spec, rows, existing) {
  const client = requireClient()
  let ok = 0
  let fail = 0
  const list = [...existing]
  for (const row of rows) {
    try {
      const body = spec.toDb(row)
      const match = list.find((item) => spec.match(item, row))
      if (match) {
        const { error } = await client.from(spec.table).update(body).eq('id', match.id)
        if (error) throw error
        Object.assign(match, body)
      } else {
        const { data, error } = await client.from(spec.table).insert([body]).select().single()
        if (error) throw error
        if (data) list.push(data)
      }
      ok += 1
    } catch {
      fail += 1
    }
  }
  return { ok, fail }
}

export async function exportZipMenu(entry, helpers = {}, onProgress) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const resolveUrl = helpers.resolveUrl || ((value) => value)

  if (entry.id === 'notes') {
    const items = await fetchAllRows('article')
    const packed = await packRecordsMediaIntoZip({
      zip,
      records: items.map(stripRecordMeta),
      mediaMap: {
        file1: { folder: 'files', fallbackExt: 'bin' },
        file2: { folder: 'files', fallbackExt: 'bin' },
        file3: { folder: 'files', fallbackExt: 'bin' },
      },
      resolveUrl,
      onProgress: (info) => onProgress?.({
        stage: 'export-zip',
        current: info.current,
        total: info.total,
        message: `筆記 ${info.current}/${info.total}`,
        menuId: 'notes',
      }),
    })
    const headers = ['title', 'content', 'category', 'newDate', 'url1', 'url2', 'url3', 'file1', 'file1name', 'file1type', 'file2', 'file2name', 'file2type', 'file3', 'file3name', 'file3type']
    const rows = packed.records.map((item) => [
      item.title || '',
      item.content || '',
      item.category || '',
      item.newdate || item.newDate || '',
      item.url1 || '',
      item.url2 || '',
      item.url3 || '',
      item.file1 || '',
      item.file1name || '',
      item.file1type || '',
      item.file2 || '',
      item.file2name || '',
      item.file2type || '',
      item.file3 || '',
      item.file3name || '',
      item.file3type || '',
    ])
    zip.file('appwrite-article.csv', `\uFEFF${csvTable(headers, rows)}`)
    zip.file('notes.json', JSON.stringify(packed.records, null, 2))
    return zip.generateAsync({ type: 'blob' })
  }

  const spec = SPECS[entry.id]
  if (!spec) throw new Error(`未知的 ZIP 選單：${entry.id}`)
  const items = await fetchAllRows(spec.table)
  const packed = await packRecordsMediaIntoZip({
    zip,
    records: items.map(stripRecordMeta),
    mediaMap: spec.mediaMap,
    resolveUrl,
    onProgress: (info) => onProgress?.({
      stage: 'export-zip',
      current: info.current,
      total: info.total,
      message: `${entry.label} ${info.current}/${info.total}`,
      menuId: entry.id,
    }),
  })
  zip.file(spec.innerCsvName, csvTable(spec.csvHeaders, packed.records.map((item) => spec.toCsvRow(item))))
  zip.file(spec.jsonFileName, JSON.stringify(packed.records, null, 2))
  return zip.generateAsync({ type: 'blob' })
}

export async function importZipMenu(entry, data, helpers = {}, onProgress) {
  const JSZip = (await import('jszip')).default
  const zip = data && data.files ? data : await JSZip.loadAsync(data)
  const uploadFile = helpers.uploadFile
  if (typeof uploadFile !== 'function') {
    return { id: entry.id, label: entry.label, status: 'error', rows: 0, message: '缺少上傳函式' }
  }

  if (entry.id === 'notes') {
    const csvEntry = zipEntry(zip, 'appwrite-article.csv')
      || Object.values(zip.files).find((file) => !file.dir && /article\.csv$/i.test(file.name))
    const jsonEntry = zipEntry(zip, 'notes.json')
    let records = []
    if (csvEntry) {
      records = parseCsvObjects(await csvEntry.async('string')).rows
    } else if (jsonEntry) {
      const parsed = JSON.parse(await jsonEntry.async('string'))
      records = Array.isArray(parsed) ? parsed : []
    } else {
      return { id: 'notes', label: '鋒兄筆記', status: 'error', rows: 0, message: 'ZIP 裡沒有筆記 CSV / JSON' }
    }
    const uploaded = await reuploadLocalMediaFromZip({
      zip,
      records,
      mediaMap: {
        file1: { prefixes: ['files/'], storageFolder: 'article', mimeFallback: 'application/octet-stream' },
        file2: { prefixes: ['files/'], storageFolder: 'article', mimeFallback: 'application/octet-stream' },
        file3: { prefixes: ['files/'], storageFolder: 'article', mimeFallback: 'application/octet-stream' },
      },
      uploadFile,
      onProgress: (info) => onProgress?.({
        stage: 'import-zip',
        current: info.current,
        total: info.total,
        message: `筆記 ${info.current}/${info.total}`,
        menuId: 'notes',
      }),
    })
    const existing = await fetchAllRows('article')
    const client = requireClient()
    let ok = 0
    let fail = 0
    for (const row of uploaded.records) {
      try {
        const body = {
          title: row.title || '',
          content: row.content || '',
          category: row.category || '',
          newdate: row.newDate || row.newdate || null,
          url1: row.url1 || '',
          url2: row.url2 || '',
          url3: row.url3 || '',
          file1: row.file1 || '',
          file1name: row.file1name || '',
          file1type: row.file1type || '',
          file2: row.file2 || '',
          file2name: row.file2name || '',
          file2type: row.file2type || '',
          file3: row.file3 || '',
          file3name: row.file3name || '',
          file3type: row.file3type || '',
        }
        const match = existing.find((item) => item.title === row.title)
        if (match) {
          const { error } = await client.from('article').update(body).eq('id', match.id)
          if (error) throw error
        } else {
          const { error } = await client.from('article').insert([body])
          if (error) throw error
        }
        ok += 1
      } catch {
        fail += 1
      }
    }
    return {
      id: 'notes',
      label: '鋒兄筆記',
      status: fail ? 'error' : 'ok',
      rows: ok,
      message: fail ? `成功 ${ok}、失敗 ${fail}` : undefined,
    }
  }

  const spec = SPECS[entry.id]
  if (!spec) {
    return { id: entry.id, label: entry.label, status: 'skipped', rows: 0, message: '此選單沒有 ZIP 備份' }
  }
  const csvFile = zipEntry(zip, spec.innerCsvName)
    || Object.values(zip.files).find((file) => !file.dir && file.name.replace(/\\/g, '/').endsWith(spec.innerCsvName))
  const jsonFile = zipEntry(zip, spec.jsonFileName)
  let records = []
  if (csvFile) {
    records = parseCsvObjects(await csvFile.async('string')).rows
  } else if (jsonFile) {
    const parsed = JSON.parse(await jsonFile.async('string'))
    records = Array.isArray(parsed) ? parsed : []
  } else {
    return { id: entry.id, label: entry.label, status: 'error', rows: 0, message: `ZIP 裡沒有 ${spec.innerCsvName}` }
  }

  const uploaded = await reuploadLocalMediaFromZip({
    zip,
    records,
    mediaMap: spec.mediaMap,
    uploadFile,
    onProgress: (info) => onProgress?.({
      stage: 'import-zip',
      current: info.current,
      total: info.total,
      message: `${entry.label} ${info.current}/${info.total}`,
      menuId: entry.id,
    }),
  })
  const existing = await fetchAllRows(spec.table)
  const { ok, fail } = await upsertMediaRows(spec, uploaded.records, existing)
  return {
    id: entry.id,
    label: entry.label,
    status: fail ? 'error' : 'ok',
    rows: ok,
    message: fail ? `成功 ${ok}、失敗 ${fail}` : undefined,
  }
}
