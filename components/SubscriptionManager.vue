<template>
  <div class="subscription-management">
    <div class="user-info">
      <h3>訂閱管理系統</h3>
      <p>管理你的所有訂閱服務</p>
    </div>

    <!-- 新增訂閱 -->
    <div class="add-subscription">
      <h3>新增訂閱服務</h3>
      <div class="subscription-form">
        <div class="form-row">
          <div class="form-group">
            <label for="sub-name">服務名稱</label>
            <input 
              type="text" 
              id="sub-name" 
              v-model="newSubscription.name" 
              placeholder="例如：Netflix, Spotify"
              required
            >
          </div>
          <div class="form-group">
            <label for="sub-site">官方網站</label>
            <input 
              type="url" 
              id="sub-site" 
              v-model="newSubscription.site" 
              placeholder="https://example.com"
            >
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="sub-account">帳號/Email</label>
            <input 
              type="text" 
              id="sub-account" 
              v-model="newSubscription.account" 
              placeholder="your@email.com"
            >
          </div>
          <div class="form-group">
            <label for="sub-price">月費 (NT$)</label>
            <input 
              type="number" 
              id="sub-price" 
              v-model="newSubscription.price" 
              placeholder="299"
              min="0"
            >
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="sub-nextdate">下次扣款日期</label>
            <input 
              type="date" 
              id="sub-nextdate" 
              v-model="newSubscription.nextdate"
              min="2025-01-01"
              max="2125-12-31"
              pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
              required
            >
          </div>
          <div class="form-group">
            <label for="sub-note">備註</label>
            <input 
              type="text" 
              id="sub-note" 
              v-model="newSubscription.note" 
              placeholder="家庭方案、學生優惠等"
            >
          </div>
        </div>
        <div class="form-actions">
          <button 
            @click="editingSubscription ? updateSubscription() : addSubscription()"
            class="auth-btn primary"
            :disabled="subscriptionLoading || !newSubscription.name"
          >
            {{ editingSubscription ? '更新訂閱' : '新增訂閱' }}
          </button>
          <button 
            @click="resetForm"
            class="auth-btn secondary"
            type="button"
          >
            {{ editingSubscription ? '取消編輯' : '清除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 訂閱列表 -->
    <div class="subscription-list">
      <div class="list-header">
        <h3>我的訂閱服務</h3>
        <div class="summary">
          <span class="total-count">共 {{ subscriptions.length }} 個服務</span>
          <span class="total-cost">總費用：NT$ {{ totalMonthlyCost }}</span>
        </div>
      </div>
      
      <div v-if="subscriptions.length === 0" class="no-subscriptions">
        <p>還沒有任何訂閱服務</p>
        <p>點擊上方表單新增你的第一個訂閱！</p>
      </div>
      
      <div v-else class="subscriptions-grid">
        <div 
          v-for="subscription in sortedSubscriptions" 
          :key="subscription.id"
          class="subscription-card"
        >
          <div class="card-header">
            <h4>{{ subscription.name }}</h4>
            <div class="card-actions">
              <button 
                @click="editSubscription(subscription)"
                class="action-btn edit"
                title="編輯"
              >
                ✏️
              </button>
              <button 
                @click="deleteSubscription(subscription.id)"
                class="action-btn delete"
                title="刪除"
              >
                🗑️
              </button>
            </div>
          </div>
          
          <div class="card-content">
            <div class="info-row" v-if="subscription.site">
              <span class="label">網站：</span>
              <a :href="subscription.site" target="_blank" class="link">
                {{ subscription.site }}
              </a>
            </div>
            <div class="info-row" v-if="subscription.account">
              <span class="label">帳號：</span>
              <span>{{ subscription.account }}</span>
            </div>
            <div class="info-row">
              <span class="label">月費：</span>
              <span class="price">NT$ {{ subscription.price || 0 }}</span>
            </div>
            <div class="info-row">
              <span class="label">下次扣款：</span>
              <span :class="getDateClass(subscription.nextdate)">
                {{ formatDate(subscription.nextdate) }}
              </span>
            </div>
            <div class="info-row" v-if="subscription.note">
              <span class="label">備註：</span>
              <span>{{ subscription.note }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Props
const props = defineProps({
  supabase: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['subscriptions-updated'])

// 訂閱相關
const subscriptionLoading = ref(false)
const subscriptions = ref([])
const editingSubscription = ref(null)

// 新增訂閱表單
const newSubscription = ref({
  name: '',
  site: '',
  account: '',
  price: null,
  nextdate: '',
  note: ''
})

// 計算總月費
const totalMonthlyCost = computed(() => {
  return subscriptions.value.reduce((total, sub) => total + (sub.price || 0), 0)
})

// 按日期排序的訂閱列表（日期近的在上面）
const sortedSubscriptions = computed(() => {
  return [...subscriptions.value].sort((a, b) => {
    // 處理沒有日期的情況，放到最後
    if (!a.nextdate && !b.nextdate) return 0
    if (!a.nextdate) return 1
    if (!b.nextdate) return -1
    
    // 比較日期，近的在前
    const dateA = new Date(a.nextdate)
    const dateB = new Date(b.nextdate)
    return dateA - dateB
  })
})

// 訂閱管理方法 - 使用 Supabase (無認證)
const loadSubscriptionData = async () => {
  if (!props.supabase) return
  
  try {
    const { data, error } = await props.supabase
      .from('subscription')
      .select('*')
    
    if (error) throw error
    
    subscriptions.value = data || []
    emit('subscriptions-updated', subscriptions.value)
  } catch (error) {
    console.error('載入訂閱資料錯誤:', error.message)
  }
}

const addSubscription = async () => {
  if (!props.supabase) return
  
  // 驗證日期格式
  if (newSubscription.value.nextdate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(newSubscription.value.nextdate)) {
      alert('請輸入正確的日期格式 (YYYY-MM-DD)')
      return
    }
  }
  
  try {
    subscriptionLoading.value = true
    
    const { data, error } = await props.supabase
      .from('subscription')
      .insert({
        name: newSubscription.value.name,
        site: newSubscription.value.site || null,
        account: newSubscription.value.account || null,
        price: newSubscription.value.price || null,
        nextdate: newSubscription.value.nextdate || null,
        note: newSubscription.value.note || null
      })
      .select()
      .single()
    
    if (error) throw error
    
    subscriptions.value.unshift(data)
    emit('subscriptions-updated', subscriptions.value)
    resetForm()
    alert('訂閱服務新增成功！')
  } catch (error) {
    console.error('新增訂閱錯誤:', error.message)
    alert('新增訂閱失敗: ' + error.message)
  } finally {
    subscriptionLoading.value = false
  }
}

const editSubscription = (subscription) => {
  editingSubscription.value = subscription
  newSubscription.value = {
    name: subscription.name,
    site: subscription.site || '',
    account: subscription.account || '',
    price: subscription.price,
    nextdate: subscription.nextdate || '',
    note: subscription.note || ''
  }
  
  // 滾動到表單
  if (process.client) {
    document.querySelector('.add-subscription')?.scrollIntoView({ behavior: 'smooth' })
  }
}

const updateSubscription = async () => {
  if (!editingSubscription.value || !props.supabase) return
  
  // 驗證日期格式
  if (newSubscription.value.nextdate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(newSubscription.value.nextdate)) {
      alert('請輸入正確的日期格式 (YYYY-MM-DD)')
      return
    }
  }
  
  try {
    subscriptionLoading.value = true
    
    const { data, error } = await props.supabase
      .from('subscription')
      .update({
        name: newSubscription.value.name,
        site: newSubscription.value.site || null,
        account: newSubscription.value.account || null,
        price: newSubscription.value.price || null,
        nextdate: newSubscription.value.nextdate || null,
        note: newSubscription.value.note || null
      })
      .eq('id', editingSubscription.value.id)
      .select()
      .single()
    
    if (error) throw error
    
    // 更新本地資料
    const index = subscriptions.value.findIndex(s => s.id === editingSubscription.value.id)
    if (index !== -1) {
      subscriptions.value[index] = data
    }
    
    emit('subscriptions-updated', subscriptions.value)
    resetForm()
    alert('訂閱服務更新成功！')
  } catch (error) {
    console.error('更新訂閱錯誤:', error.message)
    alert('更新訂閱失敗: ' + error.message)
  } finally {
    subscriptionLoading.value = false
  }
}

const deleteSubscription = async (id) => {
  if (!props.supabase) return
  
  if (!confirm('確定要刪除這個訂閱服務嗎？')) return
  
  try {
    subscriptionLoading.value = true
    
    const { error } = await props.supabase
      .from('subscription')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    subscriptions.value = subscriptions.value.filter(s => s.id !== id)
    emit('subscriptions-updated', subscriptions.value)
    alert('訂閱服務已刪除')
  } catch (error) {
    console.error('刪除訂閱錯誤:', error.message)
    alert('刪除訂閱失敗: ' + error.message)
  } finally {
    subscriptionLoading.value = false
  }
}

const resetForm = () => {
  newSubscription.value = {
    name: '',
    site: '',
    account: '',
    price: null,
    nextdate: '',
    note: ''
  }
  editingSubscription.value = null
}

// 輔助方法
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getDateClass = (dateString) => {
  if (!dateString) return ''
  
  const today = new Date()
  const targetDate = new Date(dateString)
  const diffTime = targetDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'date-overdue'
  if (diffDays <= 7) return 'date-soon'
  return 'date-normal'
}

// 暴露方法給父組件
defineExpose({
  loadSubscriptionData,
  subscriptions: computed(() => subscriptions.value),
  totalMonthlyCost
})

// 組件掛載時載入資料
onMounted(() => {
  loadSubscriptionData()
})
</script>

<style scoped>
/* 訂閱管理樣式 */
.subscription-management {
  max-width: 1000px;
  margin: 0 auto;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.add-subscription {
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.subscription-form {
  margin-top: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.auth-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  text-align: center;
}

.auth-btn.primary {
  background: #3498db;
  color: white;
}

.auth-btn.primary:hover {
  background: #2980b9;
}

.auth-btn.secondary {
  background: #95a5a6;
  color: white;
}

.auth-btn.secondary:hover {
  background: #7f8c8d;
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.subscription-list {
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 2rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e1e8ed;
}

.summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.total-count {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.total-cost {
  color: #2c3e50;
  font-weight: bold;
  font-size: 1.1rem;
}

.no-subscriptions {
  text-align: center;
  color: #7f8c8d;
  padding: 3rem;
}

.subscriptions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.subscription-card {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}

.subscription-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e1e8ed;
}

.card-header h4 {
  margin: 0;
  color: #2c3e50;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background: #e1e8ed;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: bold;
  color: #7f8c8d;
  min-width: 80px;
}

.price {
  color: #e74c3c;
  font-weight: bold;
}

.link {
  color: #3498db;
  text-decoration: none;
  word-break: break-all;
}

.link:hover {
  text-decoration: underline;
}

.date-normal {
  color: #27ae60;
}

.date-soon {
  color: #f39c12;
  font-weight: bold;
}

.date-overdue {
  color: #e74c3c;
  font-weight: bold;
}

/* 響應式調整 */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .summary {
    align-items: flex-start;
  }
  
  .subscriptions-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .label {
    min-width: auto;
  }
}
</style>