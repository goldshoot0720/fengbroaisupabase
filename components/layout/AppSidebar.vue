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
            :class="{ active: currentPage === page.id }"
            class="nav-btn"
            type="button"
          >
            <span class="nav-index" aria-hidden="true">{{ page.icon }}</span>
            <span class="nav-copy">
              <span class="nav-name">{{ page.name }}</span>
              <span v-if="page.menuHint" class="nav-hint">{{ page.menuHint }}</span>
            </span>
          </button>
          <ul
            v-if="page.children?.length && (currentPage === page.id || page.id === 'tools')"
            class="nav-children"
          >
            <li v-for="child in page.children" :key="child.id">
              <button
                @click="$emit('navigate', child.id)"
                :class="{ active: currentPage === page.id && activeTool === child.tool }"
                class="nav-child-btn"
                type="button"
              >
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
defineProps({
  isOpen: { type: Boolean, default: false },
  currentPage: { type: String, default: 'home' },
  activeTool: { type: String, default: 'biggo' },
  pages: { type: Array, default: () => [] }
})

defineEmits(['toggle', 'navigate'])
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
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  transition: left var(--transition-slow), box-shadow var(--transition-normal);
  z-index: 1000;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overscroll-behavior: contain;
}

.sidebar.sidebar-open {
  left: 0;
  box-shadow: 30px 0 80px rgba(6, 10, 20, 0.28);
}

.sidebar-header,
.sidebar-nav,
.sidebar-footer {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  border-radius: 28px;
}

.sidebar-header,
.sidebar-nav,
.sidebar-footer {
  padding: 0.85rem;
}

.brand-lockup {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
}

.brand-mark {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.03));
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.brand-kicker,
.section-label,
.footer-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.55);
}

.brand-title {
  margin-top: 0.15rem;
  font-size: 1.2rem;
  line-height: 1.1;
}

.brand-subtitle,
.footer-text {
  margin-top: 0.4rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.88rem;
  line-height: 1.5;
}

.sidebar-toggle {
  margin-top: 1rem;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.sidebar-nav {
  flex: 1;
}

.sidebar-nav ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.65rem;
}

.nav-btn {
  width: 100%;
  border: 0;
  color: inherit;
  background: transparent;
  border-radius: 18px;
  padding: 0.72rem 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.nav-btn:hover {
  transform: translateX(2px);
  background: rgba(255, 255, 255, 0.06);
}

.nav-btn.active {
  background: linear-gradient(135deg, rgba(93, 122, 255, 0.26), rgba(255, 255, 255, 0.08));
  box-shadow: inset 0 0 0 1px rgba(174, 189, 255, 0.3);
}

.nav-index {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-btn.active .nav-index {
  background: rgba(93, 122, 255, 0.35);
  border-color: rgba(174, 189, 255, 0.35);
}

.nav-copy {
  min-width: 0;
  flex: 1;
  text-align: left;
}

.nav-name {
  display: block;
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.25;
  text-align: left;
}

.nav-hint {
  display: block;
  margin-top: 0.2rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.72rem;
  line-height: 1.25;
  text-align: left;
}

.nav-children {
  margin: 0.2rem 0 0.35rem 1.05rem !important;
  gap: 0.18rem !important;
  border-left: 1px solid rgba(255, 255, 255, 0.14);
  padding-left: 0.55rem;
}

.nav-child-btn {
  width: 100%;
  border: 0;
  color: rgba(255, 255, 255, 0.78);
  background: transparent;
  border-radius: 14px;
  padding: 0.48rem 0.6rem;
  display: block;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.nav-child-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.055);
  transform: translateX(2px);
}

.nav-child-btn.active {
  color: #fff;
  background: rgba(93, 122, 255, 0.2);
  box-shadow: inset 0 0 0 1px rgba(174, 189, 255, 0.22);
}

.nav-child-name,
.nav-child-hint {
  display: block;
  text-align: left;
}

.nav-child-name {
  font-weight: 700;
  font-size: 0.82rem;
  line-height: 1.2;
}

.nav-child-hint {
  margin-top: 0.12rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.66rem;
  line-height: 1.2;
}

.footer-title {
  margin-top: 0.3rem;
  font-family: var(--font-display);
  font-size: 1rem;
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
    border-radius: 0 28px 28px 0;
    box-shadow: none;
    background:
      radial-gradient(circle at top left, rgba(93, 122, 255, 0.18), transparent 42%),
      linear-gradient(180deg, oklch(0.17 0.024 248) 0%, oklch(0.13 0.02 248) 100%);
    transition: left var(--duration-slow) var(--ease-out-expo), box-shadow var(--duration-normal) var(--ease-out-expo);
  }

  .sidebar.sidebar-open {
    left: 0;
    box-shadow: 24px 0 56px rgba(6, 10, 20, 0.38);
  }

  .sidebar-header,
  .sidebar-nav,
  .sidebar-footer {
    border-radius: 22px;
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
    border-radius: 16px;
    background: linear-gradient(145deg, rgba(93, 122, 255, 0.4), rgba(255, 255, 255, 0.08));
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
    border-radius: 16px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.06);
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
    border-radius: 16px;
  }

  .nav-btn:active {
    transform: scale(0.985);
    background: rgba(255, 255, 255, 0.09);
  }

  .nav-btn.active {
    background: linear-gradient(135deg, rgba(93, 122, 255, 0.34), rgba(255, 255, 255, 0.08));
  }

  .nav-name {
    font-size: 0.98rem;
  }

  .nav-children {
    margin: 0.15rem 0 0.45rem 1.15rem !important;
  }

  .nav-child-btn {
    min-height: 44px;
    border-radius: 14px;
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
