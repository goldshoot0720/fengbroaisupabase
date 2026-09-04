<template>
  <aside class="sidebar" :class="{ 'sidebar-open': isOpen }">
    <div class="sidebar-header">
      <div class="brand-lockup">
        <div class="brand-mark">
          <span>FA</span>
        </div>
        <div class="brand-copy">
          <p class="brand-kicker">Mobile Menu</p>
          <h2 class="brand-title">鋒兄選單</h2>
          <p class="brand-subtitle">點選模組快速切換，工具可展開子項目。</p>
        </div>
      </div>

      <button @click="$emit('toggle')" class="sidebar-toggle" type="button" aria-label="關閉選單">
        <span class="sidebar-toggle__icon" aria-hidden="true">×</span>
        <span class="sidebar-toggle__label">關閉</span>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="主要導覽">
      <p class="section-label">全部模組</p>
      <ul>
        <li v-for="page in pages" :key="page.id">
          <button
            @click="$emit('navigate', page.id)"
            :class="{ active: isParentActive(page) }"
            class="nav-btn"
            type="button"
          >
            <span class="nav-index"><NavIcon :name="page.iconName" /></span>
            <span class="nav-copy">
              <span class="nav-name">{{ page.name }}</span>
              <span v-if="page.menuHint" class="nav-hint">{{ page.menuHint }}</span>
            </span>
          </button>
          <ul
            v-if="page.children?.length && isParentExpanded(page)"
            class="nav-children"
          >
            <li v-for="child in page.children" :key="child.id">
              <button
                @click="$emit('navigate', child.id)"
                :class="{ active: isChildActive(page, child) }"
                class="nav-child-btn"
                type="button"
              >
                <NavIcon :name="child.iconName || page.iconName" class="nav-child-glyph" />
                <span class="nav-child-name">{{ child.name }}</span>
                <span v-if="child.menuHint" class="nav-child-hint">{{ child.menuHint }}</span>
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <p class="footer-label">Quick Tip</p>
      <p class="footer-title">拇指友善導覽</p>
      <p class="footer-text">主要操作集中在上方選單與內容區；語音與播放器固定在底部方便單手操作。</p>
    </div>
  </aside>
</template>

<script setup>
import { isNavChildActive, isNavParentActive, isNavParentExpanded } from '../../composables/useNavigation'
import NavIcon from '../ui/NavIcon.vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  currentPage: { type: String, default: 'home' },
  activeTool: { type: String, default: 'biggo' },
  pages: { type: Array, default: () => [] }
})

defineEmits(['toggle', 'navigate'])

const isParentActive = (page) => isNavParentActive(page, props.currentPage, props.activeTool)
const isParentExpanded = (page) => isNavParentExpanded(page, props.currentPage)
const isChildActive = (page, child) => isNavChildActive(page, child, props.currentPage, props.activeTool)
</script>

<style scoped>
.sidebar {
  width: 236px;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  position: fixed;
  top: 0;
  left: -236px;
  height: 100vh;
  padding: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  transition: left var(--transition-slow), box-shadow var(--transition-normal);
  z-index: 1000;
  overflow-y: auto;
  border-right: 1px solid var(--sidebar-border);
  overscroll-behavior: contain;
}

.sidebar.sidebar-open {
  left: 0;
  box-shadow: var(--elevation-3);
}

/* 三個區塊是浮在米色底上的白紙卡 */
.sidebar-header,
.sidebar-nav,
.sidebar-footer {
  border: 1px solid var(--sidebar-border);
  background: var(--sidebar-panel);
  border-radius: var(--radius-lg);
}

.sidebar-header,
.sidebar-nav,
.sidebar-footer {
  padding: var(--sp-4);
}

.brand-lockup {
  display: flex;
  gap: var(--sp-3);
  align-items: flex-start;
}

.brand-mark {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--primary-solid);
  color: var(--on-primary);
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: var(--text-sm);
  letter-spacing: 0.04em;
}

.brand-kicker,
.section-label,
.footer-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}

.brand-title {
  margin-top: 2px;
  font-size: var(--text-lg);
  line-height: 1.2;
}

.brand-subtitle,
.footer-text {
  margin-top: var(--sp-1);
  color: var(--text-muted);
  font-size: var(--text-xs);
  line-height: 1.5;
}

.sidebar-toggle {
  margin-top: var(--sp-4);
  width: 100%;
  min-height: var(--control-h-lg);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: var(--control-radius);
  padding: 0 var(--sp-4);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.sidebar-toggle:hover {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.sidebar-nav {
  flex: 1;
}

.sidebar-nav ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--sp-3);
}

.nav-btn {
  width: 100%;
  border: 0;
  color: inherit;
  background: transparent;
  border-radius: var(--control-radius);
  min-height: var(--control-h-lg);
  padding: var(--sp-2) var(--sp-3);
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.nav-btn:hover {
  background: var(--surface-hover);
}

/* 選中：淡黏土底 + 同色細環，不用漸層 */
.nav-btn.active {
  background: var(--primary-light);
  color: var(--primary-text);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary) 34%, transparent);
}

.nav-index {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1;
  color: var(--text-muted);
  background: var(--bg-muted);
  border: 1px solid var(--border-subtle);
}

.nav-btn.active .nav-index {
  background: var(--primary-solid);
  border-color: transparent;
  color: var(--on-primary);
}

.nav-copy {
  min-width: 0;
  flex: 1;
  text-align: left;
}

.nav-name {
  display: block;
  font-weight: 500;
  font-size: var(--text-sm);
  line-height: 1.25;
  text-align: left;
}

.nav-hint {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: var(--text-2xs);
  line-height: 1.25;
  text-align: left;
}

.nav-children {
  margin: 0.2rem 0 0.35rem 1.05rem !important;
  gap: 0.18rem !important;
  border-left: 1px solid var(--border-subtle);
  padding-left: 0.55rem;
}

.nav-child-btn {
  width: 100%;
  border: 0;
  color: var(--text-secondary);
  background: transparent;
  border-radius: var(--radius-sm);
  min-height: var(--control-h);
  padding: var(--sp-1) var(--sp-2);
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.nav-child-glyph {
  flex-shrink: 0;
  font-size: 0.9rem;
  line-height: 1;
}

.nav-child-btn:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}

.nav-child-btn.active {
  color: var(--primary-text);
  background: var(--primary-light);
}

.nav-child-name,
.nav-child-hint {
  text-align: left;
}

.nav-child-name {
  font-weight: 500;
  font-size: var(--text-xs);
  line-height: 1.2;
  min-width: 0;
}

.nav-child-hint {
  color: var(--text-muted);
  font-size: var(--text-2xs);
  line-height: 1.2;
}

.footer-title {
  margin-top: var(--sp-1);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
}

@media (min-width: 769px) {
  .sidebar {
    display: none !important;
  }
}


@media (max-width: 768px) {
  .sidebar {
    width: min(86vw, 320px);
    left: calc(-1 * min(86vw, 320px));
    top: 0;
    height: 100dvh;
    height: 100vh;
    padding:
      calc(0.7rem + env(safe-area-inset-top, 0px))
      0.75rem
      calc(0.85rem + env(safe-area-inset-bottom, 0px));
    border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
    box-shadow: none;
    background: var(--sidebar-bg);
    transition: left var(--duration-slow) var(--ease-out-expo), box-shadow var(--duration-normal) var(--ease-out-expo);
  }

  .sidebar.sidebar-open {
    left: 0;
    box-shadow: var(--elevation-3);
  }

  .sidebar-header,
  .sidebar-nav,
  .sidebar-footer {
    border-radius: var(--radius-lg);
    padding: 0.85rem;
  }

  .sidebar-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .brand-lockup {
    gap: 0.75rem;
  }

  .brand-mark {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--primary-solid);
  }

  .brand-title {
    font-size: 1.15rem;
  }

  .brand-subtitle {
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .sidebar-toggle {
    margin-top: 0;
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border-radius: var(--control-radius);
    font-weight: 700;
    background: var(--bg-surface);
  }

  .sidebar-toggle__icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .sidebar-toggle__label {
    font-size: 0.92rem;
  }

  .section-label {
    margin: 0;
  }

  .sidebar-nav ul {
    margin-top: 0.55rem;
    gap: 0.35rem;
  }

  .nav-btn {
    min-height: 52px;
    padding: 0.7rem 0.8rem;
    border-radius: var(--control-radius);
  }

  .nav-btn:active {
    transform: scale(0.985);
    background: var(--surface-active);
  }

  .nav-name {
    font-size: 0.98rem;
  }

  .nav-children {
    margin: 0.15rem 0 0.45rem 1.15rem !important;
  }

  .nav-child-btn {
    min-height: 44px;
    border-radius: var(--radius-sm);
    padding: 0.55rem 0.7rem;
  }

  .nav-child-btn:active {
    transform: scale(0.985);
  }

  .sidebar-footer {
    margin-top: auto;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: min(90vw, 300px);
    left: calc(-1 * min(90vw, 300px));
  }

  .brand-title {
    font-size: 1.08rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }

  .nav-btn,
  .nav-child-btn {
    transition: none;
  }

  .nav-btn:hover,
  .nav-btn:active,
  .nav-child-btn:hover,
  .nav-child-btn:active {
    transform: none;
  }
}
</style>
