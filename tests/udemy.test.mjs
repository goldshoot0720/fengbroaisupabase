import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  UDEMY_CSV_HEADERS,
  buildUdemyCsv,
  parseUdemyCsv,
  udemyImportKey,
} from '../utils/udemyCsv.js'
import {
  buildUdemyCourseWritePayload,
  emptyUdemyCourseForm,
  filterUdemyCourses,
  groupUdemyCourses,
  splitUdemyTags,
  summarizeUdemyCourses,
  toUdemyCourseForm,
  udemyFromDbRow,
  udemyToDbRow,
  udemyWatchedPercent,
} from '../utils/managementRecords.js'
import { MENU_BACKUP_ENTRIES, identifyBackupFile } from '../utils/menuBackup/catalog.js'

const sample = {
  id: 'course1',
  name: 'The Complete JavaScript Course, 2026',
  instructor: 'Jonas Schmedtmann',
  language: 'JavaScript',
  framework: '',
  technology: 'DOM、Async',
  watchedLectures: 120,
  totalLectures: 320,
  courseUpdatedAt: '2025-08-01',
  totalHours: 69.5,
  completed: false,
}

describe('udemy records', () => {
  it('normalizes a write payload and clears the date on update', () => {
    const payload = buildUdemyCourseWritePayload({ ...toUdemyCourseForm(sample), name: '  JS  ', courseUpdatedAt: '' }, 'update')
    assert.equal(payload.name, 'JS')
    assert.equal(payload.totalHours, 69.5)
    assert.equal(payload.completed, false)
    assert.equal(payload.courseUpdatedAt, null)
    assert.equal(buildUdemyCourseWritePayload({ name: 'x', courseUpdatedAt: '2025-08-01' }, 'create').courseUpdatedAt, '2025-08-01T00:00:00.000Z')
    assert.equal(buildUdemyCourseWritePayload({ name: 'x', totalHours: 1.234 }, 'create').totalHours, 1.23)
  })

  it('rejects watched lectures beyond the total and negative hours', () => {
    assert.throws(() => buildUdemyCourseWritePayload({ name: 'x', watchedLectures: 11, totalLectures: 10 }, 'create'), /不能超過/)
    assert.throws(() => buildUdemyCourseWritePayload({ name: 'x', totalHours: -1 }, 'create'), /0 以上的數字/)
    assert.throws(() => buildUdemyCourseWritePayload({ name: ' ' }, 'create'), /課程名稱/)
  })

  it('maps camelCase fields to lowercase columns and back', () => {
    const row = udemyToDbRow(buildUdemyCourseWritePayload(sample, 'create'))
    assert.deepEqual(row, {
      name: sample.name,
      instructor: 'Jonas Schmedtmann',
      language: 'JavaScript',
      framework: '',
      technology: 'DOM、Async',
      watchedlectures: 120,
      totallectures: 320,
      courseupdatedat: '2025-08-01',
      totalhours: 69.5,
      completed: false,
    })
    const restored = udemyFromDbRow({ ...row, id: 'u1', totalhours: '69.50', courseupdatedat: '2025-08-01' })
    assert.equal(restored.id, 'u1')
    assert.equal(restored.watchedLectures, 120)
    assert.equal(restored.totalHours, 69.5)
    assert.equal(restored.courseUpdatedAt, '2025-08-01')
    assert.deepEqual(toUdemyCourseForm(restored), { ...emptyUdemyCourseForm(), ...toUdemyCourseForm(sample) })
  })
})

describe('udemy helpers', () => {
  it('computes the watched percent, treating completed courses as 100%', () => {
    assert.equal(udemyWatchedPercent({ watchedLectures: 120, totalLectures: 320 }), 38)
    assert.equal(udemyWatchedPercent({ watchedLectures: 5, totalLectures: 0 }), 0)
    assert.equal(udemyWatchedPercent({ watchedLectures: 0, totalLectures: 10, completed: true }), 100)
  })

  it('splits multi-value tags on commas and 、', () => {
    assert.deepEqual(splitUdemyTags('React, Next.js、React，Vue'), ['React', 'Next.js', 'Vue'])
    assert.deepEqual(splitUdemyTags(''), [])
  })

  const courses = [
    { id: 'a', name: 'React 完整課', instructor: 'Max', framework: 'React, Next.js', watchedLectures: 5, totalLectures: 10 },
    { id: 'b', name: 'Vue 入門', instructor: '', framework: 'Vue', watchedLectures: 0, totalLectures: 20, completed: true },
    { id: 'c', name: 'Docker', instructor: 'Max', framework: '', watchedLectures: 3, totalLectures: 0 },
  ]

  it('groups multi-value tags into every matching group and puts unset last', () => {
    const groups = groupUdemyCourses(courses, 'framework')
    assert.deepEqual(groups.map((group) => group.title), ['Next.js', 'React', 'Vue', '未填框架'])
    assert.deepEqual(groupUdemyCourses(courses, 'instructor').map((group) => [group.title, group.courses.length]), [['Max', 2], ['未填講師', 1]])
    assert.deepEqual(groupUdemyCourses(courses, 'status').map((group) => group.key), ['incomplete', 'completed'])
    assert.equal(groupUdemyCourses(courses, 'name')[0].courses.length, 3)
  })

  it('summarizes lectures with completed courses counted in full', () => {
    assert.deepEqual(summarizeUdemyCourses(courses), { watched: 28, total: 30, hours: 0, percent: 93, completedCount: 1 })
  })

  it('filters by status and searches every text field', () => {
    assert.deepEqual(filterUdemyCourses(courses, '', 'completed').map((course) => course.id), ['b'])
    assert.deepEqual(filterUdemyCourses(courses, 'next', 'all').map((course) => course.id), ['a'])
    assert.deepEqual(filterUdemyCourses(courses, 'max', 'incomplete').map((course) => course.id), ['a', 'c'])
  })
})

describe('udemy CSV', () => {
  it('round-trips every column including quoted names', () => {
    const csv = buildUdemyCsv([sample])
    assert.equal(csv.split('\n')[0], UDEMY_CSV_HEADERS.join(','))
    const parsed = parseUdemyCsv(csv)
    assert.deepEqual(parsed.errors, [])
    const { id: _id, ...expected } = sample
    assert.deepEqual(parsed.data, [expected])
  })

  it('accepts Chinese headers, year-month dates and 是/否', () => {
    const parsed = parseUdemyCsv('課程名稱,講師名稱,框架,已觀看堂數,課程總堂數,課程上次更新時間,課程總時長小時,課程已經完整收看\nReact 課,Max,React,10,10,2025/8,40,是\n')
    assert.deepEqual(parsed.errors, [])
    assert.equal(parsed.data[0].courseUpdatedAt, '2025-08-01')
    assert.equal(parsed.data[0].framework, 'React')
    assert.equal(parsed.data[0].completed, true)
  })

  it('reports bad rows without importing them', () => {
    const parsed = parseUdemyCsv('name,watchedLectures,totalLectures\nA,5,3\nB,x,3\n,1,1\n')
    assert.equal(parsed.data.length, 0)
    assert.equal(parsed.errors.length, 3)
    assert.match(parseUdemyCsv('instructor\nMax\n').errors[0], /name/)
  })

  it('matches existing courses by name case-insensitively', () => {
    assert.equal(udemyImportKey({ name: ' React Course ' }), udemyImportKey({ name: 'react course' }))
  })

  it('is part of the one-click menu backup and recognises Appwrite file names', () => {
    assert.ok(MENU_BACKUP_ENTRIES.some((entry) => entry.id === 'udemy' && entry.csvStem === 'udemy' && entry.csvOnly))
    assert.deepEqual(identifyBackupFile('csv/udemy.csv'), { id: 'udemy', kind: 'csv' })
    assert.deepEqual(identifyBackupFile('appwrite-feng-udemy-20260801.csv'), { id: 'udemy', kind: 'csv' })
  })
})
