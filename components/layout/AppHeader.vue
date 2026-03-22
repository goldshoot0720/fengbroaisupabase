<template>
  <header class="top-header">
    <div class="header-left">
      <button @click="$emit('toggleSidebar')" class="mobile-menu-btn" type="button" aria-label="開啟選單">
        <span>Menu</span>
      </button>

      <div class="title-block">
        <p class="title-kicker">Tech Editorial Workspace</p>
        <h1>{{ title }}</h1>
        <p class="header-subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div class="header-right">
      <div class="signal-card">
        <span class="signal-label">Focus</span>
        <strong>Subscription / Food Ops</strong>
      </div>

      <div class="account-switcher" ref="switcherRef">
        <button
          class="account-btn"
          @click="toggleDropdown"
          :title="displayName"
          type="button"
        >
          <span class="account-chip">Source</span>
          <span class="account-name">{{ displayName }}</span>
          <span class="dropdown-arrow">{{ showDropdown ? 'Hide' : 'Open' }}</span>
        </button>

        <div v-if="showDropdown" class="account-dropdown">
          <div class="dropdown-header">資料來源切換</div>

          <div
            v-for="acc in accounts"
            :key="acc.id"
            class="account-item"
            :class="{ active: acc.id === activeAccountId }"
            @click="handleSwitch(acc.id)"
          >
            <span class="account-item-icon">{{ acc.id === activeAccountId ? 'On' : 'DB' }}</span>
            <span class="account-item-name">supabase-{{ acc.friendlyName || '.env' }}</span>
          </div>

          <div
            class="account-item env-item"
            :class="{ active: !activeAccountId && accounts.length === 0 }"
            @click="handleUseEnv"
          >
            <span class="account-item-icon">ENV</span>
            <span class="account-item-name">使用 `.env` 設定</span>
          </div>

          <div class="dropdown-divider"></div>

          <div class="account-item settings-item" @click="goToSettings">
            <span class="account-item-icon">CFG</span>
            <span class="account-item-name">前往設定</span>
          </div>
        </div>
      </div>

      <slot name="actions" />

      <button
        @click="refreshPage"
        class="refresh-btn"
        title="重新整理目前頁面"
        type="button"
      >
        <span class="refresh-icon">Refresh</span>
      </button>

      <button
        @click="$emit('toggleDarkMode')"
        class="dark-mode-toggle"
        :title="isDarkMode ? '切換為淺色模式' : '切換為深色模式'"
        type="button"
      >
        <span class="dark-mode-icon">{{ isDarkMode ? 'Light' : 'Dark' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: '控制首頁' },
  subtitle: { type: String, default: '科技編輯式管理平台' },
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
  window.location.reload()
}

const handleUseEnv = () => {
  clearSettings()
  showDropdown.value = false
  window.location.reload()
}

const refreshPage = () => {
  window.location.reload()
}

const goToSettings = () => {
  showDropdown.value = false
  router.push('/?page=settings')
}

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
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: clamp(1rem, 0.85rem + 0.55vw, 1.2rem) clamp(1rem, 0.7rem + 1vw, 1.4rem) clamp(0.95rem, 0.8rem + 0.45vw, 1.1rem);
  margin-bottom: 1rem;
  background: color-mix(in oklab, var(--header-bg) 86%, transparent);
  backdrop-filter: blur(18px);
  border: 1px solid var(--border-color);
  border-radius: 28px;
  box-shadow: var(--shadow-soft);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.header-left {
  min-width: 0;
  flex: 1 1 420px;
}

.title-block {
  min-width: 0;
}

.header-right {
  flex: 1 1 420px;
  justify-content: flex-end;
  flex-wrap: wrap;
  min-width: 0;
}

.title-kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-muted);
  margin-bottom: 0.15rem;
}

.top-header h1 {
  font-size: clamp(1.7rem, 1.4rem + 1vw, 2.8rem);
  line-height: 1.02;
  margin: 0;
  color: var(--text-primary);
}

.header-subtitle {
  margin-top: 0.3rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  max-width: 48ch;
}

.mobile-menu-btn,
.refresh-btn,
.dark-mode-toggle,
.account-btn,
.signal-card {
  border: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--bg-secondary) 88%, transparent);
  box-shadow: var(--shadow-soft);
}

.mobile-menu-btn,
.refresh-btn,
.dark-mode-toggle,
.account-btn {
  border-radius: 999px;
  color: var(--text-primary);
}

.mobile-menu-btn,
.refresh-btn,
.dark-mode-toggle {
  padding: 0.8rem 1rem;
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
}

.mobile-menu-btn:hover,
.refresh-btn:hover,
.dark-mode-toggle:hover,
.account-btn:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
}

.signal-card {
  display: grid;
  gap: 0.1rem;
  padding: 0.7rem 0.9rem;
  border-radius: 20px;
  flex: 0 1 280px;
}

.signal-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.signal-card strong {
  font-size: 0.88rem;
}

.account-switcher {
  position: relative;
  min-width: 0;
}

.account-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-fast);
  max-width: 100%;
}

.account-chip,
.dropdown-arrow,
.account-item-icon {
  font-family: var(--font-display);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

.account-chip {
  padding: 0.32rem 0.5rem;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
}

.account-name {
  max-width: clamp(120px, 14vw, 180px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
}

.dropdown-arrow {
  color: var(--text-muted);
}

.account-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 250px;
  padding: 0.55rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  box-shadow: var(--shadow);
}

.dropdown-header {
  padding: 0.7rem 0.8rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 0.8rem;
  border-radius: 18px;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.account-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(2px);
}

.account-item.active {
  background: var(--primary-light);
}

.account-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: color-mix(in oklab, var(--bg-tertiary) 90%, transparent);
  color: var(--text-secondary);
}

.account-item-name {
  font-size: 0.92rem;
  color: var(--text-primary);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.4rem 0;
}

.dark-mode-icon {
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.refresh-icon {
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

@media (max-width: 1440px) {
  .top-header {
    gap: 0.85rem;
  }

  .top-header h1 {
    font-size: clamp(1.45rem, 1.2rem + 1vw, 2.3rem);
  }

  .header-subtitle {
    font-size: 0.88rem;
    max-width: 38ch;
  }

  .signal-card {
    flex-basis: 240px;
    padding: 0.62rem 0.8rem;
  }

  .account-btn,
  .refresh-btn,
  .mobile-menu-btn,
  .dark-mode-toggle {
    padding: 0.7rem 0.85rem;
  }
}

@media (max-width: 1120px) {
  .signal-card {
    display: none;
  }
}

@media (max-width: 768px) {
  .top-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left,
  .header-right {
    flex: 0 0 auto;
    width: 100%;
  }

  .header-left {
    align-items: flex-start;
  }

  .header-right {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .account-name {
    max-width: 120px;
  }
}

@media (min-width: 1200px) {
  .mobile-menu-btn {
    display: none;
  }
}
</style>
