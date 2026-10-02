import { buildCsv, parseFullCsv } from './menuBackup/csvText.js'

// 與 Appwrite 版 lib/udemyCsv.ts 相同的 10 欄，兩邊匯出的 CSV 可以互相匯入。
export const UDEMY_CSV_HEADERS = [
  'name',
  'instructor',
  'language',
  'framework',
  'technology',
  'watchedLectures',
  'totalLectures',
  'courseUpdatedAt',
  'totalHours',
  'completed',
]

const HEADER_ALIASES = {
  課程名稱: 'name',
  課程: 'name',
  名稱: 'name',
  講師名稱: 'instructor',
  講師: 'instructor',
  程式語言: 'language',
  語言: 'language',
  框架: 'framework',
  技術名稱: 'technology',
  技術: 'technology',
  已觀看堂數: 'watchedLectures',
  已看堂數: 'watchedLectures',
  課程總堂數: 'totalLectures',
  總堂數: 'totalLectures',
  課程上次更新時間: 'courseUpdatedAt',
  上次更新: 'courseUpdatedAt',
  課程總時長小時: 'totalHours',
  '課程總時長（小時）': 'totalHours',
  總時長: 'totalHours',
  課程已經完整收看: 'completed',
  已看完: 'completed',
}

const TRUE_VALUES = new Set(['true', 'yes', '1', '是', '已看完', 'v', '✓'])
const FALSE_VALUES = new Set(['', 'false', 'no', '0', '否', '未看完'])

export function udemyImportKey(item) {
  return String(item.name || '').trim().toLocaleLowerCase('zh-Hant')
}

export function buildUdemyCsv(courses) {
  return buildCsv(
    UDEMY_CSV_HEADERS,
    (courses || []).map((course) => [
      course.name || '',
      course.instructor || '',
      course.language || '',
      course.framework || '',
      course.technology || '',
      course.watchedLectures || 0,
      course.totalLectures || 0,
      course.courseUpdatedAt ? String(course.courseUpdatedAt).slice(0, 10) : '',
      course.totalHours || 0,
      course.completed === true,
    ]),
  )
}

function mapHeader(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  const exact = UDEMY_CSV_HEADERS.find((header) => header.toLowerCase() === lower)
  if (exact) return exact
  return HEADER_ALIASES[trimmed] ?? HEADER_ALIASES[trimmed.replace(/\s+/g, '')] ?? null
}

function normalizeDate(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  // Udemy 只顯示「上次更新 2025/8」，只有年月時補成當月 1 日
  const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?(?:T.*)?$/)
  if (!match) return null
  const isoDate = `${match[1]}-${match[2].padStart(2, '0')}-${(match[3] || '1').padStart(2, '0')}`
  const calendarDate = new Date(`${isoDate}T00:00:00.000Z`)
  if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== isoDate) return null
  return isoDate
}

export function parseUdemyCsv(text) {
  const data = []
  const rows = parseFullCsv(text)
  if (rows.length < 2) return { data, errors: ['CSV 檔案至少需要表頭和一行資料'] }

  const columnIndex = {}
  rows[0].forEach((raw, index) => {
    const mapped = mapHeader(raw)
    if (mapped && columnIndex[mapped] == null) columnIndex[mapped] = index
  })
  if (columnIndex.name == null) return { data, errors: ['表頭缺少必要欄位 "name"（課程名稱）'] }

  const errors = []
  for (let i = 1; i < rows.length; i++) {
    const lineNumber = i + 1
    const cell = (field) => {
      const index = columnIndex[field]
      return index == null ? '' : String(rows[i][index] ?? '').trim()
    }

    const name = cell('name')
    if (!name) { errors.push(`第 ${lineNumber} 行: 課程名稱不能為空`); continue }
    if (name.length > 200) { errors.push(`第 ${lineNumber} 行: 課程名稱最多 200 個字元`); continue }
    const instructor = cell('instructor')
    if (instructor.length > 200) { errors.push(`第 ${lineNumber} 行: 講師名稱最多 200 個字元`); continue }
    const language = cell('language')
    const framework = cell('framework')
    const technology = cell('technology')
    if ([language, framework, technology].some((value) => value.length > 200)) {
      errors.push(`第 ${lineNumber} 行: 程式語言／框架／技術名稱各最多 200 個字元`)
      continue
    }

    const watchedRaw = cell('watchedLectures')
    const totalRaw = cell('totalLectures')
    if (!/^\d*$/.test(watchedRaw) || !/^\d*$/.test(totalRaw)) {
      errors.push(`第 ${lineNumber} 行: 堂數必須是 0 以上的整數`)
      continue
    }
    const watchedLectures = Number(watchedRaw || 0)
    const totalLectures = Number(totalRaw || 0)
    if (totalLectures > 0 && watchedLectures > totalLectures) {
      errors.push(`第 ${lineNumber} 行: 已觀看堂數不能超過課程總堂數`)
      continue
    }

    const hoursRaw = cell('totalHours')
    const totalHours = Number(hoursRaw || 0)
    if (!/^\d*(?:\.\d+)?$/.test(hoursRaw) || !Number.isFinite(totalHours)) {
      errors.push(`第 ${lineNumber} 行: 課程總時長必須是 0 以上的數字`)
      continue
    }

    const courseUpdatedAt = normalizeDate(cell('courseUpdatedAt'))
    if (courseUpdatedAt === null) {
      errors.push(`第 ${lineNumber} 行: 課程上次更新時間格式不正確（例如 2025-08-01 或 2025/8）`)
      continue
    }

    const completedRaw = cell('completed').toLowerCase()
    if (!TRUE_VALUES.has(completedRaw) && !FALSE_VALUES.has(completedRaw)) {
      errors.push(`第 ${lineNumber} 行: 課程已經完整收看需為 true／false（或 是／否）`)
      continue
    }

    data.push({
      name,
      instructor,
      language,
      framework,
      technology,
      watchedLectures,
      totalLectures,
      courseUpdatedAt,
      totalHours,
      completed: TRUE_VALUES.has(completedRaw),
    })
  }

  return { data, errors }
}
