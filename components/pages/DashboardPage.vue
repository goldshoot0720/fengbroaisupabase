<template>
  <PageContainer>
    <h1 class="dashboard-title">鋒兄儀表板</h1>
    
    <!-- 儀表板概覽 -->
    <div class="dashboard-overview">
      <!-- 統計卡片 -->
      <div class="dashboard-stats">
        <StatCard
          title="訂閱數量"
          :value="subscriptionsCount"
          label="項目"
          icon="💳"
          trend-icon="📈"
          variant="primary"
        >
          <template #alert v-if="alertStats.subscriptions.total > 0">
            <AlertBadge v-if="alertStats.subscriptions.critical > 0" variant="critical" size="sm">
              {{ alertStats.subscriptions.critical }} 項 3天內到期
            </AlertBadge>
            <AlertBadge v-if="alertStats.subscriptions.warning > 0" variant="warning" size="sm">
              {{ alertStats.subscriptions.warning }} 項 7天內到期
            </AlertBadge>
          </template>
        </StatCard>
        
        <StatCard
          title="食物庫存"
          :value="foodsCount"
          label="項目"
          icon="🛒"
          trend-icon="📊"
          variant="success"
        >
          <template #alert v-if="alertStats.foods.total > 0">
            <AlertBadge v-if="alertStats.foods.critical > 0" variant="critical" size="sm">
              {{ alertStats.foods.critical }} 項 7天內到期
            </AlertBadge>
            <AlertBadge v-if="alertStats.foods.warning > 0" variant="warning" size="sm">
              {{ alertStats.foods.warning }} 項 30天內到期
            </AlertBadge>
          </template>
        </StatCard>
        
        <StatCard
          title="每月費用"
          :value="totalMonthlyCost"
          label="訂閱總計"
          icon="💰"
          trend-icon="🧮"
          variant="warning"
          prefix="NT$ "
        />

        <StatCard
          title="File Storage"
          :value="storageUsageDisplay"
          :label="storageUsageLabel"
          icon="💾"
          trend-icon="📦"
          :variant="storageUsageVariant"
        >
          <template #alert>
            <AlertBadge v-if="storageUsageError" variant="critical" size="sm">
              {{ storageUsageError }}
            </AlertBadge>
            <AlertBadge v-else variant="warning" size="sm">
              {{ storageUsagePercent }}%
            </AlertBadge>
          </template>
        </StatCard>
      </div>

      <!-- 11 個資料表統計 -->
      <BaseCard class="table-stats-section">
        <div class="table-stats-header">
          <div class="table-stats-title">
            <span class="title-icon">🗄️</span>
            <h3>資料表統計</h3>
          </div>
          <div class="table-stats-total">共 {{ totalRecords }} 筆資料</div>
        </div>
        <div class="table-stats-grid">
          <div
            v-for="t in tableStats"
            :key="t.name"
            class="table-stat-card"
            @click="$emit('navigate', t.page)"
          >
            <span class="table-stat-icon">{{ t.icon }}</span>
            <div class="table-stat-info">
              <span class="table-stat-count">{{ t.count }}</span>
              <span class="table-stat-label">{{ t.label }}</span>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- 快速操作 -->
      <BaseCard class="dashboard-actions">
        <div class="actions-header">
          <div class="actions-title">
            <span class="title-icon">🚀</span>
            <h3>快速操作</h3>
          </div>
          <div class="actions-subtitle">快速新增項目到您的管理系統</div>
        </div>
        
        <div class="action-buttons">
          <div class="action-card">
            <BaseButton variant="primary" icon="➕" full-width @click="$emit('navigate', 'subscription')">
              新增訂閱
            </BaseButton>
            <p class="action-description">管理您的訂閱服務</p>
          </div>
          
          <div class="action-card">
            <BaseButton variant="success" icon="➕" full-width @click="$emit('navigate', 'food')">
              新增食品(或商品)
            </BaseButton>
            <p class="action-description">追蹤食物庫存狀態</p>
          </div>
          
          <div class="action-card">
            <BaseButton variant="secondary" icon="🎥" full-width @click="$emit('navigate', 'video')" class="purple-btn">
              影片庫
            </BaseButton>
            <p class="action-description">管理影片資源</p>
          </div>
          
          <div class="action-card">
            <BaseButton variant="danger" icon="🖼️" full-width @click="$emit('navigate', 'gallery')" class="pink-btn">
              圖片庫
            </BaseButton>
            <p class="action-description">瀏覽圖片收藏</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- 到期提醒區域 -->
    <BaseCard v-if="alertStats.subscriptions.total > 0 || alertStats.foods.total > 0" class="alerts-section">
      <h2 class="alerts-title">⚠️ 到期提醒</h2>
      
      <!-- 訂閱到期提醒 -->
      <div v-if="alertStats.subscriptions.total > 0" class="alert-category">
        <h3>💳 訂閱服務到期</h3>
        
        <div v-if="subscriptionAlerts.critical.length > 0" class="alert-group critical">
          <h4>🚨 緊急 (3天內)</h4>
          <div class="alert-items">
            <div v-for="item in subscriptionAlerts.critical" :key="item.id" class="alert-item critical">
              <div class="alert-icon">💳</div>
              <div class="alert-content">
                <div class="alert-name">{{ item.name }}</div>
                <div class="alert-time">{{ formatDaysRemaining(item.daysRemaining) }}</div>
              </div>
              <AlertBadge variant="critical">{{ item.daysRemaining }}天</AlertBadge>
            </div>
          </div>
        </div>
        
        <div v-if="subscriptionAlerts.warning.length > 0" class="alert-group warning">
          <h4>⚠️ 注意 (7天內)</h4>
          <div class="alert-items">
            <div v-for="item in subscriptionAlerts.warning" :key="item.id" class="alert-item warning">
              <div class="alert-icon">💳</div>
              <div class="alert-content">
                <div class="alert-name">{{ item.name }}</div>
                <div class="alert-time">{{ formatDaysRemaining(item.daysRemaining) }}</div>
              </div>
              <AlertBadge variant="warning">{{ item.daysRemaining }}天</AlertBadge>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 食品到期提醒 -->
      <div v-if="alertStats.foods.total > 0" class="alert-category">
        <h3>🛒 食品到期</h3>
        
        <div v-if="foodAlerts.critical.length > 0" class="alert-group critical">
          <h4>🚨 緊急 (7天內)</h4>
          <div class="alert-items">
            <div v-for="item in foodAlerts.critical" :key="item.id" class="alert-item critical">
              <div class="alert-icon">🛒</div>
              <div class="alert-content">
                <div class="alert-name">{{ item.name }}</div>
                <div class="alert-time">{{ formatDaysRemaining(item.daysRemaining) }}</div>
                <div v-if="item.amount" class="alert-amount">數量: {{ item.amount }}</div>
              </div>
              <AlertBadge variant="critical">{{ item.daysRemaining }}天</AlertBadge>
            </div>
          </div>
        </div>
        
        <div v-if="foodAlerts.warning.length > 0" class="alert-group warning">
          <h4>⚠️ 注意 (30天內)</h4>
          <div class="alert-items">
            <div v-for="item in foodAlerts.warning" :key="item.id" class="alert-item warning">
              <div class="alert-icon">🛒</div>
              <div class="alert-content">
                <div class="alert-name">{{ item.name }}</div>
                <div class="alert-time">{{ formatDaysRemaining(item.daysRemaining) }}</div>
                <div v-if="item.amount" class="alert-amount">數量: {{ item.amount }}</div>
              </div>
              <AlertBadge variant="warning">{{ item.daysRemaining }}天</AlertBadge>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- 額外內容區域 -->
    <div class="additional-content">
      <BaseCard title="系統資訊" icon="🔧">
        <div class="info-grid">
          <div class="info-item">
            <h4>🔧 系統狀態</h4>
            <p>所有服務正常運行</p>
          </div>
          <div class="info-item">
            <h4>📈 使用統計</h4>
            <p>本月活躍用戶增長 15%</p>
          </div>
          <div class="info-item">
            <h4>🔒 安全狀態</h4>
            <p>系統安全，無異常活動</p>
          </div>
          <div class="info-item">
            <h4>💾 存儲使用</h4>
            <p>{{ storageUsageInfo }}</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard title="最近活動" icon="📋">
        <div class="activity-list">
          <div class="activity-item">
            <span class="activity-icon">📝</span>
            <div class="activity-content">
              <p class="activity-title">新增訂閱項目</p>
              <p class="activity-time">2 小時前</p>
            </div>
          </div>
          <div class="activity-item">
            <span class="activity-icon">🛒</span>
            <div class="activity-content">
              <p class="activity-title">更新食物庫存</p>
              <p class="activity-time">4 小時前</p>
            </div>
          </div>
          <div class="activity-item">
            <span class="activity-icon">🎥</span>
            <div class="activity-content">
              <p class="activity-title">上傳新影片</p>
              <p class="activity-time">1 天前</p>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useDashboard } from '../../composables/useDashboard'
import { useArticles } from '../../composables/useArticles'
import { useBanks } from '../../composables/useBanks'
import { useCommonAccounts } from '../../composables/useCommonAccounts'
import { useDocuments } from '../../composables/useDocuments'
import { useFoods } from '../../composables/useFoods'
import { useImages } from '../../composables/useImages'
import { useMusicRecords } from '../../composables/useMusicRecords'
import { usePodcasts } from '../../composables/usePodcasts'
import { useRoutines } from '../../composables/useRoutines'
import { useStorageUsage } from '../../composables/useStorageUsage'
import { useSubscriptions } from '../../composables/useSubscriptions'
import { useVideoRecords } from '../../composables/useVideoRecords'
import PageContainer from '../layout/PageContainer.vue'
import BaseCard from '../ui/BaseCard.vue'
import BaseButton from '../ui/BaseButton.vue'
import StatCard from '../ui/StatCard.vue'
import AlertBadge from '../ui/AlertBadge.vue'

defineProps({
  subscriptionsCount: { type: Number, default: 0 },
  foodsCount: { type: Number, default: 0 },
  totalMonthlyCost: { type: Number, default: 0 }
})

defineEmits(['navigate'])

const {
  subscriptionAlerts,
  foodAlerts,
  alertStats,
  formatDaysRemaining
} = useDashboard()

// 所有資料表
const { articles, loadArticles } = useArticles()
const { banks, loadBanks, bankAccountCount, electronicTicketCount } = useBanks()
const { accounts, loadAccounts } = useCommonAccounts()
const { documents, loadDocuments } = useDocuments()
const { foods, loadFoods } = useFoods()
const { images, loadImages } = useImages()
const { musics, loadMusics } = useMusicRecords()
const { podcasts, loadPodcasts } = usePodcasts()
const { routines, loadRoutines } = useRoutines()
const { subscriptions, loadSubscriptions } = useSubscriptions()
const { videos, loadVideos } = useVideoRecords()
const {
  loading: storageUsageLoading,
  error: storageUsageError,
  bucket: storageUsageBucket,
  displayLabel: storageUsageDisplay,
  usagePercent: storageUsagePercent,
  fileCount: storageUsageFileCount,
  refreshStorageUsage
} = useStorageUsage()

const tableStats = computed(() => [
  { name: 'subscription', label: '訂閱管理', icon: '💳', count: subscriptions.value.length, page: 'subscription' },
  { name: 'food', label: '食物庫存', icon: '🍔', count: foods.value.length, page: 'food' },
  { name: 'article', label: '文章管理', icon: '📰', count: articles.value.length, page: 'note' },
  { name: 'bank', label: '銀行帳戶', icon: '🏦', count: bankAccountCount.value, page: 'bank' },
  { name: 'electronic-ticket', label: '電子票證', icon: '💳', count: electronicTicketCount.value, page: 'bank' },
  { name: 'commonaccount', label: '常用帳號', icon: '🔑', count: accounts.value.length, page: 'common' },
  { name: 'commondocument', label: '通用文件', icon: '📄', count: documents.value.length, page: 'document' },
  { name: 'image', label: '圖片管理', icon: '🖼️', count: images.value.length, page: 'gallery' },
  { name: 'music', label: '音樂管理', icon: '🎵', count: musics.value.length, page: 'music' },
  { name: 'podcast', label: '播客管理', icon: '🎧', count: podcasts.value.length, page: 'podcast' },
  { name: 'routine', label: '例行事項', icon: '🔁', count: routines.value.length, page: 'routine' },
  { name: 'video', label: '影片管理', icon: '🎬', count: videos.value.length, page: 'video' }
])

const totalRecords = computed(() => tableStats.value.reduce((sum, t) => sum + t.count, 0))
const storageUsageVariant = computed(() => {
  if (storageUsageError.value) return 'danger'
  if (storageUsagePercent.value >= 90) return 'danger'
  if (storageUsagePercent.value >= 70) return 'warning'
  return 'success'
})
const storageUsageLabel = computed(() => {
  if (storageUsageLoading.value) return '掃描中'
  if (storageUsageError.value) return '讀取失敗'
  return `1 GB file storage，${storageUsageFileCount.value} 個檔案`
})
const storageUsageInfo = computed(() => {
  if (storageUsageLoading.value) return '正在掃描 file storage 實際容量...'
  if (storageUsageError.value) return storageUsageError.value
  return `${storageUsageBucket.value}: ${storageUsageDisplay.value}，已使用 ${storageUsagePercent.value}%`
})

onMounted(() => {
  loadArticles()
  loadBanks()
  loadAccounts()
  loadDocuments()
  loadFoods()
  loadImages()
  loadMusics()
  loadPodcasts()
  loadRoutines()
  loadSubscriptions()
  loadVideos()
  refreshStorageUsage()
})
</script>

<style scoped>
.dashboard-title {
  color: var(--text-primary);
  margin-bottom: 2rem;
  font-size: 1.8rem;
  font-weight: 800;
}

/* 版權資訊 */
.copyright-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2.5rem;
  border-radius: 20px;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.copyright-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
  z-index: 2;
}

.copyright-icon {
  font-size: 3rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.copyright-text-wrapper { flex: 1; text-align: left; }
.company-brand { margin-bottom: 1rem; }

.company-name {
  margin: 0 0 0.25rem 0;
  font-size: 2.5rem;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 12px rgba(255, 255, 255, 0.5);
  letter-spacing: 1.5px;
}

.company-tagline {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.copyright-text { margin: 0; font-size: 1rem; line-height: 1.8; }
.copyright-main { font-weight: 600; font-size: 1.05rem; color: rgba(255, 255, 255, 0.95); }
.tech-stack { font-size: 0.85rem; opacity: 0.85; color: rgba(255, 255, 255, 0.8); }

.copyright-decoration {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
}

.decoration-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: pulse 2s ease-in-out infinite;
}

.decoration-circle:nth-child(2) { animation-delay: 0.5s; }
.decoration-circle:nth-child(3) { animation-delay: 1s; }

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

/* 儀表板概覽 */
.dashboard-overview {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* 資料表統計 */
.table-stats-section {
  padding: 2rem;
}

.table-stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.table-stats-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-stats-title h3 {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.table-stats-total {
  font-size: 0.95rem;
  color: var(--text-secondary);
  font-weight: 600;
  background: var(--bg-tertiary);
  padding: 0.4rem 1rem;
  border-radius: 20px;
}

.table-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.table-stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s ease;
}

.table-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px var(--shadow);
  border-color: var(--primary);
}

.table-stat-icon {
  font-size: 1.5rem;
}

.table-stat-info {
  display: flex;
  flex-direction: column;
}

.table-stat-count {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.table-stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 快速操作 */
.dashboard-actions {
  padding: 2rem;
}

.actions-header {
  margin-bottom: 2rem;
  text-align: center;
}

.actions-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.title-icon { font-size: 1.5rem; color: var(--primary); }

.actions-title h3 {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.actions-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.action-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px var(--shadow);
}

.action-description {
  margin: 1rem 0 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* 自定義按鈕顏色 */
.purple-btn { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important; }
.pink-btn { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%) !important; }

/* 到期提醒 */
.alerts-section { margin-top: 2rem; }
.alerts-title {
  color: var(--text-primary);
  margin-bottom: 2rem;
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;
}

.alert-category { margin-bottom: 2rem; }
.alert-category:last-child { margin-bottom: 0; }

.alert-category h3 {
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.alert-group {
  margin-bottom: 1.5rem;
  border-radius: 12px;
  overflow: hidden;
}

.alert-group.critical { border: 2px solid var(--danger); background: var(--danger-light); }
.alert-group.warning { border: 2px solid var(--warning); background: var(--warning-light); }

.alert-group h4 {
  margin: 0;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
}

.alert-group.critical h4 { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
.alert-group.warning h4 { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }

.alert-items { padding: 0; }

.alert-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.alert-item:last-child { border-bottom: none; }
.alert-item:hover { background: var(--bg-tertiary); transform: translateX(4px); }

.alert-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-item.critical .alert-icon { background: var(--danger-light); }
.alert-item.warning .alert-icon { background: var(--warning-light); }

.alert-content { flex: 1; min-width: 0; }
.alert-name { font-weight: 600; color: var(--text-primary); font-size: 1rem; margin-bottom: 0.25rem; }
.alert-time { color: var(--text-secondary); font-size: 0.9rem; }
.alert-amount { color: var(--text-muted); font-size: 0.8rem; }

/* 額外內容 */
.additional-content {
  margin-top: 3rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.info-item:hover { transform: translateY(-2px); box-shadow: 0 4px 15px var(--shadow); }
.info-item h4 { color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1rem; }
.info-item p { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }

.activity-list { display: flex; flex-direction: column; }

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.3s ease;
}

.activity-item:last-child { border-bottom: none; }
.activity-item:hover { background: var(--bg-tertiary); }
.activity-icon { font-size: 1.5rem; }
.activity-content { flex: 1; }
.activity-title { color: var(--text-primary); font-weight: 600; margin: 0 0 0.25rem 0; font-size: 0.95rem; }
.activity-time { color: var(--text-secondary); font-size: 0.85rem; margin: 0; }

/* 響應式 */
@media (max-width: 768px) {
  .copyright-content { flex-direction: column; text-align: center; gap: 1rem; }
  .copyright-text-wrapper { text-align: center; }
  .copyright-info { padding: 2rem 1.5rem; }
  .company-name { font-size: 1.6rem; }
  .dashboard-stats { grid-template-columns: 1fr; }
  .table-stats-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem; }
  .table-stats-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .action-buttons { grid-template-columns: repeat(2, 1fr); }
  .info-grid { grid-template-columns: 1fr; }
  .additional-content { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .copyright-info { padding: 1.5rem 1rem; }
  .company-name { font-size: 1.4rem; }
  .action-buttons { grid-template-columns: 1fr; }
  .dashboard-actions { padding: 1.5rem; }
}
</style>
