<template>
  <PageContainer>
    <div class="shopping-page">
      <p class="page-lead">
        記錄想買的商品、預定購買日、預算與取貨方式。有設定預定購買日的項目，到期前 3 天開始提醒、當天仍會通知（提醒以完整儀表與每日本機通知為主）。可用 CSV 匯出備份或批次匯入。
      </p>

      <div class="actions-bar">
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋名稱、商店、取貨方式、帳號或備註"
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <select v-model="statusFilter" class="filter-select" aria-label="篩選購買狀態">
          <option value="all">全部狀態</option>
          <option value="upcoming">3 天內要買</option>
          <option value="today">今天要買</option>
          <option value="due">已過購買日</option>
          <option value="nodate">未設定日期</option>
        </select>
        <div class="csv-actions">
          <button type="button" class="btn-export" :disabled="busy" title="匯出目前全部購物清單為 CSV" @click="exportToCsv">匯出 CSV</button>
          <label class="btn-import" title="從 CSV 匯入購物清單（相同購物名稱會更新）">
            匯入 CSV
            <input ref="csvFileInput" type="file" accept=".csv,text/csv" style="display:none" @change="handleCsvFileSelect" />
          </label>
          <button type="button" class="btn-primary" :disabled="busy || shoppingLoading" @click="openCreateForm">新增商品</button>
        </div>
      </div>

      <div class="summary-bar" aria-label="購物清單摘要">
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
        <span>全部項目 {{ shoppingItems.length }}</span>
        <span>待買（3 天內）{{ upcomingCount }}</span>
        <span>今天要買 {{ todayCount }}</span>
        <span>已過購買日 {{ overdueCount }}</span>
      </div>

      <form v-if="formOpen" id="shopping-form" class="record-form" @submit.prevent="handleSubmit">
        <h2>{{ editingId ? '編輯購物項目' : '新增購物項目' }}</h2>
        <p class="form-hint">價格支援台幣／美元／日圓／人民幣；未設定預定購買日就不參與到期提醒。</p>
        <fieldset :disabled="busy" class="form-grid">
          <label class="field">
            <span>購物名稱 <em>*</em></span>
            <input
              id="shopping-name"
              v-model="form.name"
              type="text"
              maxlength="100"
              list="shopping-names"
              placeholder="例如 洗碗機、米 10kg"
              required
            />
            <datalist id="shopping-names">
              <option v-for="name in itemNames" :key="name" :value="name" />
            </datalist>
          </label>
          <label class="field">
            <span>預定購買日</span>
            <input id="shopping-date" v-model="form.plannedDate" type="date" />
          </label>
          <label class="field">
            <span>預定價格</span>
            <input id="shopping-price" v-model.number="form.price" type="number" min="0" step="1" inputmode="numeric" />
          </label>
          <label class="field">
            <span>幣別</span>
            <select id="shopping-currency" v-model="form.currency">
              <option v-for="option in SHOPPING_CURRENCY_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="field">
            <span>預定數量</span>
            <input id="shopping-quantity" v-model.number="form.quantity" type="number" min="1" step="1" inputmode="numeric" />
          </label>
          <label class="field">
            <span>預定商店</span>
            <input
              id="shopping-shop"
              v-model="form.shop"
              type="text"
              maxlength="100"
              list="shopping-shops"
              placeholder="例如 PChome、家樂福"
            />
            <datalist id="shopping-shops">
              <option v-for="name in shopNames" :key="name" :value="name" />
            </datalist>
          </label>
          <label class="field">
            <span>預定購買／取貨方式</span>
            <select
              id="shopping-pickup"
              :value="pickupSelectValue"
              @change="handlePickupSelectChange($event.target.value)"
            >
              <option value="">未設定</option>
              <option v-for="method in SHOPPING_PICKUP_METHOD_PRESETS" :key="method" :value="method">{{ method }}</option>
              <option v-for="method in pickupMethods" :key="`existing-${method}`" :value="method">{{ method }}</option>
              <option :value="PICKUP_METHOD_CUSTOM">自行輸入…</option>
            </select>
            <input
              v-if="pickupSelectValue === PICKUP_METHOD_CUSTOM"
              id="shopping-pickup-custom"
              v-model="form.pickupMethod"
              class="pickup-custom-input"
              type="text"
              maxlength="30"
              placeholder="輸入其他取貨方式"
            />
          </label>
          <label class="field field-wide">
            <span>商品圖片</span>
            <span class="image-field-row">
              <input
                id="shopping-image"
                v-model="form.imageUrl"
                class="image-url-input"
                type="url"
                maxlength="2000"
                placeholder="貼上圖片網址，或按右側「上傳圖片」"
                @input="imageFile = null"
              />
              <input
                ref="imageFileInput"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                style="display:none"
                @change="handleImageFileSelect"
              />
              <button
                type="button"
                class="btn-ghost"
                :disabled="busy"
                @click="imageFileInput?.click()"
              >{{ imageFile ? '已選取圖片' : '上傳圖片' }}</button>
              <button
                v-if="imageFile || imagePreviewUrl || form.imageUrl"
                type="button"
                class="btn-ghost danger"
                :disabled="busy"
                @click="form.imageUrl = ''; resetImageState()"
              >移除圖片</button>
            </span>
            <span v-if="imagePreviewUrl || form.imageUrl" class="image-preview">
              <img
                :src="imagePreviewUrl || form.imageUrl"
                alt="商品圖片預覽"
                class="image-preview-img"
              />
              <span class="image-preview-meta">
                {{ imageFile ? imageFile.name : (form.imageUrl || '') }}
                <span v-if="imageUploading">上傳中…</span>
                <span v-else>儲存後圖片會跟著這筆購物項目保存。</span>
              </span>
            </span>
          </label>
          <label class="field">
            <span>帳號</span>
            <input id="shopping-account" v-model="form.account" type="text" maxlength="200" placeholder="Email、使用者名稱或辨識名稱" />
          </label>
          <label class="field field-wide">
            <span>備註</span>
            <textarea id="shopping-note" v-model="form.note" maxlength="3337" rows="3" placeholder="規格、比價連結等"></textarea>
          </label>
        </fieldset>
        <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>
        <div class="form-actions">
          <button type="button" class="btn-ghost" :disabled="saving" @click="closeForm">取消</button>
          <button type="submit" class="btn-primary" :disabled="busy">{{ saving ? '儲存中…' : editingId ? '儲存變更' : '新增商品' }}</button>
        </div>
      </form>

      <div v-if="importPreview" class="import-preview" role="dialog" aria-labelledby="shopping-import-title">
        <h2 id="shopping-import-title">匯入 CSV 預覽</h2>
        <p v-if="importPreview.errors.length">發現 {{ importPreview.errors.length }} 筆格式錯誤，不會寫入任何資料。</p>
        <p v-else>將匯入 {{ importPreview.data.length }} 筆；相同購物名稱會更新，其餘新增。</p>
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

      <div v-if="shoppingError" class="load-error" role="alert">
        <p><strong>無法載入購物清單</strong></p>
        <p>{{ shoppingError }}</p>
        <button v-if="shoppingError.includes('shoppinglist')" type="button" class="btn-ghost" @click="setCurrentPage('settings')">前往鋒兄設定</button>
      </div>
      <p v-else-if="!formOpen && actionError" class="action-error" role="alert">{{ actionError }}</p>

      <div v-if="shoppingLoading && shoppingItems.length === 0" class="loading">載入購物清單…</div>
      <EmptyState
        v-else-if="!shoppingError && filteredItems.length === 0"
        icon="🛒"
        :title="shoppingItems.length === 0 ? '尚無購物項目' : '沒有符合條件的項目'"
        :description="shoppingItems.length === 0 ? '先新增第一個想買的商品與預定購買日。' : '調整搜尋文字或狀態篩選後再試一次。'"
      >
        <template v-if="shoppingItems.length === 0" #action>
          <button type="button" class="btn-primary" @click="openCreateForm">新增第一筆</button>
        </template>
      </EmptyState>

      <div v-else class="shopping-table-wrap">
        <table class="shopping-table">
          <thead>
            <tr>
              <th v-if="isSelectionMode" class="col-check"></th>
              <th>購物名稱</th>
              <th>預定購買日</th>
              <th>預定價格</th>
              <th>數量</th>
              <th>商店／取貨</th>
              <th>帳號</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td v-if="isSelectionMode" class="col-check">
                <input type="checkbox" :checked="selectedIds.has(item.id)" @change="toggleSelect(item.id)" :aria-label="`選取 ${item.name}`">
              </td>
              <td data-label="購物名稱">
                <span class="name-cell">
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    alt=""
                    loading="lazy"
                    class="item-thumb"
                  />
                  <span class="name-cell-copy">
                    <strong>{{ item.name }}</strong>
                    <span v-if="item.note?.trim()" class="note">{{ item.note }}</span>
                  </span>
                </span>
              </td>
              <td data-label="預定購買日">
                <p class="date-value">{{ formatShoppingDate(item.plannedDate) }}</p>
                <Badge
                  v-if="item.plannedDate"
                  :variant="plannedBadge(item)"
                  size="sm"
                >{{ plannedLabel(item) }}</Badge>
                <span v-else class="muted">未設定</span>
              </td>
              <td data-label="預定價格">
                <p class="price-value">{{ formatShoppingFee(item.price, item.currency || 'TWD') }}</p>
                <p v-if="Number(item.price || 0) > 0 && Number(item.quantity || 1) > 1" class="note">
                  小計 {{ formatShoppingFee((Number(item.price) || 0) * (Number(item.quantity) || 1), item.currency || 'TWD') }}
                </p>
              </td>
              <td data-label="數量"><span class="quantity-value">× {{ item.quantity || 1 }}</span></td>
              <td data-label="商店／取貨">
                <p v-if="item.shop?.trim()" class="shop-value">{{ item.shop }}</p>
                <span v-else class="muted">未填商店</span>
                <p v-if="item.pickupMethod?.trim()" class="note">{{ item.pickupMethod }}</p>
              </td>
              <td data-label="帳號">
                <span class="muted">{{ item.account?.trim() || '—' }}</span>
              </td>
              <td data-label="操作" class="row-actions">
                <button type="button" class="btn-icon" :disabled="busy" @click="openEditForm(item)">編輯</button>
                <button type="button" class="btn-icon copy" :disabled="busy" title="複製此項目（預先填好欄位，供你確認後新增）" @click="openCopyForm(item)">複製</button>
                <button type="button" class="btn-icon danger" :disabled="busy" @click="requestDelete(item)">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
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
import { computed, onMounted, ref } from 'vue'
import { useShoppingList } from '../../composables/useShoppingList'
import { useNavigation } from '../../composables/useNavigation'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import { useSelectionSet } from '../../composables/useSelectionSet'
import BulkSelectionControls from '../ui/BulkSelectionControls.vue'
import { useStorage } from '../../composables/useStorage'
import {
  SHOPPING_CURRENCY_OPTIONS,
  SHOPPING_PICKUP_METHOD_PRESETS,
  emptyShoppingItemForm,
  formatShoppingDate,
  formatShoppingFee,
  shoppingExpiryInfo,
  toShoppingItemForm,
} from '../../utils/managementRecords'
import { buildShoppingCsv, parseShoppingCsv } from '../../utils/shoppingCsv'

const PICKUP_METHOD_CUSTOM = '__custom__'
const { uploadFile: uploadShoppingImage } = useStorage()

const {
  shoppingItems,
  shoppingLoading,
  shoppingError,
  itemNames,
  shopNames,
  pickupMethods,
  loadShoppingItems,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  importShoppingItems,
} = useShoppingList()
const { setCurrentPage } = useNavigation()

const searchQuery = ref('')
const statusFilter = ref('all')
const { recentSearches, applyRecentSearch, removeRecentSearch, clearRecentSearches, commitSearchHistory } =
  useRecentSearchHistory('feng-shopping-searches', searchQuery)

const formOpen = ref(false)
const editingId = ref(null)
const form = ref(emptyShoppingItemForm())
const saving = ref(false)
const actionError = ref('')
const pendingDelete = ref(null)
const csvFileInput = ref(null)
const importPreview = ref(null)
const importResult = ref(null)
const importing = ref(false)
const importProgress = ref({ current: 0, total: 0 })
let importCloseTimer = null

// 商品圖片（本機檔案上傳或網址）
const imageFileInput = ref(null)
const imageFile = ref(null)
const imagePreviewUrl = ref('')
const imageUploading = ref(false)

const busy = computed(() => saving.value || importing.value || imageUploading.value)

// 取貨方式下拉：值不在預設清單且非空時，切到「自行輸入」。
const pickupSelectValue = computed(() => {
  const value = form.value.pickupMethod || ''
  if (value && !SHOPPING_PICKUP_METHOD_PRESETS.includes(value)) return PICKUP_METHOD_CUSTOM
  return value
})

const resetImageState = () => {
  imageFile.value = null
  imageUploading.value = false
  if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }
  imagePreviewUrl.value = ''
}

const handlePickupSelectChange = (value) => {
  if (value === PICKUP_METHOD_CUSTOM) {
    form.value.pickupMethod = ''
    return
  }
  form.value.pickupMethod = value
}

const handleImageFileSelect = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    actionError.value = `圖片大小超過限制：${Math.round(file.size / 1024 / 1024)}MB > 50MB`
    return
  }
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    actionError.value = '只支援 JPG、PNG、GIF、WEBP 圖片格式'
    return
  }
  if (imagePreviewUrl.value && imagePreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }
  imageFile.value = file
  imagePreviewUrl.value = URL.createObjectURL(file)
  form.value.imageUrl = ''
  actionError.value = ''
}

const uploadSelectedImage = async () => {
  if (!imageFile.value) return ''
  imageUploading.value = true
  try {
    const result = await uploadShoppingImage(imageFile.value, 'shopping')
    if (!result.success || !result.url) throw new Error(result.error || '圖片上傳失敗')
    return result.url
  } finally {
    imageUploading.value = false
  }
}

const itemStatus = (item) => {
  const info = shoppingExpiryInfo(item)
  if (!info.hasDate) return 'nodate'
  if (info.isExpired) return 'due'
  if (info.isToday) return 'today'
  if (info.isUpcomingSoon) return 'upcoming'
  return 'later'
}

const filteredItems = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLocaleLowerCase('zh-Hant')
  return (shoppingItems.value || [])
    .filter((item) => {
      const matchesQuery = !normalizedQuery || [item.name, item.shop, item.pickupMethod, item.account, item.note]
        .some((value) => String(value || '').toLocaleLowerCase('zh-Hant').includes(normalizedQuery))
      if (!matchesQuery) return false
      const status = itemStatus(item)
      if (statusFilter.value === 'all') return true
      if (statusFilter.value === 'due') return status === 'due'
      if (statusFilter.value === 'today') return status === 'today'
      if (statusFilter.value === 'upcoming') return status === 'upcoming' || status === 'today'
      if (statusFilter.value === 'nodate') return status === 'nodate'
      return true
    })
    .sort((a, b) => {
      const dateA = a.plannedDate ? new Date(`${a.plannedDate}T00:00:00.000Z`).getTime() : Number.POSITIVE_INFINITY
      const dateB = b.plannedDate ? new Date(`${b.plannedDate}T00:00:00.000Z`).getTime() : Number.POSITIVE_INFINITY
      return dateA - dateB
    })
})

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

const upcomingCount = computed(() => shoppingItems.value.filter((item) => {
  const info = shoppingExpiryInfo(item)
  return info.hasDate && info.daysRemaining >= 0 && info.daysRemaining <= 3
}).length)
const todayCount = computed(() => shoppingItems.value.filter((item) => shoppingExpiryInfo(item).isToday).length)
const overdueCount = computed(() => shoppingItems.value.filter((item) => shoppingExpiryInfo(item).isExpired).length)

const deleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value) => { if (!value) pendingDelete.value = null },
})
const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''
  const name = pendingDelete.value.name || '未命名購物'
  const shop = pendingDelete.value.shop?.trim()
  return `確定刪除「${name}${shop ? `（${shop}）` : ''}」？此操作無法復原。`
})

const plannedBadge = (item) => {
  const info = shoppingExpiryInfo(item)
  if (info.isExpired) return 'danger'
  if (info.isToday || info.isUpcomingSoon) return 'warning'
  return 'default'
}
const plannedLabel = (item) => {
  const info = shoppingExpiryInfo(item)
  if (!info.hasDate) return ''
  if (info.isExpired) return `已過 ${Math.abs(info.daysRemaining)} 天`
  if (info.isToday) return '今天要買'
  if (info.daysRemaining === 1) return '明天要買'
  return `${info.daysRemaining} 天後要買`
}

onMounted(() => {
  loadShoppingItems()
})

const openCreateForm = () => {
  editingId.value = null
  form.value = emptyShoppingItemForm()
  actionError.value = ''
  resetImageState()
  formOpen.value = true
}

const openCopyForm = (item) => {
  editingId.value = null
  form.value = { ...toShoppingItemForm(item), name: `${item.name || '未命名'} (複製)` }
  actionError.value = ''
  resetImageState()
  formOpen.value = true
}

const openEditForm = (item) => {
  editingId.value = item.id
  form.value = toShoppingItemForm(item)
  actionError.value = ''
  resetImageState()
  formOpen.value = true
}

const closeForm = () => {
  formOpen.value = false
  editingId.value = null
  form.value = emptyShoppingItemForm()
  actionError.value = ''
  resetImageState()
}

const handleSubmit = async () => {
  if (busy.value) return
  saving.value = true
  actionError.value = ''
  try {
    let formToSubmit = form.value
    if (imageFile.value) {
      const uploadedUrl = await uploadSelectedImage()
      if (!uploadedUrl) {
        actionError.value = '圖片上傳失敗，請稍後再試'
        return
      }
      formToSubmit = { ...form.value, imageUrl: uploadedUrl }
    }
    const result = editingId.value
      ? await updateShoppingItem(editingId.value, formToSubmit)
      : await addShoppingItem(formToSubmit)
    if (!result.success) {
      actionError.value = result.error || '儲存失敗，請稍後再試。'
      return
    }
    closeForm()
  } finally {
    saving.value = false
  }
}

const requestDelete = (item) => {
  actionError.value = ''
  pendingDelete.value = item
}

const requestBulkDelete = async () => {
  if (!selectedCount.value) return
  if (!window.confirm(`確定刪除選取的 ${selectedCount.value} 筆購物項目？此操作無法復原。`)) return
  actionError.value = ''
  for (const item of selectedItems.value) {
    const result = await deleteShoppingItem(item.id)
    if (!result.success) actionError.value = result.error || '部分刪除失敗，請稍後再試。'
  }
  exitSelectionMode()
}

const confirmDelete = async () => {
  const item = pendingDelete.value
  if (!item) return
  const result = await deleteShoppingItem(item.id)
  if (!result.success) {
    actionError.value = result.error || '刪除失敗，請確認連線後再試一次。'
    return
  }
  if (editingId.value === item.id) closeForm()
  pendingDelete.value = null
}

const exportToCsv = () => {
  if (busy.value) return
  try {
    const csv = buildShoppingCsv(shoppingItems.value)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'supabase-shoppinglist.csv'
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
    importPreview.value = parseShoppingCsv(typeof reader.result === 'string' ? reader.result : '')
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
  const result = await importShoppingItems(importPreview.value.data)
  importProgress.value = { current: importPreview.value.data.length, total: importPreview.value.data.length }
  importResult.value = { successCount: result.successCount, failCount: result.failCount }
  importing.value = false
  if (result.failCount === 0) {
    importCloseTimer = window.setTimeout(() => {
      closeImportPreview()
    }, 1200)
  }
}
</script>

<style scoped>
.shopping-page {
  display: grid;
  gap: var(--spacing-md);
}

.page-lead,
.muted,
.note,
.form-hint {
  color: var(--text-secondary);
}

.page-lead {
  margin: 0;
  line-height: 1.7;
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

.search-input,
.filter-select,
.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-primary);
  font: inherit;
}

.search-input:focus,
.filter-select:focus,
.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: 2px solid color-mix(in oklab, var(--primary) 45%, transparent);
  outline-offset: 1px;
}

.filter-select {
  flex: 0 0 auto;
  width: auto;
  min-width: 150px;
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: auto;
}

.btn-export,
.btn-import,
.btn-primary,
.btn-ghost,
.btn-icon {
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.9rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  white-space: nowrap;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--text-inverse);
}

.btn-primary:disabled,
.btn-export:disabled,
.btn-import:disabled,
.btn-ghost:disabled,
.btn-icon:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-ghost:hover,
.btn-export:hover,
.btn-import:hover {
  background: var(--bg-inset);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-icon {
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
}

.btn-icon.danger {
  color: var(--danger);
}

.btn-icon.copy {
  color: var(--primary);
}

.btn-icon:disabled {
  opacity: 0.5;
}

.summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.record-form {
  display: grid;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  scroll-margin-top: 5rem;
}

.record-form h2 {
  margin: 0;
  font-size: 1.25rem;
}

.form-hint {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
}

.form-grid {
  border: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field > span {
  font-size: 0.85rem;
  font-weight: 600;
}

.field em {
  color: var(--danger);
  font-style: normal;
}

.field-wide {
  grid-column: 1 / -1;
}

.pickup-custom-input {
  margin-top: 0.35rem;
}

.image-field-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.image-url-input {
  flex: 1 1 260px;
  min-width: 0;
}

.image-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-muted);
}

.image-preview-img {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-inset);
}

.image-preview-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.item-thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-inset);
}

.name-cell-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.action-error,
.load-error {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--danger-light);
  color: var(--danger);
  line-height: 1.6;
}

.load-error {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.load-error p {
  margin: 0;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.import-preview {
  position: fixed;
  top: 50%;
  left: 50%;
  right: auto;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: min(560px, calc(100vw - 2rem));
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
  overflow: auto;
  z-index: var(--z-modal, 1000);
}

.import-preview h2 {
  margin: 0;
}

.import-preview p {
  margin: 0;
  line-height: 1.6;
}

.import-errors {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--danger);
  font-size: 0.9rem;
  max-height: 8rem;
  overflow: auto;
}

.shopping-table-wrap {
  overflow-x: auto;
}

.shopping-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.shopping-table th,
.shopping-table td {
  padding: 0.7rem 0.8rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--border-subtle);
}

.shopping-table thead th {
  position: sticky;
  top: 0;
  background: var(--bg-surface);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  white-space: nowrap;
}

.shopping-table td p {
  margin: 0;
}

.shopping-table td strong {
  display: inline-block;
  max-width: 320px;
  overflow-wrap: break-word;
}

.note {
  font-size: 0.82rem;
  margin-top: 0.25rem !important;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.date-value,
.price-value,
.shop-value,
.quantity-value {
  white-space: nowrap;
}

.price-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.row-actions {
  display: flex;
  gap: 0.35rem;
  align-items: flex-start;
  white-space: nowrap;
}

.security-note {
  margin: 0;
  line-height: 1.7;
  font-size: 0.85rem;
}

@media (max-width: 720px) {
  .actions-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-select {
    width: 100%;
  }

  .csv-actions {
    margin-left: 0;
    flex-wrap: wrap;
  }

  .shopping-table,
  .shopping-table tbody,
  .shopping-table tr,
  .shopping-table td {
    display: block;
    width: 100%;
  }

  .shopping-table thead {
    display: none;
  }

  .shopping-table tbody tr {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    margin-bottom: 0.75rem;
    padding: 0.5rem 0;
  }

  .shopping-table td {
    border: none;
    padding: 0.35rem 0.8rem;
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: 0.5rem;
    align-items: baseline;
  }

  .shopping-table td::before {
    content: attr(data-label);
    font-weight: 700;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .shopping-table td.row-actions {
    display: flex;
    gap: 0.4rem;
  }

  .shopping-table td.row-actions::before {
    display: none;
  }
}
</style>
