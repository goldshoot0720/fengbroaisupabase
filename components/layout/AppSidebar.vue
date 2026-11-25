<template>
  <component
    :is="isMobile ? 'dialog' : 'aside'"
    id="module-navigation"
    ref="panel"
    class="sidebar"
    aria-labelledby="module-navigation-title"
    @cancel.prevent="$emit('close')"
    @click="dismissBackdrop"
  >
    <div class="sidebar-header">
      <h2 id="module-navigation-title" class="brand-title">全部模組</h2>
      <button @click="$emit('close')" class="sidebar-toggle" type="button" aria-label="關閉選單">
        <span aria-hidden="true">×</span>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="主要導覽">
      <ul>
        <li v-for="page in pages" :key="page.id">
          <button
            @click="handleParentNavigate(page)"
            :class="{ active: isParentActive(page) }"
            :aria-current="!page.children && isParentActive(page) ? 'page' : undefined"
            class="nav-btn"
            type="button"
          >
            <span class="nav-index"><NavIcon :name="page.iconName" /></span>
            <span class="nav-copy">
              <span class="nav-name">{{ page.name }}</span>
              <span v-if="page.menuHint" class="nav-hint">{{ page.menuHint }}</span>
            </span>
          </button>
          <!-- 子項目固定展開，手機上一目了然，不需要先點母選單 -->
          <ul
            v-if="page.children?.length"
            class="nav-children"
          >
            <li v-for="child in page.children" :key="child.id">
              <button
                @click="$emit('navigate', child.id)"
                :class="{ active: isChildActive(page, child) }"
                :aria-current="isChildActive(page, child) ? 'page' : undefined"
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
  </component>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { isNavChildActive, isNavParentActive } from '../../composables/useNavigation'
import NavIcon from '../ui/NavIcon.vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  currentPage: { type: String, default: 'home' },
  activeTool: { type: String, default: 'biggo' },
  pages: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'navigate'])
const panel = ref(null)
const isMobile = ref(false)
let mobileQuery

const syncViewport = () => {
  isMobile.value = mobileQuery.matches
  if (!isMobile.value && props.isOpen) emit('close')
}

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 768px)')
  syncViewport()
  mobileQuery.addEventListener('change', syncViewport)
})
onUnmounted(() => mobileQuery?.removeEventListener('change', syncViewport))

watch([panel, () => props.isOpen], ([element, open]) => {
  if (element?.tagName !== 'DIALOG') return
  if (open && !element.open) element.showModal()
  if (!open && element.open) element.close()
}, { flush: 'post' })

const dismissBackdrop = (event) => {
  if (!isMobile.value || event.target !== panel.value) return
  const { left, right, top, bottom } = panel.value.getBoundingClientRect()
  if (event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom) emit('close')
}

const isParentActive = (page) => isNavParentActive(page, props.currentPage, props.activeTool)
const isChildActive = (page, child) => isNavChildActive(page, child, props.currentPage, props.activeTool)

/** Children are always visible now, so tapping the group header itself jumps to its first child. */
const handleParentNavigate = (page) => {
  if (page.children?.length) {
    emit('navigate', page.children[0].id)
  } else {
    emit('navigate', page.id)
  }
}
</script>

<style scoped>
.sidebar {
  display: none;
  color: var(--text-primary);
  background: var(--sidebar-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  padding: var(--sp-2) var(--sp-4);
  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 1;
}

.brand-title { font-size: var(--text-lg); }
.sidebar-toggle {
  display: none;
  width: var(--control-h-lg);
  height: var(--control-h-lg);
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: var(--text-xl);
  cursor: pointer;
}
.sidebar-nav { padding: 0 var(--sp-3) var(--sp-4); }

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

@media (min-width: 769px) and (max-width: 1024px) {
  aside.sidebar {
    display: block;
    position: sticky;
    top: var(--sp-3);
    width: 248px;
    height: calc(100vh - var(--sp-6));
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  dialog.sidebar[open] {
    display: block;
    position: fixed;
    inset: 0 auto 0 0;
    margin: 0;
    padding: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px);
    width: min(86vw, 20rem);
    max-width: none;
    height: 100vh;
    height: 100dvh;
    max-height: none;
    border: 0;
    border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
    box-shadow: var(--elevation-3);
  }
  dialog.sidebar::backdrop { background: color-mix(in srgb, var(--overlay-scrim) 48%, transparent); }
  :global(html:has(dialog.sidebar[open])) { overflow: hidden; }
  .sidebar-toggle { display: grid; place-items: center; }
  .nav-child-btn { min-height: var(--control-h-lg); }
  .nav-child-name { font-size: var(--text-sm); }
}

@media (prefers-reduced-motion: reduce) {
  .nav-btn, .nav-child-btn { transition: none; }
}
</style>
