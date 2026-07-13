<template>
  <div class="food-management">
    <div class="user-info">
      <h3>食品庫存管理系統</h3>
      <p>管理你的食品庫存、保存期限和購買記錄</p>
    </div>

    <!-- 新增食品 -->
    <div class="add-food">
      <h3>新增食品</h3>
      <div class="food-form">
        <div class="form-row">
          <div class="form-group">
            <label for="food-name">食品名稱</label>
            <input 
              type="text" 
              id="food-name" 
              v-model="newFood.name" 
              placeholder="例如：牛奶、麵包"
              required
            >
          </div>
          <div class="form-group">
            <label for="food-amount">數量</label>
            <input 
              type="number" 
              id="food-amount" 
              v-model="newFood.amount" 
              placeholder="1"
              min="1"
            >
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="food-price">價格 (NT$)</label>
            <input 
              type="number" 
              id="food-price" 
              v-model="newFood.price" 
              placeholder="100"
              min="0"
            >
          </div>
          <div class="form-group">
            <label for="food-shop">購買商店</label>
            <input 
              type="text" 
              id="food-shop" 
              v-model="newFood.shop" 
              placeholder="例如：全聯、家樂福"
            >
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="food-todate">到期日期</label>
            <input 
              type="date" 
              id="food-todate" 
              v-model="newFood.todate"
              min="2025-01-01"
              max="2125-12-31"
            >
          </div>
          <div class="form-group">
            <label for="food-photo">照片網址</label>
            <input 
              type="url" 
              id="food-photo" 
              v-model="newFood.photo" 
              placeholder="https://example.com/photo.jpg"
            >
          </div>
        </div>
        <div class="form-actions">
          <button 
            @click="editingFood ? updateFood() : addFood()"
            class="auth-btn primary"
            :disabled="foodLoading || !newFood.name"
          >
            {{ editingFood ? '更新食品' : '新增食品' }}
          </button>
          <button 
            @click="resetFoodForm"
            class="auth-btn secondary"
            type="button"
          >
            {{ editingFood ? '取消編輯' : '清除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 食品列表 -->
    <div class="food-list">
      <div class="list-header">
        <h3>食品庫存</h3>
        <div class="summary">
          <span class="total-count">共 {{ foods.length }} 項食品</span>
          <span class="expiry-warning" v-if="expiringFoods.length > 0">
            {{ expiringFoods.length }} 項即將過期
          </span>
        </div>
      </div>
      
      <div v-if="foods.length === 0" class="no-foods">
        <p>還沒有任何食品記錄</p>
        <p>點擊上方表單新增你的第一項食品！</p>
      </div>
      
      <div v-else class="foods-grid">
        <div 
          v-for="food in sortedFoods" 
          :key="food.id"
          class="food-card"
          :class="getFoodStatusClass(food.todate)"
        >
          <div class="card-header">
            <h4>{{ food.name }}</h4>
            <div class="card-actions">
              <button 
                @click="editFood(food)"
                class="action-btn edit"
                title="編輯"
              >
                ✏️
              </button>
              <button 
                @click="deleteFood(food.id)"
                class="action-btn delete"
                title="刪除"
              >
                🗑️
              </button>
            </div>
          </div>
          
          <div class="card-content">
            <!-- 主要資訊區域：圖片與關鍵資訊水平對齊 -->
            <div class="main-info-row">
              <div class="photo-section" v-if="food.photo">
                <img :src="food.photo" :alt="food.name" class="food-photo" />
              </div>
              <div class="key-info-section">
                <div class="key-info-item" v-if="food.amount">
                  <span class="label">數量：</span>
                  <span>{{ food.amount }}</span>
                </div>
                <div class="key-info-item" v-if="food.todate">
                  <span class="label">到期：</span>
                  <span :class="getExpiryClass(food.todate)">
                    {{ formatDate(food.todate) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 其他資訊 -->
            <div class="other-info">
              <div class="info-row" v-if="food.price">
                <span class="label">價格：</span>
                <span class="price">NT$ {{ food.price }}</span>
              </div>
              <div class="info-row" v-if="food.shop">
                <span class="label">購買商店：</span>
                <span>{{ food.shop }}</span>
              </div>
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
const emit = defineEmits(['foods-updated'])

// 食品管理相關
const foodLoading = ref(false)
const foods = ref([])
const editingFood = ref(null)

// 新增食品表單
const newFood = ref({
  name: '',
  amount: null,
  price: null,
  shop: '',
  todate: '',
  photo: '',
  photohash: ''
})

// 即將到期的食品（7天內）
const expiringFoods = computed(() => {
  const today = new Date()
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  return foods.value.filter(food => {
    if (!food.todate) return false
    const toDate = new Date(food.todate)
    return toDate <= sevenDaysLater && toDate >= today
  })
})

// 按到期日排序的食品列表（即將到期的在上面）
const sortedFoods = computed(() => {
  return [...foods.value].sort((a, b) => {
    // 處理沒有到期日的情況，放到最後
    if (!a.todate && !b.todate) return 0
    if (!a.todate) return 1
    if (!b.todate) return -1
    
    // 比較到期日，近的在前
    const dateA = new Date(a.todate)
    const dateB = new Date(b.todate)
    return dateA - dateB
  })
})

// 食品管理方法 - 使用 Supabase
const loadFoodData = async () => {
  if (!props.supabase) return
  
  try {
    const { data, error } = await props.supabase
      .from('food')
      .select('*')
    
    if (error) throw error
    
    foods.value = data || []
    emit('foods-updated', foods.value)
  } catch (error) {
    console.error('載入食品資料錯誤:', error.message)
  }
}

const addFood = async () => {
  if (!props.supabase) return
  
  // 驗證日期格式
  if (newFood.value.todate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(newFood.value.todate)) {
      alert('請輸入正確的日期格式 (YYYY-MM-DD)')
      return
    }
  }
  
  try {
    foodLoading.value = true
    
    const { data, error } = await props.supabase
      .from('food')
      .insert({
        name: newFood.value.name,
        amount: newFood.value.amount || null,
        price: newFood.value.price || null,
        shop: newFood.value.shop || null,
        todate: newFood.value.todate || null,
        photo: newFood.value.photo || null,
        photohash: newFood.value.photohash || null
      })
      .select()
      .single()
    
    if (error) throw error
    
    foods.value.unshift(data)
    emit('foods-updated', foods.value)
    resetFoodForm()
    alert('食品新增成功！')
  } catch (error) {
    console.error('新增食品錯誤:', error.message)
    alert('新增食品失敗: ' + error.message)
  } finally {
    foodLoading.value = false
  }
}

const editFood = (food) => {
  editingFood.value = food
  newFood.value = {
    name: food.name,
    amount: food.amount,
    price: food.price,
    shop: food.shop || '',
    todate: food.todate || '',
    photo: food.photo || '',
    photohash: food.photohash || ''
  }
  
  // 滾動到表單
  if (process.client) {
    document.querySelector('.add-food')?.scrollIntoView({ behavior: 'smooth' })
  }
}

const updateFood = async () => {
  if (!editingFood.value || !props.supabase) return
  
  // 驗證日期格式
  if (newFood.value.todate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(newFood.value.todate)) {
      alert('請輸入正確的日期格式 (YYYY-MM-DD)')
      return
    }
  }
  
  try {
    foodLoading.value = true
    
    const { data, error } = await props.supabase
      .from('food')
      .update({
        name: newFood.value.name,
        amount: newFood.value.amount || null,
        price: newFood.value.price || null,
        shop: newFood.value.shop || null,
        todate: newFood.value.todate || null,
        photo: newFood.value.photo || null,
        photohash: newFood.value.photohash || null
      })
      .eq('id', editingFood.value.id)
      .select()
      .single()
    
    if (error) throw error
    
    // 更新本地資料
    const index = foods.value.findIndex(f => f.id === editingFood.value.id)
    if (index !== -1) {
      foods.value[index] = data
    }
    
    emit('foods-updated', foods.value)
    resetFoodForm()
    alert('食品更新成功！')
  } catch (error) {
    console.error('更新食品錯誤:', error.message)
    alert('更新食品失敗: ' + error.message)
  } finally {
    foodLoading.value = false
  }
}

const deleteFood = async (id) => {
  if (!props.supabase) return
  
  if (!confirm('確定要刪除這項食品嗎？')) return
  
  try {
    foodLoading.value = true
    
    const { error } = await props.supabase
      .from('food')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    foods.value = foods.value.filter(f => f.id !== id)
    emit('foods-updated', foods.value)
    alert('食品已刪除')
  } catch (error) {
    console.error('刪除食品錯誤:', error.message)
    alert('刪除食品失敗: ' + error.message)
  } finally {
    foodLoading.value = false
  }
}

const resetFoodForm = () => {
  newFood.value = {
    name: '',
    amount: null,
    price: null,
    shop: '',
    todate: '',
    photo: '',
    photohash: ''
  }
  editingFood.value = null
}

// 食品輔助方法
const getFoodStatusClass = (todate) => {
  if (!todate) return ''
  
  const today = new Date()
  const expiry = new Date(todate)
  const diffTime = expiry - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'food-expired'
  if (diffDays <= 3) return 'food-critical'
  if (diffDays <= 7) return 'food-warning'
  return 'food-normal'
}

const getExpiryClass = (todate) => {
  if (!todate) return ''
  
  const today = new Date()
  const expiry = new Date(todate)
  const diffTime = expiry - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'date-overdue'
  if (diffDays <= 3) return 'date-critical'
  if (diffDays <= 7) return 'date-soon'
  return 'date-normal'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 暴露方法給父組件
defineExpose({
  loadFoodData,
  foods: computed(() => foods.value),
  expiringFoods
})

// 組件掛載時載入資料
onMounted(() => {
  loadFoodData()
})
</script>

<style scoped>
/* 食品管理樣式 */
.food-management {
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

.add-food {
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.food-form {
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

.food-list {
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

.expiry-warning {
  color: #e74c3c;
  font-weight: bold;
}

.no-foods {
  text-align: center;
  color: #7f8c8d;
  padding: 3rem;
}

.foods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.food-card {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}

.food-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.food-card.food-expired {
  border-color: #e74c3c;
  background: #fdf2f2;
}

.food-card.food-critical {
  border-color: #f39c12;
  background: #fef9e7;
}

.food-card.food-warning {
  border-color: #f1c40f;
  background: #fffbf0;
}

.food-card.food-normal {
  border-color: #27ae60;
  background: #f8fff9;
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

/* 食品卡片主要資訊區域佈局 */
.main-info-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.photo-section {
  flex-shrink: 0;
}

.food-photo {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.key-info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.key-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.other-info {
  border-top: 1px solid #e1e8ed;
  padding-top: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
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

.date-normal {
  color: #27ae60;
}

.date-soon {
  color: #f39c12;
  font-weight: bold;
}

.date-critical {
  color: #e74c3c;
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
  
  .foods-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .main-info-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .key-info-section {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .key-info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }
}

@media (max-width: 480px) {
  .main-info-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .key-info-section {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .key-info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }
}
</style>