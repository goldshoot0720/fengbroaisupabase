<template>
  <header class="top-header">
    <div class="header-left">
      <button @click="$emit('toggleSidebar')" class="mobile-menu-btn">
        <span class="menu-icon">☰</span>
      </button>
      <h1>{{ title }}</h1>
      <span class="header-subtitle">{{ subtitle }}</span>
    </div>
    
    <div class="header-right">
      <!-- 帳號切換器 -->
      <div class="account-switcher" ref="switcherRef">
        <button 
          class="account-btn" 
          @click="toggleDropdown"
          :title="displayName"
        >
          <span class="account-name">{{ displayName }}</span>
          <span class="dropdown-arrow">{{ showDropdown ? '▲' : '▼' }}</span>
        </button>
        
        <div v-if="showDropdown" class="account-dropdown">
          <div class="dropdown-header">切換帳號</div>
          
          <!-- 帳號列表 -->
          <div 
            v-for="acc in accounts" 
            :key="acc.id"
            class="account-item"
            :class="{ active: acc.id === activeAccountId }"
            @click="handleSwitch(acc.id)"
          >
            <span class="account-item-icon">{{ acc.id === activeAccountId ? '✓' : '' }}</span>
            <span class="account-item-name">supabase-{{ acc.friendlyName || '.env' }}</span>
          </div>
          
          <!-- .env 選項 -->
          <div 
            class="account-item env-item"
            :class="{ active: !activeAccountId && accounts.length === 0 }"
            @click="handleUseEnv"
          >
            <span class="account-item-icon">📁</span>
            <span class="account-item-name">使用 .env 設定</span>
          </div>
          
          <div class="dropdown-divider"></div>
          
          <!-- 前往設定 -->
          <div class="account-item settings-item" @click="goToSettings">
            <span class="account-item-icon">⚙️</span>
            <span class="account-item-name">管理帳號</span>
          </div>
        </div>
      </div>

      <slot name="actions" />

      <button
        @click="$emit('toggleDarkMode')"
        class="dark-mode-toggle"
        :title="isDarkMode ? '切換到亮色模式' : '切換到暗黑模式'"
      >
        <span class="dark-mode-icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: '鋒兄管理系統' },
  subtitle: { type: String, default: '鋒兄AI' },
  isDarkMode: { type: Boolean, default: false }
})

defineEmits(['toggleSidebar', 'toggleDarkMode'])

const router = useRouter()
const { displayName, accounts, activeAccountId, switchAccount, clearSettings, loadSettings } = useSettings()

const showDropdown = ref(false)
const switcherRef = ref(null)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleSwitch = (id) => {
  switchAccount(id)
  showDropdown.value = false
  // 重新載入頁面以套用新設定
  window.location.reload()
}

const handleUseEnv = () => {
  clearSettings()
  showDropdown.value = false
  window.location.reload()
}

const goToSettings = () => {
  showDropdown.value = false
  router.push('/?page=settings')
}

// 點擊外部關閉下拉選單
const handleClickOutside = (event) => {
  if (switcherRef.value && !switcherRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  loadSettings()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.top-header {
  background: linear-gradient(135deg, var(--header-bg, #ffffff) 0%, rgba(255, 255, 255, 0.95) 100%);
  padding: 1.25rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mobile-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-menu-btn:hover {
  background: var(--bg-tertiary, #f8f9fa);
}

.menu-icon {
  font-size: 1.2rem;
}

.top-header h1 {
  color: var(--text-primary, #2c3e50);
  font-size: 2.4rem;
  font-weight: 900;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  text-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  letter-spacing: 1px;
}

.header-subtitle {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
  margin-left: 0.5rem;
  padding: 0.15rem 0.6rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.header-user {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  padding: 0.2rem 0.7rem;
  background: rgba(39, 174, 96, 0.1);
  border-radius: 6px;
  white-space: nowrap;
}

/* 帳號切換器 */
.account-switcher {
  position: relative;
}

.account-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: rgba(39, 174, 96, 0.1);
  border: 1px solid rgba(39, 174, 96, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.account-btn:hover {
  background: rgba(39, 174, 96, 0.15);
  border-color: rgba(39, 174, 96, 0.3);
}

.account-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 0.6rem;
  color: var(--text-muted, #94a3b8);
}

.account-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--bg-secondary, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  animation: dropdownFadeIn 0.15s ease;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--bg-tertiary, #f8fafc);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.account-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.account-item:hover {
  background: var(--bg-tertiary, #f8fafc);
}

.account-item.active {
  background: rgba(59, 130, 246, 0.08);
}

.account-item.active .account-item-name {
  color: var(--primary, #3b82f6);
  font-weight: 600;
}

.account-item-icon {
  width: 1.2rem;
  text-align: center;
  font-size: 0.85rem;
}

.account-item-name {
  font-size: 0.85rem;
  color: var(--text-primary, #334155);
}

.env-item {
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color, #e2e8f0);
  margin: 0.25rem 0;
}

.settings-item {
  color: var(--text-muted, #64748b);
}

.settings-item:hover {
  color: var(--primary, #3b82f6);
}

.dark-mode-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark-mode-toggle:hover {
  background: var(--bg-tertiary, #f8f9fa);
  transform: rotate(180deg);
}

.dark-mode-icon {
  font-size: 1.2rem;
}

/* 暗黑模式 */
:global(.dark) .top-header {
  background: linear-gradient(135deg, #1e293b 0%, rgba(30, 41, 59, 0.95) 100%);
  border-bottom-color: #475569;
}

:global(.dark) .top-header h1 {
  background: none;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: unset;
  background-clip: unset;
  color: #f1f5f9;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

:global(.dark) .header-subtitle {
  color: #94a3b8;
  background: rgba(59, 130, 246, 0.15);
}

:global(.dark) .header-user {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

:global(.dark) .account-btn {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.25);
}

:global(.dark) .account-btn:hover {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.35);
}

:global(.dark) .account-name {
  color: #4ade80;
}

:global(.dark) .account-dropdown {
  background: #1e293b;
  border-color: #475569;
}

:global(.dark) .dropdown-header {
  background: #0f172a;
  border-color: #475569;
  color: #94a3b8;
}

:global(.dark) .account-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

:global(.dark) .account-item.active {
  background: rgba(59, 130, 246, 0.15);
}

:global(.dark) .account-item-name {
  color: #e2e8f0;
}

:global(.dark) .dropdown-divider,
:global(.dark) .env-item {
  border-color: #475569;
}

:global(.dark) .mobile-menu-btn:hover,
:global(.dark) .dark-mode-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 桌面端隱藏手機選單按鈕 */
@media (min-width: 769px) {
  .mobile-menu-btn {
    display: none;
  }
}

/* 響應式 */
@media (max-width: 768px) {
  .top-header {
    padding: 1rem 1.5rem;
  }
  
  .top-header h1 {
    font-size: 1.4rem;
  }
}

@media (max-width: 480px) {
  .top-header {
    padding: 0.8rem 1rem;
  }
  
  .top-header h1 {
    font-size: 1.2rem;
  }
}
</style>
