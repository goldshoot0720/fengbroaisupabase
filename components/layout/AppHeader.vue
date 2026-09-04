<template>
  <header class="top-header">
    <!-- 第一行：品牌 + 右側工具列 -->
    <div class="header-top-row">
      <div class="header-left">
        <button @click="$emit('toggleSidebar')" class="mobile-menu-btn" type="button" aria-label="開啟選單">
          <span class="menu-icon" aria-hidden="true">
            <i></i><i></i><i></i>
          </span>
        </button>
        <div class="brand-lockup">
          <div class="brand-mark">FA</div>
          <div class="brand-copy">
            <p class="brand-kicker">Feng Console</p>
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
          :aria-label="isDarkMode ? '切換為淺色模式' : '切換為深色模式'"
          type="button"
        >
          <span class="dark-mode-icon">{{ isDarkMode ? '☀' : '☾' }}</span>
          <span class="dark-mode-label">{{ isDarkMode ? 'Light' : 'Dark' }}</span>
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
          :class="{ active: isParentActive(page) }"
          class="nav-tab"
          type="button"
        >
          <NavIcon :name="page.iconName" class="nav-tab-glyph" />
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
          :class="{ active: isChildActive(activeParent, child) }"
          class="nav-sub-tab"
          type="button"
        >
          <NavIcon :name="child.iconName || activeParent.iconName" class="nav-sub-glyph" />
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
import { isNavChildActive, isNavParentActive } from '../../composables/useNavigation'
import { useRouter } from 'vue-router'
import NavIcon from '../ui/NavIcon.vue'

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

const isParentActive = (page) => isNavParentActive(page, props.currentPage, props.activeTool)
const isChildActive = (page, child) => isNavChildActive(page, child, props.currentPage, props.activeTool)

const activeParent = computed(() =>
  props.pages.find((page) => isNavParentActive(page, props.currentPage, props.activeTool) && page.children?.length)
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
  background: color-mix(in oklab, var(--header-bg) 92%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: none;
  overflow: hidden;
}

/* ── 第一行 ── */
.header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  min-height: var(--header-h-brand);
  border-bottom: 1px solid var(--border-subtle);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.mobile-menu-btn {
  display: none;
}

/* 品牌磚：實心黏土色，全站唯一一塊飽和色，當作視覺錨點 */
.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: var(--primary-solid);
  border: 1px solid transparent;
  color: var(--on-primary);
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: var(--text-sm);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.brand-copy {
  min-width: 0;
}

.brand-kicker {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin-bottom: 1px;
}

.header-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
  min-width: 0;
}

.top-header h1 {
  font-size: var(--text-lg);
  line-height: 1.2;
  margin: 0;
  color: var(--text-primary);
}

.title-hint {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 400;
  line-height: 1.2;
  white-space: nowrap;
}

/* ── 右側工具群 ── */
.signal-card {
  display: grid;
  gap: 1px;
  padding: 5px var(--sp-3);
  border-radius: var(--control-radius);
  border: 1px solid var(--border-subtle);
  background: var(--bg-muted);
  box-shadow: none;
}

.signal-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}

.signal-card strong {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.account-switcher {
  position: relative;
}

.account-btn,
.dark-mode-toggle {
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  box-shadow: none;
  border-radius: var(--control-radius);
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.account-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: var(--control-h);
  padding: 0 var(--sp-3);
  font-size: var(--text-sm);
}

.account-btn:hover,
.dark-mode-toggle:hover {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.dark-mode-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  height: var(--control-h);
  padding: 0 var(--sp-3);
}

.dark-mode-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
}

.account-chip,
.dropdown-arrow,
.account-item-icon {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
}

.account-chip {
  padding: 2px 6px;
  border-radius: var(--radius-full);
  background: var(--primary-light);
  color: var(--primary-text);
}

.account-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  font-size: var(--text-sm);
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
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-3);
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
  border-radius: var(--control-radius);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.account-item:hover {
  background: var(--surface-hover);
}

.account-item.active {
  background: var(--primary-light);
}

.account-item.active .account-item-icon {
  background: color-mix(in oklab, var(--primary) 18%, transparent);
  color: var(--primary-text);
}

.account-item-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: var(--bg-muted);
  color: var(--text-muted);
}

.account-item-name {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-subtle);
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
  /* Desktop: max 10 items per row; extra items wrap to the next row */
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: var(--sp-1) var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
}

.nav-tab {
  min-width: 0;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--control-radius);
  min-height: var(--header-h-nav);
  padding: var(--sp-1) var(--sp-2);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
  position: relative;
}

.nav-tab-glyph {
  flex-shrink: 0;
  font-size: var(--text-md);
  line-height: 1;
}

/* hover 用中性薄墨，強調色只留給 active 的那一條底線 */
.nav-tab:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.nav-tab.active {
  background: transparent;
  color: var(--primary-text);
  font-weight: 600;
  box-shadow: none;
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  left: var(--sp-2);
  right: var(--sp-2);
  bottom: 2px;
  height: 2px;
  border-radius: 999px;
  background: var(--primary);
}

.nav-tab-name {
  display: block;
  font-weight: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* ── 子選單列 ── */
.nav-sub-row {
  display: flex;
  overflow-x: auto;
  align-items: center;
  gap: var(--sp-2);
  min-height: var(--header-h-subnav);
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-muted);
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-sub-row::-webkit-scrollbar {
  display: none;
}

.nav-sub-tab {
  position: relative;
  flex-shrink: 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  height: var(--control-h-sm);
  padding: 0 var(--sp-3);
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.nav-sub-glyph {
  flex-shrink: 0;
  font-size: var(--text-sm);
  line-height: 1;
}

.nav-sub-tab:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.nav-sub-tab.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

.nav-sub-hint {
  color: var(--text-muted);
  font-size: var(--text-2xs);
  font-weight: 400;
}

/* ── 響應式 ── */
/* Desktop only: fewer columns when width is tight, still max 10 */
@media (max-width: 1280px) and (min-width: 769px) {
  .nav-scroll {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

@media (max-width: 960px) and (min-width: 769px) {
  .nav-scroll {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .nav-tab {
    font-size: 0.8rem;
    padding: 0.4rem 0.3rem;
  }
}

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

/* 平板：導覽交給常駐側邊欄，頂部列只留品牌與帳號工具 */
@media (min-width: 769px) and (max-width: 1024px) {
  .top-nav {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .top-header {
    position: sticky;
    top: 0;
    margin: 0 0 0.75rem;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    border-top: 0;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in oklab, var(--header-bg) 92%, transparent);
    box-shadow: var(--elevation-1);
    backdrop-filter: blur(22px) saturate(1.15);
    -webkit-backdrop-filter: blur(22px) saturate(1.15);
  }

  .header-top-row {
    padding:
      calc(0.65rem + env(safe-area-inset-top, 0px))
      max(0.85rem, env(safe-area-inset-right, 0px))
      0.7rem
      max(0.85rem, env(safe-area-inset-left, 0px));
    gap: 0.65rem;
    border-bottom: 0;
  }

  .header-left {
    gap: 0.55rem;
    min-width: 0;
    flex: 1;
  }

  .header-right {
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .brand-lockup {
    gap: 0.55rem;
    min-width: 0;
  }

  .brand-mark {
    width: 38px;
    height: 38px;
    font-size: 0.72rem;
    border-radius: var(--radius-sm);
    background: var(--primary-solid);
    border-color: transparent;
    color: var(--on-primary);
  }

  .brand-copy {
    min-width: 0;
  }

  .brand-kicker {
    font-size: 0.62rem;
    letter-spacing: 0.14em;
  }

  .top-header h1 {
    font-size: 1.05rem;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: min(48vw, 11.5rem);
  }

  .title-hint {
    display: none;
  }

  .account-btn {
    min-height: 44px;
    padding: 0.45rem 0.7rem;
    gap: 0.4rem;
  }

  .account-chip {
    padding: 0.22rem 0.4rem;
  }

  .account-name {
    max-width: 5.5rem;
    font-size: 0.8rem;
  }

  .dropdown-arrow {
    display: none;
  }

  .account-dropdown {
    min-width: min(88vw, 280px);
    right: 0;
    border-radius: var(--radius-lg);
    padding: 0.45rem;
    box-shadow: var(--elevation-3);
  }

  .account-item {
    min-height: 48px;
    border-radius: var(--control-radius);
  }

  .dark-mode-toggle {
    width: 44px;
    height: 44px;
    min-width: 44px;
    padding: 0;
    display: inline-grid;
    place-items: center;
    border-radius: var(--control-radius);
  }

  .dark-mode-icon {
    font-size: 1.05rem;
    letter-spacing: 0;
  }

  .dark-mode-label {
    display: none;
  }

  .top-nav {
    display: none !important;
  }

  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    min-width: 44px;
    padding: 0;
    border-radius: var(--control-radius);
    border: 1px solid var(--border-subtle);
    background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
    color: var(--text-primary);
    cursor: pointer;
    box-shadow: none;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      transform var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-menu-btn:active {
    transform: scale(0.96);
    background: var(--primary-muted);
    border-color: color-mix(in oklab, var(--primary) 28%, var(--border-color));
  }

  .menu-icon {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 18px;
  }

  .menu-icon i {
    display: block;
    height: 2px;
    width: 100%;
    border-radius: 999px;
    background: currentColor;
  }

  .menu-icon i:nth-child(2) {
    width: 70%;
  }
}

@media (max-width: 480px) {
  .header-top-row {
    padding-left: max(0.7rem, env(safe-area-inset-left, 0px));
    padding-right: max(0.7rem, env(safe-area-inset-right, 0px));
  }

  .header-right {
    gap: 0.35rem;
  }

  .account-name {
    display: none;
  }

  .brand-kicker {
    display: none;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
  }

  .top-header h1 {
    font-size: 1rem;
    max-width: min(52vw, 10.5rem);
  }

  .account-btn {
    padding: 0.4rem 0.55rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-menu-btn,
  .account-btn,
  .dark-mode-toggle,
  .nav-tab,
  .nav-sub-tab {
    transition: none;
  }

  .mobile-menu-btn:active,
  .account-btn:hover,
  .dark-mode-toggle:hover {
    transform: none;
  }
}
</style>
