<template>
  <header class="top-header">
    <!-- 第一行：品牌 + 右側工具列 -->
    <div class="header-top-row">
      <div class="header-left">
        <div class="brand-lockup">
          <div class="brand-mark">FA</div>
          <div class="brand-copy">
            <p class="brand-kicker">Editorial Console</p>
            <div class="header-title-row">
              <h1>{{ title }}</h1>
              <span v-if="titleHint" class="title-hint">{{ titleHint }}</span>
            </div>
          </div>
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
            <span class="dropdown-arrow">{{ showDropdown ? '▲' : '▼' }}</span>
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
          @click="$emit('toggleDarkMode')"
          class="dark-mode-toggle"
          :title="isDarkMode ? '切換為淺色模式' : '切換為深色模式'"
          type="button"
        >
          <span class="dark-mode-icon">{{ isDarkMode ? 'Light' : 'Dark' }}</span>
        </button>
      </div>
    </div>

    <!-- 第二行：頂部導航列 -->
    <nav class="top-nav" aria-label="Primary navigation" v-if="pages && pages.length">
      <div class="nav-scroll">
        <button
          v-for="page in pages"
          :key="page.id"
          @click="handleNavigate(page)"
          :class="{ active: currentPage === page.id }"
          class="nav-tab"
          type="button"
        >
          <span class="nav-tab-name">{{ page.name }}</span>
        </button>
      </div>

      <!-- 子選單：只在有 children 的頁面展開 -->
      <div
        v-if="activeParent && activeParent.children && activeParent.children.length"
        class="nav-sub-row"
      >
        <button
          v-for="child in activeParent.children"
          :key="child.id"
          @click="$emit('navigate', child.id)"
          :class="{ active: activeTool === child.tool }"
          class="nav-sub-tab"
          type="button"
        >
          <span>{{ child.name }}</span>
          <span v-if="child.menuHint" class="nav-sub-hint">{{ child.menuHint }}</span>
        </button>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: '控制首頁' },
  titleHint: { type: String, default: '' },
  subtitle: { type: String, default: '科技編輯式管理平台' },
  isDarkMode: { type: Boolean, default: false },
  pages: { type: Array, default: () => [] },
  currentPage: { type: String, default: 'home' },
  activeTool: { type: String, default: 'biggo' }
})

const emit = defineEmits(['toggleSidebar', 'toggleDarkMode', 'navigate'])

const router = useRouter()
const { displayName, accounts, activeAccountId, switchAccount, clearSettings, loadSettings } = useSettings()

const showDropdown = ref(false)
const switcherRef = ref(null)

const activeParent = computed(() =>
  props.pages.find(p => p.id === props.currentPage && p.children?.length)
)

const handleNavigate = (page) => {
  if (page.children?.length) {
    emit('navigate', page.children[0].id)
  } else {
    emit('navigate', page.id)
  }
}

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
  top: 0.75rem;
  z-index: var(--z-sticky);
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 1rem;
  background: color-mix(in oklab, var(--header-bg) 88%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 28px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

/* ── 第一行 ── */
.header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.brand-copy {
  min-width: 0;
}

.brand-kicker {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-muted);
  margin-bottom: 0.1rem;
}

.header-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
  min-width: 0;
}

.top-header h1 {
  font-size: clamp(1.3rem, 1.1rem + 0.8vw, 1.9rem);
  line-height: 1.05;
  margin: 0;
  color: var(--text-primary);
}

.title-hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

/* ── 右側工具群 ── */
.signal-card {
  display: grid;
  gap: 0.1rem;
  padding: 0.55rem 0.8rem;
  border-radius: 18px;
  border: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--bg-secondary) 88%, transparent);
  box-shadow: var(--shadow-soft);
}

.signal-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.signal-card strong {
  font-size: 0.82rem;
}

.account-switcher {
  position: relative;
}

.account-btn,
.dark-mode-toggle {
  border: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--bg-secondary) 88%, transparent);
  box-shadow: var(--shadow-soft);
  border-radius: 999px;
  color: var(--text-primary);
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast);
}

.account-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.8rem;
}

.account-btn:hover,
.dark-mode-toggle:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
}

.dark-mode-toggle {
  padding: 0.7rem 1rem;
}

.account-chip,
.dropdown-arrow,
.account-item-icon {
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.account-chip {
  padding: 0.28rem 0.45rem;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
}

.account-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
  font-size: 0.85rem;
}

.dropdown-arrow {
  color: var(--text-muted);
  font-size: 0.6rem;
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
  z-index: 100;
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
  padding: 0.75rem 0.8rem;
  border-radius: 16px;
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
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: color-mix(in oklab, var(--bg-tertiary) 90%, transparent);
  color: var(--text-secondary);
}

.account-item-name {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.4rem 0;
}

.dark-mode-icon {
  font-family: var(--font-display);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

/* ── 導航列 ── */
.top-nav {
  display: flex;
  flex-direction: column;
}

.nav-scroll {
  display: flex;
  overflow-x: auto;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-scroll::-webkit-scrollbar {
  display: none;
}

.nav-tab {
  flex-shrink: 0;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 20px;
  padding: 0.45rem 0.2rem;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
  position: relative;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.nav-tab.active {
  background: linear-gradient(135deg, rgba(93, 122, 255, 0.28), rgba(255, 255, 255, 0.08));
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px rgba(174, 189, 255, 0.3);
}

.nav-tab-name {
  display: block;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── 子選單列 ── */
.nav-sub-row {
  display: flex;
  overflow-x: auto;
  gap: 0.5rem;
  padding: 0.4rem 1rem 0.55rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.025);
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-sub-row::-webkit-scrollbar {
  display: none;
}

.nav-sub-tab {
  flex-shrink: 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  border-radius: 14px;
  padding: 0.35rem 0.2rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.nav-sub-tab:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
  transform: translateY(-1px);
}

.nav-sub-tab.active {
  background: rgba(93, 122, 255, 0.22);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(174, 189, 255, 0.25);
}

.nav-sub-hint {
  opacity: 0.55;
  font-size: 0.72rem;
  font-weight: 400;
}

/* ── 響應式 ── */
@media (max-width: 1120px) {
  .signal-card {
    display: none;
  }
  .header-top-row {
    padding: 0.85rem 1.1rem;
  }
  .header-right {
    gap: 0.65rem;
  }
}

@media (max-width: 768px) {
  .top-header {
    position: sticky;
    top: 0.4rem;
    border-radius: 22px;
    margin-bottom: 0.65rem;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }
  .header-top-row {
    padding: 0.75rem 0.9rem;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
    font-size: 0.7rem;
    border-radius: 12px;
  }
  .top-header h1 {
    font-size: clamp(1.1rem, 1rem + 2vw, 1.5rem);
  }
  .account-name {
    max-width: 100px;
  }
  .nav-scroll {
    padding: 0.45rem 0.75rem;
  }
  .nav-tab {
    font-size: 0.8rem;
    padding: 0.4rem 0.7rem;
  }
}

@media (max-width: 480px) {
  .header-right {
    gap: 0.45rem;
  }
  .account-name {
    display: none;
  }
  .brand-kicker {
    display: none;
  }
}
</style>
