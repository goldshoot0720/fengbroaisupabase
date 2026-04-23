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

      <button @click="$emit('toggle')" class="sidebar-toggle" type="button" aria-label="Toggle sidebar">
        <span>{{ isOpen ? 'Close' : 'Menu' }}</span>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="Primary navigation">
      <p class="section-label">All Sections</p>
      <ul>
        <li v-for="page in pages" :key="page.id">
          <button
            @click="$emit('navigate', page.id)"
            :class="{ active: currentPage === page.id }"
            class="nav-btn"
            type="button"
          >
            <span class="nav-name">{{ page.name }}</span>
            <span v-if="page.menuHint" class="nav-hint">{{ page.menuHint }}</span>
          </button>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <p class="footer-label">Current Lens</p>
      <p class="footer-title">Tech editorial interface</p>
      <p class="footer-text">Streamlined navigation focused on data-heavy workflows.</p>
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
  display: block;
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

.footer-title {
  margin-top: 0.3rem;
  font-family: var(--font-display);
  font-size: 1rem;
}

@media (min-width: 1200px) {
  .sidebar {
    position: sticky;
    top: 1rem;
    left: 0;
    width: 236px;
    height: calc(100vh - 2rem);
    box-shadow: none;
    border-radius: 32px;
  }

  .sidebar-toggle {
    display: none;
  }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .sidebar {
    top: 0.75rem;
    left: calc(-1 * min(260px, 72vw));
    width: min(260px, 72vw);
    height: calc(100vh - 1.5rem);
    border-radius: 0 30px 30px 0;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: min(78vw, 260px);
    left: calc(-1 * min(78vw, 260px));
    top: 0;
    height: 100vh;
    padding: 0.8rem;
    border-radius: 0 26px 26px 0;
  }

  .sidebar-header,
  .sidebar-nav,
  .sidebar-footer {
    border-radius: 24px;
  }

  .nav-btn {
    padding: 0.68rem 0.75rem;
  }
}

@media (max-width: 480px) {
  .brand-lockup {
    gap: 0.75rem;
  }

  .brand-mark {
    width: 48px;
    height: 48px;
    border-radius: 16px;
  }

  .brand-title {
    font-size: 1.05rem;
  }
}
</style>
