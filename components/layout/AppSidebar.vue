<template>
  <aside class="sidebar" :class="{ 'sidebar-open': isOpen }">
    <div class="sidebar-header">
      <div class="brand-lockup">
        <div class="brand-mark">
          <span>FA</span>
        </div>
        <div class="brand-copy">
          <p class="brand-kicker">Editorial Console</p>
          <h2 class="brand-title">Feng AI Supabase</h2>
          <p class="brand-subtitle">Subscription and pantry intelligence for technical users.</p>
        </div>
      </div>

      <button @click="$emit('toggle')" class="sidebar-toggle" type="button" aria-label="切換側邊欄">
        <span>{{ isOpen ? 'Close' : 'Menu' }}</span>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="主要導覽">
      <ul>
        <li v-for="page in pages" :key="page.id">
          <button
            @click="$emit('navigate', page.id)"
            :class="{ active: currentPage === page.id }"
            class="nav-btn"
            type="button"
          >
            <span class="nav-index">{{ page.icon }}</span>
            <span class="nav-copy">
              <span class="nav-name">{{ page.name }}</span>
              <span class="nav-meta">{{ page.subtitle }}</span>
            </span>
          </button>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <p class="footer-label">Current Lens</p>
      <p class="footer-title">科技編輯風介面</p>
      <p class="footer-text">把資料管理做得像一份可以快速掃讀的編輯報導。</p>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  isOpen: { type: Boolean, default: false },
  currentPage: { type: String, default: 'home' },
  pages: { type: Array, default: () => [] }
})

defineEmits(['toggle', 'navigate'])
</script>

<style scoped>
.sidebar {
  width: clamp(268px, 18vw, 320px);
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  position: fixed;
  top: 0;
  left: calc(-1 * clamp(268px, 18vw, 320px));
  height: 100vh;
  padding: clamp(0.85rem, 0.8rem + 0.3vw, 1.1rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.9rem, 0.8rem + 0.35vw, 1.25rem);
  transition: left var(--transition-slow), box-shadow var(--transition-normal);
  z-index: 1000;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
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

.sidebar-header {
  padding: clamp(0.85rem, 0.75rem + 0.3vw, 1rem);
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

.sidebar-footer {
  padding: clamp(0.85rem, 0.75rem + 0.3vw, 1rem);
}

.sidebar-nav {
  padding: 1rem;
  flex: 1;
}

.sidebar-nav ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.85rem;
}

.nav-btn {
  width: 100%;
  border: 0;
  color: inherit;
  background: transparent;
  border-radius: 22px;
  padding: 0.8rem;
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 0.9rem;
  align-items: start;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.07);
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
}

.nav-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.nav-name {
  font-weight: 700;
}

.nav-meta {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.35;
}

.footer-title {
  margin-top: 0.3rem;
  font-family: var(--font-display);
  font-size: 1rem;
}

@media (min-width: 1200px) {
  .sidebar {
    position: sticky;
    left: 0;
    width: clamp(268px, 18vw, 320px);
    box-shadow: none;
  }

  .sidebar-toggle {
    display: none;
  }
}

@media (max-width: 1500px) {
  .nav-btn {
    grid-template-columns: 38px 1fr;
    gap: 0.75rem;
    padding: 0.72rem;
  }

  .nav-meta {
    font-size: 0.76rem;
  }

  .brand-title {
    font-size: 1.08rem;
  }

  .brand-subtitle,
  .footer-text {
    font-size: 0.82rem;
  }
}

@media (max-width: 1199px) {
  .sidebar {
    width: min(300px, 32vw);
    left: calc(-1 * min(300px, 32vw));
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: min(88vw, 320px);
    left: calc(-1 * min(88vw, 320px));
  }
}
</style>
