<template>
  <div class="subscription-management">
    <!-- 操作列 -->
    <div class="actions-bar">
      <div class="search-area">
        <RecentSearchInput
          v-model="searchQuery"
          placeholder="搜尋訂閱..."
          :terms="recentSearches"
          @submit="commitSearchHistory()"
          @apply="applyRecentSearch"
          @remove="removeRecentSearch"
          @clear="clearRecentSearches"
        />
      </div>
      <div class="date-filters">
        <select v-model="sortBy" class="date-filter-select" aria-label="訂閱排序">
          <option value="date">最近付款</option>
          <option value="price">費用最高</option>
          <option value="overdue">已過期優先</option>
          <option value="name">服務名稱</option>
        </select>
        <select v-model="selectedYear" class="date-filter-select">
          <option value="">全部年份</option>
          <option v-for="year in availableYears" :key="year" :value="String(year)">
            {{ year }} 年
          </option>
        </select>
        <select v-model="selectedMonth" class="date-filter-select">
          <option value="">全部月份</option>
          <option value="none">無月份</option>
          <option v-for="month in 12" :key="month" :value="String(month)">
            {{ month }} 月
          </option>
        </select>
      </div>
      <div class="filter-buttons">
        <button
          :class="['filter-btn', { active: renewFilter === 'all' }]"
          @click="renewFilter = 'all'"
        >全部</button>
        <button
          :class="['filter-btn filter-on', { active: renewFilter === 'renew' }]"
          @click="renewFilter = 'renew'"
        >續訂</button>
        <button
          :class="['filter-btn filter-off', { active: renewFilter === 'notRenew' }]"
          @click="renewFilter = 'notRenew'"
        >非續訂</button>
        <button
          :class="['filter-btn filter-soon', { active: renewFilter === 'within7Days' }]"
          @click="renewFilter = 'within7Days'"
        >7天內</button>
      </div>
      <div class="csv-actions">
        <button
          v-if="subscriptions.length > 0"
          @click="exportSubscriptionsCsv"
          class="btn-export"
        >
          匯出 CSV
        </button>
        <label class="btn-import">
          匯入 CSV
          <input
            ref="csvFileInput"
            type="file"
            accept=".csv"
            style="display:none"
            @change="handleImportCsv"
          />
        </label>
      </div>
    </div>

    <!-- 月費總計 + 批量操作 -->
    <div class="summary-bar">
      <div class="summary-left">
        <!-- 批量選擇模式按鈕 -->
        <button
          v-if="!batchMode && filteredSubscriptions.length > 0"
          @click="enterBatchMode"
          class="btn-batch-mode"
        >
          批量選擇
        </button>
        <button
          v-if="!batchMode && filteredSubscriptions.length > 0"
          @click="startSelectAllDelete"
          class="btn-batch-mode"
          title="全選刪除"
        >
          全選刪除
        </button>
        
        <!-- 新增按鈕 -->
        <button @click="startAddRow" class="btn-add-icon" title="新增訂閱">+</button>
        
        <!-- 批量選擇模式下的全選/取消 -->
        <template v-if="batchMode">
          <label class="select-all-label">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
            <span>全選</span>
          </label>
          <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
        </template>
        
        <span>共 {{ subscriptions.length }} 個項目</span>
        <span class="renew-stat renew-stat-on">續訂 {{ subscriptionRenewStats.renew }} 個</span>
        <span class="renew-stat renew-stat-off">不續訂 {{ subscriptionRenewStats.notRenew }} 個</span>
        <span v-if="selectedIds.length > 0" class="selected-count">
          已選 {{ selectedIds.length }} 項
        </span>
      </div>
      <div class="summary-right">
        <button type="button" class="btn-trash" @click="trashOpen = true">
          垃圾桶<span v-if="trashedSubscriptions.length"> ({{ trashedSubscriptions.length }})</span>
        </button>
        <button
          v-if="selectedIds.length > 0"
          @click="openConfirmModal"
          class="btn-batch-delete"
        >
          刪除選中 ({{ selectedIds.length }})
        </button>
        <span class="total-cost">每月總計：NT$ {{ totalMonthlyCostTWD }}</span>
      </div>
    </div>

    <!-- 訂閱列表 -->
    <div v-if="subscriptionLoading" class="subscription-skeleton" role="status" aria-live="polite">
      <strong>正在載入訂閱資料</strong>
      <span>安全連線完成後會顯示目前的訂閱項目。</span>
      <i v-for="n in 6" :key="n"></i>
    </div>
    <div v-else-if="subscriptionError" class="load-error" role="alert">
      <div><strong>無法載入訂閱資料</strong><span>{{ subscriptionError }}</span></div>
      <button type="button" @click="loadSubscriptions(true)">重新載入</button>
    </div>
    <div v-else-if="filteredSubscriptions.length === 0 && !showAddRow" class="empty-state">
      暫無訂閱記錄
    </div>
    <div v-else class="sub-table-container">
      <table class="sub-table">
        <thead>
          <tr>
            <th v-if="batchMode" class="col-checkbox">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th class="col-name">服務名稱</th>
            <th class="col-account">帳號</th>
            <th class="col-date">下次付款</th>
            <th class="col-price">月費</th>
            <th class="col-renew">續訂</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 新增行 -->
          <tr v-if="showAddRow" class="add-row">
            <td v-if="batchMode" class="col-checkbox"></td>
            <td class="col-name">
              <input v-model="addForm.name" type="text" class="inline-input" placeholder="服務名稱 *" />
              <input v-model="addForm.site" type="url" class="inline-input inline-small" placeholder="網站網址" />
              <textarea
                v-model="addForm.note"
                class="inline-input inline-small inline-textarea"
                rows="2"
                placeholder="備註"
              />
              <div v-if="addDuplicateSubscriptions.length > 0" class="duplicate-warning">
                可能重複：{{ formatDuplicateNames(addDuplicateSubscriptions) }}
              </div>
            </td>
            <td class="col-account">
              <input v-model="addForm.account" type="text" class="inline-input" placeholder="帳號/Email" list="account-options" />
            </td>
            <td class="col-date">
              <input v-model="addForm.nextdate" type="date" class="inline-input inline-date" />
              <div class="date-adjust-btns">
                <button type="button" class="btn-date-adjust" @click="adjustDate(addForm, -30)">-30</button>
                <button type="button" class="btn-date-adjust" @click="adjustDate(addForm, 30)">+30</button>
              </div>
            </td>
            <td class="col-price">
              <div class="inline-price-group">
                <select v-model="addForm.currency" class="inline-select">
                  <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }}</option>
                </select>
                <input v-model="addForm.price" type="number" class="inline-input inline-price" placeholder="0" />
              </div>
            </td>
            <td class="col-renew">
              <button
                @click="addForm.iscontinue = !addForm.iscontinue"
                class="renew-toggle"
                :class="{ active: addForm.iscontinue !== false }"
              >
                {{ addForm.iscontinue !== false ? 'ON' : 'OFF' }}
              </button>
            </td>
            <td class="col-actions">
              <button @click="saveAddRow" class="btn-icon btn-save-icon" title="新增">✓</button>
              <button @click="cancelAddRow" class="btn-icon btn-cancel-icon" title="取消">✕</button>
            </td>
          </tr>
          
          <tr 
            v-for="sub in paginatedSubscriptions"
            :key="sub.id"
            :data-subscription-id="sub.id"
            :class="{ selected: selectedIds.includes(sub.id), editing: editingRowId === sub.id }"
          >
            <!-- 批量選擇 Checkbox -->
            <td v-if="batchMode" class="col-checkbox">
              <input
                type="checkbox"
                :value="sub.id"
                v-model="selectedIds"
              />
            </td>
            
            <!-- 編輯模式：行内編輯 -->
            <template v-if="editingRowId === sub.id">
              <td class="col-name">
                <input v-model="editForm.name" type="text" class="inline-input" placeholder="服務名稱" />
                <input v-model="editForm.site" type="url" class="inline-input inline-small" placeholder="網站網址" />
                <textarea
                  v-model="editForm.note"
                  class="inline-input inline-small inline-textarea"
                  rows="2"
                  placeholder="備註"
                />
                <div v-if="editDuplicateSubscriptions.length > 0" class="duplicate-warning">
                  可能重複：{{ formatDuplicateNames(editDuplicateSubscriptions) }}
                </div>
              </td>
              <td class="col-account">
                <input v-model="editForm.account" type="text" class="inline-input" placeholder="帳號/Email" list="account-options" />
              </td>
              <td class="col-date">
                <input v-model="editForm.nextdate" type="date" class="inline-input inline-date" />
                <div class="date-adjust-btns">
                  <button type="button" class="btn-date-adjust" @click="adjustDate(editForm, -30)">-30</button>
                  <button type="button" class="btn-date-adjust" @click="adjustDate(editForm, 30)">+30</button>
                </div>
              </td>
              <td class="col-price">
                <div class="inline-price-group">
                  <select v-model="editForm.currency" class="inline-select">
                    <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }}</option>
                  </select>
                  <input v-model="editForm.price" type="number" class="inline-input inline-price" placeholder="0" />
                </div>
              </td>
              <td class="col-renew">
                <button
                  @click="editForm.iscontinue = !editForm.iscontinue"
                  class="renew-toggle"
                  :class="{ active: editForm.iscontinue !== false }"
                >
                  {{ editForm.iscontinue !== false ? 'ON' : 'OFF' }}
                </button>
              </td>
              <td class="col-actions">
                <button @click="saveInlineEdit(sub.id)" class="btn-icon btn-save-icon" title="儲存">✓</button>
                <button @click="cancelInlineEdit" class="btn-icon btn-cancel-icon" title="取消">✕</button>
              </td>
            </template>
            
            <!-- 正常顯示模式 -->
            <template v-else>
              <td class="col-name">
                <div class="name-cell">
                  <span class="service-name-row">
                    <img
                      v-if="sub.site"
                      :src="getFaviconUrl(sub.site)"
                      class="service-favicon"
                      @error="$event.target.style.display='none'"
                    />
                    <a v-if="sub.site" :href="sub.site" target="_blank" class="service-name service-link">{{ sub.name }}</a>
                    <span v-else class="service-name">{{ sub.name }}</span>
                  </span>
                  <span v-if="sub.note" class="service-note">{{ sub.note }}</span>
                </div>
              </td>
              <td class="col-account">
                <span class="account-text" :title="maskAccount(sub.account)">{{ maskAccount(sub.account) }}</span>
              </td>
              <td class="col-date">
                <div class="date-cell" :class="getDateClass(sub.nextdate)">
                  <span class="date-primary">{{ formatDate(sub.nextdate) }}</span>
                  <span class="date-secondary">{{ formatDaysUntil(sub.nextdate) }}</span>
                </div>
              </td>
              <td class="col-price">
                <span class="price-value">
                  {{ getCurrencySymbol(sub.currency) }} {{ sub.price || 0 }}
                </span>
                <span v-if="sub.currency && sub.currency !== 'TWD'" class="twd-converted">
                  (NT$ {{ toTWD(sub.price, sub.currency) }})
                </span>
              </td>
              <td class="col-renew">
                <button
                  @click="toggleIsContinue(sub)"
                  class="renew-toggle"
                  :class="{ active: sub.iscontinue !== false }"
                  :title="sub.iscontinue !== false ? '續訂中' : '已停止續訂'"
                >
                  {{ sub.iscontinue !== false ? 'ON' : 'OFF' }}
                </button>
              </td>
              <td class="col-actions">
                <button @click="startInlineEdit(sub)" class="btn-icon btn-edit-icon" title="編輯">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button @click="copySubscription(sub)" class="btn-icon btn-copy-icon" title="複製訂閱" aria-label="複製訂閱">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button @click="selectedSubscription = sub" class="btn-icon btn-more-icon" title="查看詳情" aria-label="查看訂閱詳情">⋯</button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="totalPages > 1" class="pagination" aria-label="訂閱分頁">
      <button type="button" :disabled="currentPage === 1" @click="currentPage--">上一頁</button>
      <span>第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ filteredSubscriptions.length }} 筆</span>
      <button type="button" :disabled="currentPage === totalPages" @click="currentPage++">下一頁</button>
    </nav>

    <Teleport to="body">
      <div v-if="selectedSubscription" class="detail-backdrop" @click.self="selectedSubscription = null">
        <aside class="detail-drawer" aria-labelledby="subscription-detail-title">
          <div class="detail-header"><div><span>訂閱詳情</span><h2 id="subscription-detail-title">{{ selectedSubscription.name }}</h2></div><button type="button" aria-label="關閉詳情" @click="selectedSubscription = null">×</button></div>
          <dl>
            <div><dt>帳號</dt><dd>{{ maskAccount(selectedSubscription.account) }}</dd></div>
            <div><dt>下次付款</dt><dd>{{ formatDate(selectedSubscription.nextdate) }} · {{ formatDaysUntil(selectedSubscription.nextdate) }}</dd></div>
            <div><dt>費用</dt><dd>{{ getCurrencySymbol(selectedSubscription.currency) }} {{ selectedSubscription.price || 0 }}</dd></div>
            <div><dt>續訂狀態</dt><dd>{{ selectedSubscription.iscontinue !== false ? '續訂中' : '已停止續訂' }}</dd></div>
            <div class="detail-note"><dt>備註</dt><dd>{{ selectedSubscription.note || '沒有備註' }}</dd></div>
          </dl>
          <div class="detail-actions"><button type="button" @click="startInlineEdit(selectedSubscription); selectedSubscription = null">編輯</button><button type="button" class="danger" @click="moveSubscriptionToTrash(selectedSubscription); selectedSubscription = null">移到垃圾桶</button></div>
        </aside>
      </div>
    </Teleport>

    <!-- 安全確認 Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="closeConfirmModal">
      <div class="modal confirm-modal">
        <div class="modal-header danger">
          <h2>⚠️ 安全確認</h2>
          <button @click="closeConfirmModal" class="btn-close">&times;</button>
        </div>
        <div class="confirm-body">
          <p class="confirm-warning">
            您即將刪除 <strong>{{ selectedIds.length }}</strong> 個訂閱項目
          </p>
          <p class="confirm-hint">
            此操作不可復原。請在下方輸入 <code>{{ CONFIRM_TEXT }}</code> 以確認刪除：
          </p>
          <input
            v-model="confirmInput"
            type="text"
            class="confirm-input"
            :placeholder="CONFIRM_TEXT"
            @keyup.enter="confirmBatchDelete"
          />
          <p v-if="confirmInput && !isConfirmValid" class="confirm-error">
            輸入不正確，請輸入 {{ CONFIRM_TEXT }}
          </p>
        </div>
        <div class="modal-actions">
          <button @click="closeConfirmModal" class="btn-cancel">取消</button>
          <button
            @click="confirmBatchDelete"
            class="btn-submit btn-danger"
            :disabled="!isConfirmValid"
          >
            確認刪除 ({{ selectedIds.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- 帳號選項 datalist -->
    <datalist id="account-options">
      <option v-for="name in accountNames" :key="name" :value="name" />
    </datalist>
    <RestoreTrashModal
      v-model="trashOpen"
      title="訂閱垃圾桶"
      :items="trashedSubscriptions"
      :label-fields="['name']"
      @restore="restoreTrashedSubscription"
      @clear="clearSubscriptionTrash"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useSubscriptions } from '../../composables/useSubscriptions'
import { useFormatters } from '../../composables/useFormatters'
import { useCommonAccounts } from '../../composables/useCommonAccounts'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'
import RestoreTrashModal from '../ui/RestoreTrashModal.vue'
import { useLocalTrash } from '../../composables/useLocalTrash'

const searchQuery = ref('')
const sortBy = ref('date')
const currentPage = ref(1)
const pageSize = 20
const selectedSubscription = ref(null)
const renewFilter = ref('all')
const selectedYear = ref('')
const selectedMonth = ref('')
const EMPTY_MONTH_FILTER = 'none'

const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-subscription-search-history', searchQuery)

const {
  subscriptions,
  subscriptionLoading,
  subscriptionError,
  totalMonthlyCost,
  sortedSubscriptions,
  loadSubscriptions,
  addSubscriptionInline,
  importSubscriptions,
  isAppwriteFormat,
  updateSubscriptionInline,
  deleteSubscription: deleteSubscriptionRecord,
  toggleIsContinue,
  batchDeleteSubscriptions,
  restoreSubscription,
} = useSubscriptions()

const trashOpen = ref(false)
const {
  items: trashedSubscriptions,
  load: loadSubscriptionTrash,
  moveToTrash: saveSubscriptionsToTrash,
  remove: removeSubscriptionFromTrash,
  clear: clearSubscriptionTrashRecords,
} = useLocalTrash('fengbro.subscription.trash')

const moveSubscriptionToTrash = async (subscription) => {
  const result = await deleteSubscriptionRecord(subscription.id)
  if (result?.success) saveSubscriptionsToTrash(subscription)
}

const restoreTrashedSubscription = async (item) => {
  const result = await restoreSubscription(item.record)
  if (result.success) removeSubscriptionFromTrash(item)
  else alert(`還原訂閱失敗：${result.error}`)
}

const clearSubscriptionTrash = () => {
  if (!trashedSubscriptions.value.length) return
  if (confirm(`永久清空 ${trashedSubscriptions.value.length} 筆訂閱？此操作無法復原。`)) clearSubscriptionTrashRecords()
}

const { formatDate, getDateClass } = useFormatters()

const formatDaysUntil = (dateString) => {
  if (!dateString) return '-'

  const today = new Date()
  const targetDate = new Date(dateString)

  if (Number.isNaN(targetDate.getTime())) return '-'

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  const diffDays = Math.round((targetStart - todayStart) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays < 0) return `已過期 ${Math.abs(diffDays)} 天`
  return `${diffDays} 天後`
}

// 批量選擇
const selectedIds = ref([])
const batchMode = ref(false)

// 進入批量選擇模式
const enterBatchMode = () => {
  batchMode.value = true
  selectedIds.value = []
}

const startSelectAllDelete = () => {
  batchMode.value = true
  selectedIds.value = filteredSubscriptions.value.map((item) => item.id)
}

// 退出批量選擇模式
const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value = []
}

// 行内編輯
const editingRowId = ref(null)
const editForm = ref({
  name: '',
  nextdate: '',
  price: null,
  currency: 'TWD',
  iscontinue: true
})

// 行内新增
const showAddRow = ref(false)
const addForm = ref({
  name: '',
  site: '',
  account: '',
  nextdate: '',
  price: null,
  currency: 'TWD',
  note: '',
  iscontinue: true
})

const normalizeDuplicateValue = (value) => String(value || '').trim().toLowerCase()

const normalizeDuplicateSite = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const url = new URL(candidate)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()
    const path = url.pathname.replace(/\/+$/, '')
    return `${host}${path}`
  } catch {
    return raw
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '')
      .toLowerCase()
  }
}

const findDuplicateSubscriptions = (form, excludeId = null) => {
  const name = normalizeDuplicateValue(form?.name)
  const site = normalizeDuplicateSite(form?.site)
  const account = normalizeDuplicateValue(form?.account)

  if (!name && !site && !account) return []

  return subscriptions.value.filter((sub) => {
    if (excludeId && sub.id === excludeId) return false

    const subName = normalizeDuplicateValue(sub.name)
    const subSite = normalizeDuplicateSite(sub.site)
    const subAccount = normalizeDuplicateValue(sub.account)
    const sameName = name && subName === name
    const sameSite = site && subSite === site
    const sameAccount = account && subAccount === account

    return sameName || (sameSite && (!account || sameAccount)) || (sameName && sameAccount)
  })
}

const formatDuplicateNames = (items) => {
  return items
    .slice(0, 3)
    .map((item) => item.name || '未命名訂閱')
    .join('、')
}

const confirmDuplicateSubscription = (items) => {
  if (items.length === 0) return true

  const names = formatDuplicateNames(items)
  return confirm(`偵測到可能重複訂閱：${names}\n\n仍要儲存嗎？`)
}

const addDuplicateSubscriptions = computed(() => findDuplicateSubscriptions(addForm.value))
const editDuplicateSubscriptions = computed(() => findDuplicateSubscriptions(editForm.value, editingRowId.value))

const startAddRow = () => {
  showAddRow.value = true
  addForm.value = {
    name: '',
    site: '',
    account: '',
    nextdate: '',
    price: null,
    currency: 'TWD',
    note: '',
    iscontinue: true
  }
}

const cancelAddRow = () => {
  showAddRow.value = false
}

// 日期加減天數
const adjustDate = (form, days) => {
  const base = form.nextdate ? new Date(form.nextdate) : new Date()
  base.setDate(base.getDate() + days)
  const yyyy = base.getFullYear()
  const mm = String(base.getMonth() + 1).padStart(2, '0')
  const dd = String(base.getDate()).padStart(2, '0')
  form.nextdate = `${yyyy}-${mm}-${dd}`
}

const saveAddRow = async () => {
  if (!addForm.value.name) {
    alert('請輸入服務名稱')
    return
  }
  const duplicates = findDuplicateSubscriptions(addForm.value)
  if (!confirmDuplicateSubscription(duplicates)) return

  const result = await addSubscriptionInline(addForm.value)
  if (result.success) {
    showAddRow.value = false
    // 新列會排進第一頁頂端：回到第一頁後把該筆捲回視窗頂端
    currentPage.value = 1
    if (result.item?.id) revealSubscriptionRow(result.item.id)
  } else {
    alert('新增失敗: ' + result.error)
  }
}

/** 關閉 inline 編輯表單（儲存或取消）後，把該筆訂閱列捲回視窗頂端。
 *  等兩幀讓 Vue 完成列縮回、排序重算與瀏覽器新佈局後再捲動。 */
const revealSubscriptionRow = (subscriptionId) => {
  if (!process.client) return
  const selector = `[data-subscription-id="${String(subscriptionId).replace(/"/g, '\\"')}"]`
  const anchor = document.querySelector(selector)
  if (!anchor) return
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const current = document.querySelector(selector)
        if (current && typeof current.scrollIntoView === 'function') {
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          current.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
        }
      })
    })
  })
}

const startInlineEdit = (sub) => {
  editingRowId.value = sub.id
  editForm.value = {
    name: sub.name || '',
    site: sub.site || '',
    account: sub.account || '',
    nextdate: sub.nextdate || '',
    price: sub.price || null,
    currency: sub.currency || 'TWD',
    note: sub.note || '',
    iscontinue: sub.iscontinue !== false
  }
}

const cancelInlineEdit = () => {
  const id = editingRowId.value
  editingRowId.value = null
  if (id) revealSubscriptionRow(id)
}

const saveInlineEdit = async (id) => {
  const duplicates = findDuplicateSubscriptions(editForm.value, id)
  if (!confirmDuplicateSubscription(duplicates)) return

  const result = await updateSubscriptionInline(id, editForm.value)
  if (result.success) {
    editingRowId.value = null
    revealSubscriptionRow(id)
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 安全確認 Modal
const copySubscription = (sub) => {
  editingRowId.value = null
  showAddRow.value = true
  addForm.value = {
    name: `${sub.name || ''} 複製`.trim(),
    site: sub.site || '',
    account: sub.account || '',
    nextdate: sub.nextdate || '',
    price: sub.price || null,
    currency: sub.currency || 'TWD',
    note: sub.note || '',
    iscontinue: sub.iscontinue !== false
  }
}

const showConfirmModal = ref(false)
const confirmInput = ref('')
const CONFIRM_TEXT = 'DELETE subscription'

const isAllSelected = computed(() => {
  return filteredSubscriptions.value.length > 0 && 
         selectedIds.value.length === filteredSubscriptions.value.length
})

const isConfirmValid = computed(() => {
  return confirmInput.value === CONFIRM_TEXT
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredSubscriptions.value.map(sub => sub.id)
  }
}

const openConfirmModal = () => {
  if (selectedIds.value.length === 0) return
  confirmInput.value = ''
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  confirmInput.value = ''
}

const confirmBatchDelete = async () => {
  if (!isConfirmValid.value) return
  
  const deletedRecords = subscriptions.value.filter((item) => selectedIds.value.includes(item.id))
  const result = await batchDeleteSubscriptions(selectedIds.value)
  if (result.success) {
    saveSubscriptionsToTrash(deletedRecords)
    selectedIds.value = []
    batchMode.value = false
    closeConfirmModal()
    alert(`成功刪除 ${result.count} 個訂閱！`)
  } else {
    alert('批量刪除失敗: ' + result.error)
  }
}

const CURRENCIES = [
  { code: 'TWD', label: '新台幣', rate: 1 },
  { code: 'USD', label: '美元', rate: 35 },
  { code: 'EUR', label: '歐元', rate: 40 },
  { code: 'JPY', label: '日圓', rate: 0.35 },
  { code: 'CNY', label: '人民幣', rate: 4.5 },
  { code: 'HKD', label: '港幣', rate: 4 }
]

const getFaviconUrl = (site) => {
  try {
    const domain = new URL(site).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

const getCurrencySymbol = (code) => {
  const map = { TWD: 'NT$', USD: 'US$', EUR: '€', JPY: '¥', CNY: '¥', HKD: 'HK$' }
  return map[code] || 'NT$'
}

const toTWD = (price, currency) => {
  if (!price) return 0
  const cur = CURRENCIES.find(c => c.code === currency)
  if (!cur) return Number(price)
  return Math.round(Number(price) * cur.rate)
}

const totalMonthlyCostTWD = computed(() => {
  return subscriptions.value.reduce((total, sub) => {
    return total + toTWD(sub.price, sub.currency)
  }, 0)
})

const subscriptionRenewStats = computed(() => {
  return subscriptions.value.reduce((stats, sub) => {
    if (sub.iscontinue === false) {
      stats.notRenew += 1
    } else {
      stats.renew += 1
    }
    return stats
  }, { renew: 0, notRenew: 0 })
})

const availableYears = computed(() => {
  const years = subscriptions.value
    .map(sub => sub.nextdate ? new Date(sub.nextdate) : null)
    .filter(date => date && !Number.isNaN(date.getTime()))
    .map(date => date.getFullYear())

  return [...new Set(years)].sort((a, b) => a - b)
})

const filteredSubscriptions = computed(() => {
  let list = sortedSubscriptions.value

  if (selectedYear.value || selectedMonth.value) {
    list = list.filter(sub => {
      if (selectedMonth.value === EMPTY_MONTH_FILTER) {
        if (!sub.nextdate) return true
        const invalidDate = new Date(sub.nextdate)
        return Number.isNaN(invalidDate.getTime())
      }

      if (!sub.nextdate) return false

      const date = new Date(sub.nextdate)
      if (Number.isNaN(date.getTime())) return false

      const matchesYear = !selectedYear.value || date.getFullYear() === Number(selectedYear.value)
      const matchesMonth =
        !selectedMonth.value ||
        (selectedMonth.value !== EMPTY_MONTH_FILTER && date.getMonth() + 1 === Number(selectedMonth.value))

      return matchesYear && matchesMonth
    })
  }

  // 續訂篩選
  if (renewFilter.value === 'renew') {
    list = list.filter(s => s.iscontinue !== false)
  } else if (renewFilter.value === 'notRenew') {
    list = list.filter(s => s.iscontinue === false)
  } else if (renewFilter.value === 'within7Days') {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const maxDate = new Date(todayStart)
    maxDate.setDate(maxDate.getDate() + 7)

    list = list.filter((sub) => {
      if (!sub.nextdate) return false
      const targetDate = new Date(sub.nextdate)
      if (Number.isNaN(targetDate.getTime())) return false

      const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
      return targetStart >= todayStart && targetStart <= maxDate
    })
  }

  // 關鍵字搜尋
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.account || '').toLowerCase().includes(q) ||
      (s.site || '').toLowerCase().includes(q) ||
      (s.note || '').toLowerCase().includes(q)
    )
  }
  return [...list].sort((a, b) => {
    if (sortBy.value === 'price') return toTWD(b.price, b.currency) - toTWD(a.price, a.currency)
    if (sortBy.value === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant')
    return new Date(a.nextdate || '9999-12-31') - new Date(b.nextdate || '9999-12-31')
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSubscriptions.value.length / pageSize)))
const paginatedSubscriptions = computed(() => filteredSubscriptions.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch([searchQuery, selectedYear, selectedMonth, renewFilter, sortBy], () => { currentPage.value = 1 })
watch(totalPages, (value) => { if (currentPage.value > value) currentPage.value = value })

const maskAccount = (value) => {
  const text = String(value || '').trim()
  if (!text) return '-'
  const at = text.indexOf('@')
  if (at > 0) return `${text.slice(0, Math.min(2, at))}***${text.slice(at)}`
  if (text.length <= 4) return `${text.slice(0, 1)}***`
  return `${text.slice(0, 2)}***${text.slice(-2)}`
}

const { accounts: commonAccounts, loadAccounts: loadCommonAccounts } = useCommonAccounts()

// 帳號名稱選項（從鈢兄常用讀取）
const accountNames = computed(() => {
  return commonAccounts.value
    .map(a => a.name)
    .filter(Boolean)
    .sort()
})

onMounted(() => {
  loadSubscriptionTrash()
  loadSubscriptions()
  loadCommonAccounts()
})

// 格式化日期為 ISO 8601 (Appwrite 格式)
const formatDateToISO = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toISOString()
}

const exportSubscriptionsCsv = () => {
  // Appwrite 格式：使用 'continue' 欄位名 和 ISO 8601 日期
  const header = ['name', 'site', 'price', 'nextdate', 'note', 'account', 'currency', 'continue']
  const rows = sortedSubscriptions.value.map(sub => [
    sub.name || '',
    sub.site || '',
    sub.price ?? '',
    formatDateToISO(sub.nextdate),
    sub.note || '',
    sub.account || '',
    sub.currency || 'TWD',
    sub.iscontinue !== false ? 'true' : 'false'
  ])
  const bom = '\uFEFF'
  const csvContent = bom + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'supabase-subscription.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const csvFileInput = ref(null)

const parseCsv = (text) => {
  const parseRow = (line) => {
    const cells = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) { cells.push(current.trim()); current = '' }
      else current += char
    }
    cells.push(current.trim())
    return cells
  }
  const splitIntoRows = (text) => {
    const rows = []
    let current = ''
    let inQuotes = false
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '"') { inQuotes = !inQuotes; current += char }
      else if (char === '\n' && !inQuotes) { if (current.trim()) rows.push(current); current = '' }
      else current += char
    }
    if (current.trim()) rows.push(current)
    return rows
  }
  const lines = splitIntoRows(text)
  if (lines.length < 2) return []
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const cells = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
}

const handleImportCsv = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) { alert('CSV 檔案無有效資料'); return }
  const isAppwrite = isAppwriteFormat(rows)
  let confirmMsg = `確定匯入 ${rows.length} 筆訂閱資料？`
  if (isAppwrite) {
    confirmMsg = `偵測到 ISO 8601 日期格式\n系統將自動轉換日期格式\n\n確定匯入 ${rows.length} 筆訂閱資料？`
  }
  if (!confirm(confirmMsg)) return
  const result = await importSubscriptions(rows)
  if (result.success) {
    alert(result.message ? `${result.message}，新增 ${result.count} 筆訂閱` : `成功匯入 ${result.count} 筆訂閱！`)
  } else {
    alert('匯入失敗: ' + result.error)
  }
  e.target.value = ''
}

defineExpose({ subscriptions, totalMonthlyCost })
</script>


<style scoped>
.subscription-management {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-area {
  flex: 1 1 320px;
  min-width: 260px;
}

.search-input {
  width: 100%;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.date-filters {
  display: flex;
  gap: 0.5rem;
}

.date-filter-select {
  min-width: 120px;
  padding: 0.75rem 0.9rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.date-filter-select:focus {
  outline: none;
  border-color: var(--primary);
}

.filter-buttons {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-muted);
  border-radius: var(--radius-md);
  padding: 0.25rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.filter-btn:hover {
  background: color-mix(in oklab, var(--bg-surface) 60%, transparent);
}

.filter-btn.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: var(--elevation-1);
}

.filter-btn.filter-on.active {
  background: var(--success-solid);
  color: var(--on-solid);
}

.filter-btn.filter-off.active {
  background: var(--neutral-solid);
  color: var(--on-solid);
}

.filter-btn.filter-soon.active {
  background: var(--warning-solid);
  color: var(--on-solid);
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-export,
.btn-import {
  padding: 0.75rem 1.5rem;
  background: var(--primary-solid);
  color: var(--on-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-export:hover,
.btn-import:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-import {
  display: inline-block;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--success-light);
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.summary-left,
.summary-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.select-all-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.selected-count {
  background: var(--primary-solid);
  color: var(--on-primary);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-lg);
  font-size: 0.85rem;
  font-weight: 600;
}

.renew-stat {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
}

.renew-stat-on {
  color: var(--success-text);
  background: color-mix(in oklab, var(--success) 13%, transparent);
  border: 1px solid color-mix(in oklab, var(--success) 35%, transparent);
}

.renew-stat-off {
  color: var(--warning-text);
  background: color-mix(in oklab, var(--warning) 16%, transparent);
  border: 1px solid color-mix(in oklab, var(--warning) 38%, transparent);
}

.btn-batch-mode {
  padding: 0.5rem 1rem;
  background: var(--primary-solid);
  color: var(--on-primary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-batch-mode:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-add-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--success-solid);
  color: var(--on-solid);
  font-size: 1.5rem;
  font-weight: 300;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  line-height: 1;
  padding-bottom: 4px;
}

.btn-add-icon:hover {
  transform: translateY(-2px) scale(1.1);
  box-shadow: var(--elevation-2);
}

.btn-cancel-batch {
  padding: 0.35rem 0.75rem;
  background: var(--bg-inset);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-xs);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel-batch:hover {
  background: var(--border-strong);
}

.btn-batch-delete {
  padding: 0.5rem 1rem;
  background: var(--danger-solid);
  color: var(--on-solid);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-trash {
  min-height: 40px;
  padding: 0 var(--spacing-md);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: var(--bg-muted);
  cursor: pointer;
  font-weight: 700;
}

.btn-trash:hover { background: var(--danger-light); color: var(--danger-text); }

.btn-batch-delete:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.total-cost {
  font-weight: 700;
  color: var(--danger-text);
  font-size: 1.05rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* Table Style */
.sub-table-container {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-1);
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
}

.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.sub-table thead {
  position: sticky;
  top: 0;
  z-index: var(--z-dropdown);
  background: var(--bg-muted);
}

.sub-table th {
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border-subtle);
  white-space: nowrap;
}

.sub-table td {
  padding: 0.875rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.sub-table tbody tr {
  transition: background-color 0.2s;
}

.sub-table tbody tr:hover {
  background-color: var(--bg-surface);
}

.sub-table tbody tr.selected {
  background-color: color-mix(in oklab, var(--primary) 10%, transparent);
}

.sub-table tbody tr.selected:hover {
  background-color: color-mix(in oklab, var(--primary) 15%, transparent);
}

.sub-table tbody tr.editing {
  background-color: color-mix(in oklab, var(--warning) 50%, transparent);
}

.sub-table tbody tr.editing:hover {
  background-color: color-mix(in oklab, var(--warning) 70%, transparent);
}

.sub-table tbody tr.add-row {
  background-color: color-mix(in oklab, var(--success) 50%, transparent);
  border-left: 3px solid var(--success);
}

.sub-table tbody tr.add-row:hover {
  background-color: color-mix(in oklab, var(--success) 70%, transparent);
}

/* Inline editing inputs */
.inline-input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s;
}

.inline-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.inline-input + .inline-input {
  margin-top: 0.35rem;
}

.inline-textarea {
  resize: vertical;
  min-height: 3.25rem;
  line-height: 1.35;
}

.duplicate-warning {
  margin-top: 0.4rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--warning);
  border-radius: var(--radius-sm);
  background: var(--warning-light);
  color: var(--warning-text);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4;
}

.inline-small {
  font-size: 0.8rem;
  padding: 0.35rem 0.5rem;
  border-width: 1px;
}

.inline-date {
  min-width: 130px;
}

.date-adjust-btns {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.3rem;
}

.btn-date-adjust {
  flex: 1;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--primary);
  border-radius: var(--radius-xs);
  background: color-mix(in oklab, var(--primary) 10%, transparent);
  color: var(--primary-text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-date-adjust:hover {
  background: var(--primary-solid);
  color: var(--on-primary);
}

.inline-price-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inline-select {
  padding: 0.5rem;
  border: 2px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  background: var(--bg-surface);
  cursor: pointer;
}

.inline-select:focus {
  outline: none;
  border-color: var(--primary);
}

.inline-price {
  width: 80px;
  text-align: right;
}

/* Save/Cancel buttons */
.btn-save-icon {
  background: var(--success-solid);
  color: var(--on-solid);
  font-weight: bold;
}

.btn-save-icon:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-cancel-icon {
  background: var(--neutral-solid);
  color: var(--on-solid);
  font-weight: bold;
}

.btn-cancel-icon:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

/* Column widths */
.col-checkbox {
  width: 40px;
  text-align: center;
}

.col-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.col-name {
  min-width: 180px;
  max-width: 250px;
}

.col-account {
  width: 120px;
  max-width: 150px;
}

.col-date {
  width: 110px;
  white-space: nowrap;
}

.col-price {
  width: 140px;
}

.col-renew {
  width: 80px;
  text-align: center;
}

.col-actions {
  width: 140px;
  text-align: center;
}

/* Cell content */
.name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.service-name {
  font-weight: 600;
  color: var(--text-primary);
}

.service-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.service-favicon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: var(--radius-xs);
}

.service-link {
  color: var(--primary-text);
  text-decoration: none;
}

.service-link:hover {
  text-decoration: underline;
}

.service-note {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: pre-line;
  word-break: break-word;
}

.account-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.date-primary {
  font-weight: 600;
}

.date-secondary {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.price-value {
  font-weight: 600;
  color: var(--danger-text);
}

.twd-converted {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}

/* Icon action buttons */
.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin: 0 0.25rem;
}

.btn-edit-icon {
  background: var(--primary-solid);
  color: var(--on-primary);
}

.btn-edit-icon:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-copy-icon {
  background: var(--success-solid);
  color: var(--on-solid);
  font-weight: 700;
}

.btn-copy-icon:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-delete-icon {
  background: var(--danger-solid);
  color: var(--on-solid);
  font-size: 1rem;
  font-weight: bold;
}

.btn-delete-icon:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

/* Responsive */
@media (max-width: 768px) {
  .actions-bar {
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    align-items: stretch;
  }

  .search-input {
    min-width: 0;
    width: 100%;
    padding: 0.8rem 0.9rem;
    font-size: 0.95rem;
  }

  .search-area {
    flex-basis: 100%;
    min-width: 0;
  }

  .filter-buttons,
  .csv-actions {
    width: 100%;
  }

  .filter-buttons {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
    padding: 0;
    background: transparent;
  }

  .filter-btn {
    min-height: 40px;
    padding: 0.65rem 0.5rem;
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
  }

  .csv-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .btn-export,
  .btn-import {
    width: 100%;
    padding: 0.8rem 0.95rem;
    text-align: center;
    font-size: 0.9rem;
  }

  .summary-bar {
    padding: 0.8rem 0.9rem;
    margin-bottom: 1rem;
    align-items: stretch;
    gap: 0.65rem;
  }

  .summary-left,
  .summary-right {
    width: 100%;
    flex-wrap: wrap;
    gap: 0.65rem;
    align-items: center;
  }

  .summary-right {
    justify-content: flex-start;
  }

  .btn-batch-mode,
  .btn-cancel-batch,
  .btn-batch-delete {
    min-height: 40px;
  }

  .btn-add-icon {
    width: 40px;
    height: 40px;
    font-size: 1.35rem;
  }

  .selected-count,
  .renew-stat,
  .total-cost {
    font-size: 0.82rem;
  }

  .sub-table-container {
    font-size: 0.85rem;
  }
  
  .sub-table th,
  .sub-table td {
    padding: 0.625rem 0.5rem;
  }
  
  .col-name {
    min-width: 150px;
  }
  
  .col-account {
    display: none;
  }
  
  .service-site,
  .service-note {
    display: none;
  }
}

@media (max-width: 480px) {
  .filter-buttons,
  .csv-actions {
    grid-template-columns: 1fr;
  }

  .summary-left,
  .summary-right {
    gap: 0.55rem;
  }

  .btn-batch-mode,
  .btn-cancel-batch,
  .btn-batch-delete {
    width: 100%;
    justify-content: center;
  }

  .select-all-label {
    width: 100%;
  }
}

.renew-toggle {
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  transition: all 0.3s;
  min-width: 60px;
}

.renew-toggle.active {
  background: var(--success-solid);
  color: var(--on-solid);
}

.renew-toggle:not(.active) {
  background: var(--bg-inset);
  color: var(--text-muted);
}

.renew-toggle:hover {
  transform: scale(1.05);
}

.date-normal { color: var(--success-text); }
.date-soon { color: var(--warning-text); font-weight: bold; }
.date-overdue { color: var(--danger-text); font-weight: bold; }

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: color-mix(in oklab, var(--overlay-scrim) 50%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  padding: 2rem;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--elevation-3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  background: var(--success-solid);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--text-muted);
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.btn-close:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-group input {
  padding: 0.75rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group-renew {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.currency-select {
  padding: 0.75rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
  background: var(--bg-surface);
}

.currency-select:focus {
  outline: none;
  border-color: var(--primary);
}

.twd-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.875rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-cancel {
  background: var(--bg-inset);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--border-strong);
}

.btn-submit {
  background: var(--success-solid);
  color: var(--on-solid);
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 安全確認 Modal */
.confirm-modal {
  max-width: 450px;
}

.modal-header.danger h2 {
  background: var(--danger-solid);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.confirm-body {
  padding: 1rem 0;
}

.confirm-warning {
  font-size: 1.1rem;
  color: var(--danger-text);
  margin-bottom: 1rem;
  text-align: center;
}

.confirm-warning strong {
  font-size: 1.5rem;
  color: var(--danger-text);
}

.confirm-hint {
  color: var(--text-secondary);
  margin-bottom: 1rem;
  line-height: 1.6;
}

.confirm-hint code {
  background: var(--bg-surface);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-xs);
  font-family: 'Courier New', monospace;
  color: var(--danger-text);
  font-weight: 600;
}

.confirm-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  text-align: center;
  letter-spacing: 1px;
  transition: all 0.3s;
}

.confirm-input:focus {
  outline: none;
  border-color: var(--danger);
}

.confirm-input.match {
  border-color: var(--success);
  background: color-mix(in oklab, var(--success) 5%, transparent);
}

.confirm-error {
  color: var(--danger-text);
  font-size: 0.9rem;
  margin-top: 0.75rem;
  text-align: center;
}

.btn-danger {
  background: var(--danger-solid);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.subscription-skeleton, .load-error { display: flex; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-lg); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-surface); }
.subscription-skeleton span, .load-error span { color: var(--text-secondary); font-size: var(--text-sm); }
.subscription-skeleton i { height: 44px; border-radius: var(--radius-sm); background: linear-gradient(90deg, var(--bg-muted), var(--bg-inset), var(--bg-muted)); background-size: 200% 100%; animation: skeleton-shift 1.4s ease-in-out infinite; }
@keyframes skeleton-shift { to { background-position: -200% 0; } }
.load-error { flex-direction: row; align-items: center; justify-content: space-between; background: var(--danger-light); }
.load-error div { display: flex; flex-direction: column; gap: var(--spacing-2xs); }
.load-error button, .pagination button { min-height: 40px; padding: 0 var(--spacing-md); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--text-primary); background: var(--bg-elevated); cursor: pointer; font-weight: 700; }
.pagination { display: flex; align-items: center; justify-content: center; gap: var(--spacing-md); padding: var(--spacing-lg); color: var(--text-secondary); }
.pagination button:disabled { cursor: not-allowed; opacity: .45; }
.detail-backdrop { position: fixed; inset: 0; z-index: var(--z-modal-backdrop); display: flex; justify-content: flex-end; background: color-mix(in oklab, var(--surface-strong) 45%, transparent); }
.detail-drawer { width: min(100%, 440px); height: 100%; display: flex; flex-direction: column; gap: var(--spacing-xl); padding: var(--spacing-xl); overflow-y: auto; color: var(--text-primary); background: var(--bg-elevated); box-shadow: var(--elevation-3); }
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-md); }
.detail-header span { color: var(--text-muted); font-size: var(--text-sm); }
.detail-header h2 { margin: var(--spacing-2xs) 0 0; }
.detail-header button { width: 44px; height: 44px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-primary); background: var(--bg-muted); cursor: pointer; font-size: var(--text-xl); }
.detail-drawer dl { display: flex; flex-direction: column; gap: var(--spacing-md); }
.detail-drawer dl div { display: grid; grid-template-columns: 7rem 1fr; gap: var(--spacing-md); padding-bottom: var(--spacing-md); border-bottom: 1px solid var(--border-subtle); }
.detail-drawer dt { color: var(--text-muted); }
.detail-drawer dd { margin: 0; overflow-wrap: anywhere; }
.detail-note { grid-template-columns: 1fr !important; }
.detail-actions { margin-top: auto; display: flex; gap: var(--spacing-sm); }
.detail-actions button { flex: 1; min-height: 44px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--text-primary); background: var(--bg-muted); cursor: pointer; font-weight: 700; }
.detail-actions .danger { color: var(--danger-text); background: var(--danger-light); }
.service-note { max-width: 52ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 768px) {
  .sub-table, .sub-table tbody, .sub-table tr, .sub-table td { display: block; width: 100%; }
  .sub-table thead { position: static; display: none; }
  .sub-table tbody { display: grid; gap: var(--spacing-sm); padding: var(--spacing-sm); }
  .sub-table tbody tr { padding: var(--spacing-md); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-surface); }
  .sub-table td { min-width: 0 !important; padding: var(--spacing-xs) 0; border: 0; }
  .sub-table .col-actions { display: flex; justify-content: flex-end; gap: var(--spacing-xs); padding-top: var(--spacing-sm); border-top: 1px solid var(--border-subtle); }
  .service-note { max-width: 100%; }
  .pagination { flex-wrap: wrap; }
}
</style>
