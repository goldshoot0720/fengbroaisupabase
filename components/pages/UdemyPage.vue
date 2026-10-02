<template>
  <PageContainer>
    <div class="udemy-page">
      <p class="page-lead">
        記錄 Udemy 課程、講師、程式語言／框架／技術與觀看進度。可依講師、課程名稱、程式語言、框架、技術名稱或收看狀態分類，一眼看出已觀看堂數與觀看比重。可用 CSV 匯出備份或批次匯入。
      </p>

      <div class="actions-bar">
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋課程、講師、程式語言、框架或技術名稱"
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <select v-model="statusFilter" class="filter-select" aria-label="篩選收看狀態">
          <option value="all">全部收看狀態</option>
          <option value="completed">已完整收看</option>
          <option value="incomplete">尚未完整收看</option>
        </select>
        <div class="csv-actions">
          <button type="button" class="btn-export" :disabled="busy" title="匯出目前全部課程為 CSV" @click="exportToCsv">匯出 CSV</button>
          <label class="btn-import" title="從 CSV 匯入課程（相同課程名稱會更新）">
            匯入 CSV
            <input ref="csvFileInput" type="file" accept=".csv,text/csv" style="display:none" @change="handleCsvFileSelect" />
          </label>
          <button type="button" class="btn-primary" :disabled="busy || udemyLoading" @click="openForm(emptyUdemyCourseForm(), null)">新增課程</button>
        </div>
      </div>

      <div class="group-bar">
        <span class="group-label">依此分類</span>
        <div class="segmented" role="group" aria-label="分類方式">
          <button
            v-for="option in UDEMY_GROUP_MODES"
            :key="option.value"
            type="button"
            :aria-pressed="groupMode === option.value"
            :class="{ active: groupMode === option.value }"
            @click="groupMode = option.value"
          >{{ option.label }}</button>
        </div>
      </div>

      <dl v-if="udemyCourses.length" class="summary-tiles" aria-label="Udemy 摘要">
        <div class="summary-tile">
          <dt>課程數</dt>
          <dd>{{ udemyCourses.length }} 門</dd>
        </div>
        <div class="summary-tile">
          <dt>已經完整收看</dt>
          <dd>{{ overall.completedCount }} / {{ udemyCourses.length }} 門</dd>
        </div>
        <div class="summary-tile">
          <dt>已觀看堂數 / 課程總堂數</dt>
          <dd>{{ overall.watched }} / {{ overall.total }} 堂</dd>
        </div>
        <div class="summary-tile">
          <dt>已經觀看比重</dt>
          <dd>{{ overall.percent }}%</dd>
          <div class="progress" role="progressbar" aria-label="全部課程觀看比重" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="overall.percent">
            <span :class="{ done: overall.percent >= 100 }" :style="{ width: `${overall.percent}%` }"></span>
          </div>
        </div>
      </dl>

      <div class="summary-bar" aria-label="批次選取">
        <BulkSelectionControls
          :selection-mode="isSelectionMode"
          :is-all-selected="isAllSelected"
          :selected-count="selectedCount"
          :visible-count="filteredItems.length"
          :disabled="busy"
          @select-all="selectAllForDelete"
          @clear="exitSelectionMode"
          @delete-selected="requestBulkDelete"
        />
        <span>符合條件 {{ filteredItems.length }} 門</span>
        <span>總時長 {{ formatUdemyHours(overall.hours) }}</span>
      </div>

      <form v-if="formOpen" id="udemy-form" class="record-form" @submit.prevent="handleSubmit">
        <h2>{{ editingId ? '編輯課程' : '新增課程' }}</h2>
        <p class="form-hint">程式語言／框架／技術名稱可填多個，以「,」或「、」分隔。已觀看堂數到達課程總堂數時，會自動勾選「課程已經完整收看」。</p>
        <fieldset :disabled="busy" class="form-grid">
          <label class="field field-wide">
            <span>課程名稱 <em>*</em></span>
            <input id="udemy-name" v-model="form.name" type="text" maxlength="200" placeholder="例如 The Complete JavaScript Course" required />
          </label>
          <label class="field">
            <span>講師名稱</span>
            <input v-model="form.instructor" type="text" maxlength="200" list="udemy-instructors" placeholder="例如 Jonas Schmedtmann" />
            <datalist id="udemy-instructors">
              <option v-for="name in suggestions.instructor" :key="name" :value="name" />
            </datalist>
          </label>
          <label v-for="tagField in TAG_FIELDS" :key="tagField.key" class="field">
            <span>{{ tagField.label }}</span>
            <input
              v-model="form[tagField.key]"
              type="text"
              maxlength="200"
              :list="`udemy-${tagField.key}-options`"
              :placeholder="tagField.placeholder"
            />
            <datalist :id="`udemy-${tagField.key}-options`">
              <option v-for="option in tagOptions(tagField.key)" :key="option" :value="option" />
            </datalist>
          </label>
          <label class="field">
            <span>已觀看堂數</span>
            <input
              :value="form.watchedLectures"
              type="number"
              min="0"
              :max="Number(form.totalLectures) > 0 ? form.totalLectures : undefined"
              step="1"
              inputmode="numeric"
              @input="setLectures({ watchedLectures: toWholeNumber($event.target.value) })"
            />
          </label>
          <label class="field">
            <span>課程總堂數</span>
            <input
              :value="form.totalLectures"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              @input="setLectures({ totalLectures: toWholeNumber($event.target.value) })"
            />
          </label>
          <label class="field">
            <span>課程總時長（小時）</span>
            <input v-model.number="form.totalHours" type="number" min="0" step="0.1" inputmode="decimal" />
          </label>
          <label class="field">
            <span>課程上次更新時間</span>
            <input v-model="form.courseUpdatedAt" type="date" />
          </label>
          <label class="field checkbox-field">
            <input type="checkbox" :checked="form.completed === true" @change="setCompleted($event.target.checked)" />
            <span>課程已經完整收看</span>
          </label>
          <div class="field field-wide">
            <span>已經觀看比重 <strong class="tabular">{{ udemyWatchedPercent(form) }}%</strong></span>
            <div class="progress" role="progressbar" aria-label="此課程觀看比重" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="udemyWatchedPercent(form)">
              <span :class="{ done: udemyWatchedPercent(form) >= 100 }" :style="{ width: `${udemyWatchedPercent(form)}%` }"></span>
            </div>
          </div>
        </fieldset>
        <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>
        <div class="form-actions">
          <button type="button" class="btn-ghost" :disabled="saving" @click="closeForm">取消</button>
          <button type="submit" class="btn-primary" :disabled="busy">{{ saving ? '儲存中…' : editingId ? '儲存變更' : '新增課程' }}</button>
        </div>
      </form>

      <div v-if="importPreview" class="import-preview" role="dialog" aria-labelledby="udemy-import-title">
        <h2 id="udemy-import-title">匯入 CSV 預覽</h2>
        <p v-if="importPreview.errors.length">發現 {{ importPreview.errors.length }} 筆格式錯誤，不會寫入任何資料。</p>
        <p v-else>將匯入 {{ importPreview.data.length }} 筆；相同課程名稱會更新，其餘新增。</p>
        <ul v-if="importPreview.errors.length" class="import-errors">
          <li v-for="(item, index) in importPreview.errors.slice(0, 8)" :key="index">{{ item }}</li>
        </ul>
        <p v-if="importResult">成功 {{ importResult.successCount }}，失敗 {{ importResult.failCount }}</p>
        <p v-else-if="importing">匯入中 {{ importProgress.current }} / {{ importProgress.total }}</p>
        <div class="form-actions">
          <button type="button" class="btn-ghost" :disabled="importing" @click="closeImportPreview">取消</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="importing || importPreview.data.length === 0 || importPreview.errors.length > 0"
            @click="executeImport"
          >確認匯入</button>
        </div>
      </div>

      <div v-if="udemyError" class="load-error" role="alert">
        <p><strong>無法載入 Udemy 課程</strong></p>
        <p>{{ udemyError }}</p>
        <button v-if="udemyError.includes('udemy')" type="button" class="btn-ghost" @click="setCurrentPage('settings')">前往鋒兄設定</button>
      </div>
      <p v-else-if="!formOpen && actionError" class="action-error" role="alert">{{ actionError }}</p>

      <div v-if="udemyLoading && udemyCourses.length === 0" class="loading">載入 Udemy 課程…</div>
      <EmptyState
        v-else-if="!udemyError && filteredItems.length === 0"
        icon="🎓"
        :title="udemyCourses.length === 0 ? '尚無課程' : '沒有符合條件的課程'"
        :description="udemyCourses.length === 0 ? '先新增第一門 Udemy 課程與觀看進度。' : '調整搜尋文字或收看狀態篩選後再試一次。'"
      >
        <template v-if="udemyCourses.length === 0" #action>
          <button type="button" class="btn-primary" @click="openForm(emptyUdemyCourseForm(), null)">新增第一門</button>
        </template>
      </EmptyState>

      <div v-else class="course-groups">
        <section v-for="group in groups" :key="group.key" class="course-group" :aria-label="group.title || '全部課程'">
          <header v-if="group.title" class="group-header">
            <h2>
              {{ group.title }}
              <span class="group-count">{{ group.courses.length }} 門</span>
            </h2>
            <div class="group-progress">
              <span class="tabular">{{ group.stats.watched }} / {{ group.stats.total }} 堂</span>
              <div class="progress" role="progressbar" :aria-label="`${group.title} 觀看比重`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="group.stats.percent">
                <span :class="{ done: group.stats.percent >= 100 }" :style="{ width: `${group.stats.percent}%` }"></span>
              </div>
              <strong class="tabular">{{ group.stats.percent }}%</strong>
            </div>
          </header>

          <div class="course-table-wrap">
            <table class="course-table">
              <thead>
                <tr>
                  <th v-if="isSelectionMode" class="col-check"></th>
                  <th>課程名稱</th>
                  <th>講師名稱</th>
                  <th>程式語言／框架／技術</th>
                  <th>已觀看堂數 / 總堂數</th>
                  <th>總時長</th>
                  <th>課程上次更新</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="course in group.courses" :key="course.id">
                  <td v-if="isSelectionMode" class="col-check">
                    <input type="checkbox" :checked="selectedIds.has(course.id)" @change="toggleSelect(course.id)" :aria-label="`選取 ${course.name}`">
                  </td>
                  <td data-label="課程名稱">
                    <strong class="course-name">{{ course.name }}</strong>
                    <div>
                      <Badge :variant="course.completed ? 'success' : 'default'" size="sm">{{ course.completed ? '已完整收看' : '尚未完整收看' }}</Badge>
                    </div>
                  </td>
                  <td data-label="講師名稱">{{ course.instructor?.trim() || '—' }}</td>
                  <td data-label="程式語言／框架／技術">
                    <ul v-if="courseTags(course).length" class="tag-list" aria-label="程式語言、框架與技術名稱">
                      <li v-for="tag in courseTags(course)" :key="`${tag.field}-${tag.value}`" :class="`tag-${tag.field}`" :title="`${tag.label}：${tag.value}`">{{ tag.value }}</li>
                    </ul>
                    <span v-else class="muted">—</span>
                  </td>
                  <td data-label="已觀看堂數 / 總堂數">
                    <div class="lecture-row tabular">
                      <span>{{ course.watchedLectures || 0 }} / {{ course.totalLectures || 0 }} 堂</span>
                      <strong>{{ udemyWatchedPercent(course) }}%</strong>
                    </div>
                    <div class="progress" role="progressbar" :aria-label="`${course.name} 觀看比重`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="udemyWatchedPercent(course)">
                      <span :class="{ done: udemyWatchedPercent(course) >= 100 }" :style="{ width: `${udemyWatchedPercent(course)}%` }"></span>
                    </div>
                  </td>
                  <td data-label="總時長" class="tabular muted">{{ formatUdemyHours(course.totalHours) }}</td>
                  <td data-label="課程上次更新" class="tabular muted">{{ formatUdemyUpdated(course.courseUpdatedAt) }}</td>
                  <td data-label="操作" class="row-actions">
                    <button type="button" class="btn-icon" :disabled="busy" @click="openForm(toUdemyCourseForm(course), course.id)">編輯</button>
                    <button type="button" class="btn-icon" :disabled="busy" title="複製此課程（預先填好欄位，供你確認後新增）" @click="openForm({ ...toUdemyCourseForm(course), name: `${course.name || '未命名'} (複製)` }, null)">複製</button>
                    <button type="button" class="btn-icon danger" :disabled="busy" @click="requestDelete(course)">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ConfirmDialog
        v-model="deleteOpen"
        title="確認刪除"
        :message="deleteMessage"
        confirm-text="確認刪除"
        cancel-text="取消"
        confirm-variant="danger"
        @confirm="confirmDelete"
        @cancel="pendingDelete = null"
      />
    </div>
  </PageContainer>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useUdemyCourses } from '../../composables/useUdemyCourses'
import { useNavigation } from '../../composables/useNavigation'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import { useSelectionSet } from '../../composables/useSelectionSet'
import BulkSelectionControls from '../ui/BulkSelectionControls.vue'
import {
  UDEMY_GROUP_MODES,
  emptyUdemyCourseForm,
  filterUdemyCourses,
  formatUdemyHours,
  formatUdemyUpdated,
  groupUdemyCourses,
  splitUdemyTags,
  summarizeUdemyCourses,
  toUdemyCourseForm,
  udemyGroupValues,
  udemyWatchedPercent,
} from '../../utils/managementRecords'
import { buildUdemyCsv, parseUdemyCsv } from '../../utils/udemyCsv'

const TAG_FIELDS = [
  { key: 'language', label: '程式語言', short: '語言', placeholder: '例如 JavaScript、Python' },
  { key: 'framework', label: '框架', short: '框架', placeholder: '例如 React、Next.js' },
  { key: 'technology', label: '技術名稱', short: '技術', placeholder: '例如 Docker、AWS' },
]

const {
  udemyCourses,
  udemyLoading,
  udemyError,
  loadUdemyCourses,
  addUdemyCourse,
  updateUdemyCourse,
  deleteUdemyCourse,
  importUdemyCourses,
} = useUdemyCourses()
const { setCurrentPage } = useNavigation()

const searchQuery = ref('')
const statusFilter = ref('all')
const groupMode = ref('instructor')
const { recentSearches, applyRecentSearch, removeRecentSearch, clearRecentSearches, commitSearchHistory } =
  useRecentSearchHistory('feng-udemy-searches', searchQuery)

const formOpen = ref(false)
const editingId = ref(null)
const form = ref(emptyUdemyCourseForm())
const saving = ref(false)
const actionError = ref('')
const pendingDelete = ref(null)
const csvFileInput = ref(null)
const importPreview = ref(null)
const importResult = ref(null)
const importing = ref(false)
const importProgress = ref({ current: 0, total: 0 })
let importCloseTimer = null

const busy = computed(() => saving.value || importing.value)
const filteredItems = computed(() => filterUdemyCourses(udemyCourses.value, searchQuery.value, statusFilter.value))
const groups = computed(() =>
  groupUdemyCourses(filteredItems.value, groupMode.value).map((group) => ({
    ...group,
    stats: summarizeUdemyCourses(group.courses),
  })),
)
const overall = computed(() => summarizeUdemyCourses(udemyCourses.value))
const {
  isSelectionMode,
  selectedIds,
  selectedCount,
  isAllSelected,
  selectedItems,
  toggleSelect,
  selectAllForDelete,
  exitSelectionMode,
} = useSelectionSet(filteredItems)

// 輸入建議：各欄位已用過的值
const suggestions = computed(() => {
  const collect = (field) =>
    [...new Set(udemyCourses.value.flatMap((course) => udemyGroupValues(course, field)))]
      .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  return {
    instructor: collect('instructor'),
    language: collect('language'),
    framework: collect('framework'),
    technology: collect('technology'),
  }
})

// datalist 只能補整格；多值時以最後一個分隔符號後的片段比對建議
const tagOptions = (field) => {
  const value = String(form.value[field] || '')
  const prefix = /[,、，]/.test(value) ? value.replace(/[^,、，]*$/, '') : ''
  const used = new Set(splitUdemyTags(value))
  return suggestions.value[field].filter((option) => !used.has(option)).map((option) => `${prefix}${option}`)
}

const courseTags = (course) =>
  TAG_FIELDS.flatMap((field) =>
    splitUdemyTags(course[field.key]).map((value) => ({ field: field.key, label: field.short, value })))

const deleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value) => { if (!value) pendingDelete.value = null },
})
const deleteMessage = computed(() => {
  const course = pendingDelete.value
  if (!course) return ''
  return `確定刪除「${course.name}${course.instructor ? `（${course.instructor}）` : ''}」？此操作無法復原。`
})

onMounted(() => {
  loadUdemyCourses()
})

const toWholeNumber = (value) => Math.max(0, Math.floor(Number(value) || 0))

/** 堂數改動時：看到最後一堂就自動勾選「已完整收看」，往回改則取消。 */
const setLectures = (patch) => {
  const next = { ...form.value, ...patch }
  const total = Number(next.totalLectures) || 0
  const watched = Number(next.watchedLectures) || 0
  form.value = { ...next, completed: total > 0 ? watched >= total : next.completed }
}

const setCompleted = (completed) => {
  const current = form.value
  form.value = {
    ...current,
    completed,
    // 勾選已完整收看時，已觀看堂數補滿到總堂數
    watchedLectures: completed && Number(current.totalLectures) > 0 ? current.totalLectures : current.watchedLectures,
  }
}

const openForm = async (next, id) => {
  editingId.value = id
  form.value = next
  actionError.value = ''
  formOpen.value = true
  await nextTick()
  document.getElementById('udemy-form')?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
  document.getElementById('udemy-name')?.focus({ preventScroll: true })
}

const closeForm = () => {
  formOpen.value = false
  editingId.value = null
  form.value = emptyUdemyCourseForm()
  actionError.value = ''
}

const handleSubmit = async () => {
  if (busy.value) return
  saving.value = true
  actionError.value = ''
  try {
    const result = editingId.value
      ? await updateUdemyCourse(editingId.value, form.value)
      : await addUdemyCourse(form.value)
    if (!result.success) {
      actionError.value = result.error || '儲存失敗，請稍後再試。'
      return
    }
    closeForm()
  } finally {
    saving.value = false
  }
}

const requestDelete = (course) => {
  actionError.value = ''
  pendingDelete.value = course
}

const requestBulkDelete = async () => {
  if (!selectedCount.value) return
  if (!window.confirm(`確定刪除選取的 ${selectedCount.value} 門課程？此操作無法復原。`)) return
  actionError.value = ''
  // 樂觀刪除：選中的列立刻消失、請求並行送出；失敗的會自動還原。
  const targets = [...selectedItems.value]
  exitSelectionMode()
  const results = await Promise.all(targets.map((course) => deleteUdemyCourse(course.id)))
  const failed = results.find((result) => !result.success)
  if (failed) actionError.value = failed.error || '部分刪除失敗，請稍後再試。'
}

const confirmDelete = async () => {
  const course = pendingDelete.value
  if (!course) return
  const result = await deleteUdemyCourse(course.id)
  if (!result.success) {
    actionError.value = result.error || '刪除失敗，請確認連線後再試一次。'
    return
  }
  if (editingId.value === course.id) closeForm()
  pendingDelete.value = null
}

const exportToCsv = () => {
  if (busy.value) return
  try {
    const sorted = [...udemyCourses.value].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant'))
    const blob = new Blob([`﻿${buildUdemyCsv(sorted)}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'supabase-udemy.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    actionError.value = ''
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '匯出 CSV 失敗'
  }
}

const handleCsvFileSelect = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.csv')) {
    actionError.value = '請選擇 CSV 檔案'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    if (importCloseTimer) {
      window.clearTimeout(importCloseTimer)
      importCloseTimer = null
    }
    importResult.value = null
    actionError.value = ''
    importPreview.value = parseUdemyCsv(typeof reader.result === 'string' ? reader.result : '')
  }
  reader.onerror = () => { actionError.value = '讀取 CSV 檔案失敗' }
  reader.readAsText(file, 'UTF-8')
}

const closeImportPreview = () => {
  if (importing.value) return
  if (importCloseTimer) {
    window.clearTimeout(importCloseTimer)
    importCloseTimer = null
  }
  importPreview.value = null
  importResult.value = null
  importProgress.value = { current: 0, total: 0 }
}

const executeImport = async () => {
  if (!importPreview.value || importPreview.value.data.length === 0 || importPreview.value.errors.length > 0 || importing.value) return
  importing.value = true
  importResult.value = null
  importProgress.value = { current: 0, total: importPreview.value.data.length }
  const result = await importUdemyCourses(importPreview.value.data)
  importProgress.value = { current: importPreview.value.data.length, total: importPreview.value.data.length }
  importResult.value = { successCount: result.successCount ?? 0, failCount: result.failCount ?? 0 }
  importing.value = false
  if (result.failCount === 0) {
    importCloseTimer = window.setTimeout(() => {
      closeImportPreview()
    }, 1200)
  }
}
</script>

<style scoped>
.udemy-page {
  display: grid;
  gap: var(--spacing-md);
}

.page-lead,
.muted,
.form-hint,
.group-label,
.group-count {
  color: var(--text-secondary);
}

.page-lead {
  margin: 0;
  line-height: 1.7;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.actions-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.search-area {
  flex: 1 1 280px;
  min-width: 220px;
}

.filter-select,
.field input:not([type="checkbox"]) {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-primary);
  font: inherit;
}

.filter-select:focus,
.field input:not([type="checkbox"]):focus {
  outline: 2px solid color-mix(in oklab, var(--primary) 45%, transparent);
  border-color: var(--primary);
}

.filter-select {
  width: auto;
  min-width: 9rem;
}

.csv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-export,
.btn-import,
.btn-primary,
.btn-ghost,
.btn-icon {
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0.7rem 1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn-export,
.btn-import {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.btn-import {
  display: inline-flex;
  align-items: center;
}

.btn-primary {
  background: var(--primary-solid);
  color: var(--on-primary);
}

.btn-ghost {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.btn-icon {
  padding: 0.4rem 0.7rem;
  background: var(--bg-muted);
  color: var(--text-primary);
}

.btn-icon.danger {
  color: var(--danger);
}

.btn-primary:disabled,
.btn-export:disabled,
.btn-import:disabled,
.btn-ghost:disabled,
.btn-icon:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.group-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.group-label {
  font-size: 0.88rem;
}

.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-inset);
}

.segmented button {
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.8rem;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.segmented button:hover {
  color: var(--text-primary);
}

.segmented button.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: 0 1px 2px color-mix(in oklab, var(--text-primary) 12%, transparent);
}

.summary-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.summary-tile {
  display: grid;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  background: var(--bg-inset);
  border-radius: var(--radius-md);
}

.summary-tile dt {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.summary-tile dd {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.summary-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: var(--bg-inset);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.progress {
  width: 100%;
  height: 0.5rem;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-muted);
}

.progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.2s ease;
}

.progress span.done {
  background: var(--success);
}

@media (prefers-reduced-motion: reduce) {
  .progress span {
    transition: none;
  }
}

.record-form,
.import-preview,
.load-error,
.course-table-wrap {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem 1.1rem;
}

.record-form {
  scroll-margin-top: 6rem;
}

.record-form h2,
.import-preview h2 {
  margin: 0;
  font-size: 1.15rem;
}

.import-errors {
  margin: 0.5rem 0 0;
  padding-left: 1.2rem;
  color: var(--danger);
}

.form-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  border: 0;
  padding: 0;
  min-width: 0;
}

.field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.field em {
  color: var(--danger);
  font-style: normal;
}

.field strong {
  color: var(--text-primary);
}

.field-wide {
  grid-column: 1 / -1;
}

.checkbox-field {
  display: flex;
  align-items: center;
  align-self: end;
  gap: 0.55rem;
  min-height: 2.9rem;
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
}

.checkbox-field input {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-error,
.load-error {
  color: var(--danger);
}

.course-groups {
  display: grid;
  gap: 1.5rem;
}

.course-group {
  display: grid;
  gap: 0.75rem;
}

.group-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.group-header h2 {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.1rem;
}

.group-count {
  font-size: 0.85rem;
  font-weight: 400;
}

.group-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: min(100%, 20rem);
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.group-progress > span {
  flex-shrink: 0;
}

.group-progress strong {
  flex-shrink: 0;
  min-width: 2.75rem;
  text-align: right;
  color: var(--text-primary);
}

.course-table {
  width: 100%;
  border-collapse: collapse;
}

.course-table th,
.course-table td {
  text-align: left;
  padding: 0.85rem 0.5rem;
  border-top: 1px solid var(--border-subtle);
  vertical-align: top;
}

.course-table thead th {
  border-top: 0;
}

.course-table th {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.course-name {
  display: block;
  margin-bottom: 0.35rem;
  overflow-wrap: anywhere;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag-list li {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-xs);
  font-size: 0.78rem;
  font-weight: 600;
}

.tag-language {
  background: var(--info-light);
  color: var(--info-text);
}

.tag-framework {
  background: var(--primary-light);
  color: var(--primary-text);
}

.tag-technology {
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.lecture-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .course-table thead {
    display: none;
  }

  .course-table tr {
    display: grid;
    gap: 0.5rem;
    padding: 0.9rem 0;
    border-top: 1px solid var(--border-subtle);
  }

  .course-table tbody tr:first-child {
    border-top: 0;
  }

  .course-table td {
    display: grid;
    gap: 0.2rem;
    border: 0;
    padding: 0;
  }

  .course-table td[data-label]::before {
    content: attr(data-label);
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-muted);
  }
}
</style>
