<template>
  <div class="dashboard-container">
    <h1>儀表板</h1>
    
    <!-- 儀表板總覽 -->
    <div class="dashboard-overview">
      <div class="dashboard-stats">
        <div class="stat-card">
          <h3>訂閱服務</h3>
          <div class="stat-number">{{ subscriptions.length }}</div>
          <div class="stat-label">總數</div>
        </div>
        <div class="stat-card">
          <h3>食品庫存</h3>
          <div class="stat-number">{{ foods.length }}</div>
          <div class="stat-label">總數</div>
        </div>
        <div class="stat-card">
          <h3>本月費用</h3>
          <div class="stat-number">NT$ {{ totalMonthlyCost }}</div>
          <div class="stat-label">訂閱總費用</div>
        </div>
        <div class="stat-card music">
          <h3>🎵 音樂庫</h3>
          <div class="stat-number">48</div>
          <div class="stat-label">音樂作品</div>
        </div>
      </div>

      <!-- 警告區域 -->
      <div class="dashboard-alerts">
        <h3>⚠️ 重要提醒</h3>
        
        <!-- 訂閱到期提醒 -->
        <div class="alert-section">
          <h4>📅 訂閱到期提醒</h4>
          <div class="alert-grid">
            <div class="alert-card critical" v-if="subscriptionsExpiring3Days.length > 0">
              <div class="alert-header">
                <span class="alert-icon">🚨</span>
                <span class="alert-title">3天內到期</span>
                <span class="alert-count">{{ subscriptionsExpiring3Days.length }}</span>
              </div>
              <div class="alert-items">
                <div v-for="sub in subscriptionsExpiring3Days" :key="sub.id" class="alert-item">
                  {{ sub.name }} - {{ formatDate(sub.nextdate) }}
                </div>
              </div>
            </div>
            
            <div class="alert-card warning" v-if="subscriptionsExpiring7Days.length > 0">
              <div class="alert-header">
                <span class="alert-icon">⚠️</span>
                <span class="alert-title">7天內到期</span>
                <span class="alert-count">{{ subscriptionsExpiring7Days.length }}</span>
              </div>
              <div class="alert-items">
                <div v-for="sub in subscriptionsExpiring7Days" :key="sub.id" class="alert-item">
                  {{ sub.name }} - {{ formatDate(sub.nextdate) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 食品過期提醒 -->
        <div class="alert-section">
          <h4>🍎 食品過期提醒</h4>
          <div class="alert-grid">
            <div class="alert-card critical" v-if="foodsExpiring7Days.length > 0">
              <div class="alert-header">
                <span class="alert-icon">🚨</span>
                <span class="alert-title">7天內過期</span>
                <span class="alert-count">{{ foodsExpiring7Days.length }}</span>
              </div>
              <div class="alert-items">
                <div v-for="food in foodsExpiring7Days" :key="food.id" class="alert-item">
                  {{ food.name }} - {{ formatDate(food.todate) }}
                </div>
              </div>
            </div>
            
            <div class="alert-card warning" v-if="foodsExpiring30Days.length > 0">
              <div class="alert-header">
                <span class="alert-icon">⚠️</span>
                <span class="alert-title">30天內過期</span>
                <span class="alert-count">{{ foodsExpiring30Days.length }}</span>
              </div>
              <div class="alert-items">
                <div v-for="food in foodsExpiring30Days" :key="food.id" class="alert-item">
                  {{ food.name }} - {{ formatDate(food.todate) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="dashboard-actions">
        <h3>🚀 快速操作</h3>
        <div class="action-buttons">
          <button @click="$emit('navigate', 'subscription')" class="action-btn primary">
            新增訂閱服務
          </button>
          <button @click="$emit('navigate', 'food')" class="action-btn secondary">
            新增食品記錄
          </button>
          <button @click="$emit('navigate', 'music')" class="action-btn music">
            🎵 音樂庫
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => []
  },
  foods: {
    type: Array,
    default: () => []
  }
})

defineEmits(['navigate'])

// 計算總月費
const totalMonthlyCost = computed(() => {
  return props.subscriptions.reduce((total, sub) => total + (sub.price || 0), 0)
})

// 3天內到期的訂閱
const subscriptionsExpiring3Days = computed(() => {
  const today = new Date()
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  
  return props.subscriptions.filter(sub => {
    if (!sub.nextdate) return false
    const nextDate = new Date(sub.nextdate)
    return nextDate <= threeDaysLater && nextDate >= today
  })
})

// 7天內到期的訂閱
const subscriptionsExpiring7Days = computed(() => {
  const today = new Date()
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  
  return props.subscriptions.filter(sub => {
    if (!sub.nextdate) return false
    const nextDate = new Date(sub.nextdate)
    return nextDate <= sevenDaysLater && nextDate > threeDaysLater
  })
})

// 7天內過期的食品
const foodsExpiring7Days = computed(() => {
  const today = new Date()
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  return props.foods.filter(food => {
    if (!food.todate) return false
    const toDate = new Date(food.todate)
    return toDate <= sevenDaysLater && toDate >= today
  })
})

// 30天內過期的食品（排除7天內的）
const foodsExpiring30Days = computed(() => {
  const today = new Date()
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  return props.foods.filter(food => {
    if (!food.todate) return false
    const toDate = new Date(food.todate)
    return toDate <= thirtyDaysLater && toDate > sevenDaysLater
  })
})

// 輔助方法
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.dashboard-container {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
  font-size: 2.5rem;
}

.dashboard-overview {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  text-align: center;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card.music {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-card.music h3 {
  color: white;
}

.stat-card.music .stat-number {
  color: white;
}

.stat-card.music .stat-label {
  color: rgba(255,255,255,0.9);
}

.stat-card h3 {
  color: #666;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #999;
  font-size: 0.9rem;
}

.dashboard-alerts {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 12px;
}

.dashboard-alerts h3 {
  color: #e74c3c;
  margin-bottom: 1.5rem;
}

.alert-section {
  margin-bottom: 2rem;
}

.alert-section:last-child {
  margin-bottom: 0;
}

.alert-section h4 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.alert-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  border-left: 4px solid;
}

.alert-card.critical {
  border-left-color: #e74c3c;
  background: #fdf2f2;
}

.alert-card.warning {
  border-left-color: #f39c12;
  background: #fef9e7;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.alert-icon {
  font-size: 1.2rem;
}

.alert-title {
  font-weight: bold;
  flex: 1;
}

.alert-count {
  background: #e74c3c;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.alert-card.warning .alert-count {
  background: #f39c12;
}

.alert-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-item {
  padding: 0.5rem;
  background: rgba(255,255,255,0.7);
  border-radius: 4px;
  font-size: 0.9rem;
}

.dashboard-actions {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.dashboard-actions h3 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.action-btn.primary {
  background: #3498db;
  color: white;
}

.action-btn.primary:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

.action-btn.secondary {
  background: #95a5a6;
  color: white;
}

.action-btn.secondary:hover {
  background: #7f8c8d;
  transform: translateY(-2px);
}

.action-btn.music {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.action-btn.music:hover {
  background: linear-gradient(135deg, #e082ea 0%, #e4465b 100%);
  transform: translateY(-2px);
}

/* 響應式設計 */
@media (max-width: 768px) {
  h1 {
    font-size: 2rem;
  }
  
  .dashboard-stats {
    grid-template-columns: 1fr;
  }
  
  .alert-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>