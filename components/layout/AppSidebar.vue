<template>
  <div class="navigation-slot">
    <component
      :is="isMobile || isOpen ? 'dialog' : 'aside'"
      id="module-navigation"
      ref="panel"
      class="sidebar"
      aria-labelledby="module-navigation-title"
      @keydown.esc="onEscape"
      @cancel.prevent="$emit('close')"
      @click="dismissBackdrop"
    >
      <div class="sidebar-header">
        <h2 id="module-navigation-title" class="brand-title">全部模組</h2>
        <button ref="closeButton" @click="$emit('close')" class="sidebar-toggle" type="button" aria-label="關閉選單">
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div v-if="isOpen" class="module-search">
        <label for="module-query">搜尋模組</label>
        <div class="query-field">
          <input id="module-query" ref="searchInput" v-model="query" type="search" placeholder="輸入名稱或關鍵字"
            autocomplete="off" @keydown.enter="selectFirst" />
          <button v-if="query" type="button" @click="clearSearch">清除</button>
        </div>
        <p v-if="query.trim()" role="status">{{ matchCount ? `找到 ${matchCount} 個模組` : '找不到符合的模組，請試試其他關鍵字。' }}</p>
      </div>
      <nav class="sidebar-nav" aria-label="主要導覽">
        <ul>
          <li v-for="page in visiblePages" :key="page.id">
            <p v-if="isOpen && page.children?.length" class="nav-group-name">{{ page.name }}</p>
            <button
              v-else
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
                  @click="selectPage(child.id)"
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
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { findNavigationPages, isNavChildActive, isNavParentActive } from '../../composables/useNavigation'
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
}

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 768px)')
  syncViewport()
  mobileQuery.addEventListener('change', syncViewport)
})
onUnmounted(() => mobileQuery?.removeEventListener('change', syncViewport))

const query = ref('')
const searchInput = ref(null)
const closeButton = ref(null)
const visiblePages = computed(() => props.isOpen ? findNavigationPages(query.value, props.pages) : props.pages)
const matchCount = computed(() => visiblePages.value.reduce((sum, page) => sum + (page.children?.length || 1), 0))

let opener
watch(() => props.isOpen, open => {
  if (open) opener = document.activeElement
  else if (panel.value?.open) panel.value.close()
}, { flush: 'sync' })
watch([panel, () => props.isOpen], ([element, open]) => {
  if (open && element?.tagName === 'DIALOG' && !element.open) {
    element.showModal()
    const target = window.matchMedia('(pointer: fine)').matches ? searchInput : closeButton
    target.value?.focus()
  } else if (!open) {
    query.value = ''
    if (opener?.isConnected && opener !== document.body && opener.getClientRects().length) opener.focus()
    else if (opener) document.querySelector(isMobile.value ? '.mobile-menu-btn' : '.module-search-btn')?.focus()
    opener = null
  }
}, { flush: 'post' })

function onEscape(event) {
  if (!props.isOpen || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  emit('close')
}
function selectPage(id) {
  if (props.isOpen) emit('close')
  emit('navigate', id)
}
function selectFirst(event) {
  if (event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  const first = visiblePages.value[0]
  if (first) handleParentNavigate(first)
}
function clearSearch() {
  query.value = ''
  searchInput.value?.focus()
}

const dismissBackdrop = (event) => {
  if (!props.isOpen || event.target !== panel.value) return
  const { left, right, top, bottom } = panel.value.getBoundingClientRect()
  if (event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom) emit('close')
}

const isParentActive = (page) => isNavParentActive(page, props.currentPage, props.activeTool)
const isChildActive = (page, child) => isNavChildActive(page, child, props.currentPage, props.activeTool)

const handleParentNavigate = (page) => selectPage(page.children?.[0]?.id || page.id)
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
  .navigation-slot {
    width: 248px;
    flex-shrink: 0;
    position: sticky;
    top: var(--sp-3);
  }
  aside.sidebar {
    display: block;
    position: sticky;
    top: var(--sp-3);
    width: 248px;
    height: calc(100vh - var(--sp-6));
    flex-shrink: 0;
  }
}

dialog.sidebar[open] {
  display: flex;
  flex-direction: column;
  width: min(32rem, 90%);
  max-height: 78dvh;
  margin: min(8dvh, 4rem) auto auto;
  overflow: hidden;
  padding: 0;
  box-shadow: var(--elevation-3);
}
dialog.sidebar::backdrop { background: color-mix(in srgb, var(--overlay-scrim) 48%, transparent); }
:global(html:has(dialog.sidebar[open])) { overflow-y: hidden; }
dialog .sidebar-nav { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
dialog .sidebar-header, dialog .module-search { flex-shrink: 0; }
.nav-group-name { color: var(--text-secondary); font-size: var(--text-sm); font-weight: 600; padding: var(--sp-2); }
dialog .nav-children { border: 0; margin-inline-start: 0 !important; }
dialog .nav-child-btn { min-height: var(--control-h-lg); }
dialog .nav-child-name { font-size: var(--text-sm); }
dialog .sidebar-toggle { display: grid; place-items: center; }
.module-search { padding: var(--sp-3) var(--sp-4) 0; }
.module-search label { display: block; font-weight: 600; margin-bottom: var(--sp-1); }
.module-search p { color: var(--text-secondary); font-size: var(--text-sm); margin: var(--sp-2) 0; }
.query-field { display: flex; align-items: center; gap: var(--sp-2); }
.query-field input {
  flex: 1; min-width: 0; min-height: var(--control-h-lg); padding-inline: var(--sp-3);
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--bg-surface); color: var(--text-primary); font: inherit;
}
.query-field input::-webkit-search-cancel-button { display: none; }
.query-field button {
  min-height: var(--control-h-lg); background: transparent; color: var(--primary-text);
  border: 0; cursor: pointer;
}

@media (max-width: 768px) {
  dialog.sidebar[open] {
    display: flex;
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
  .nav-child-btn { min-height: var(--control-h-lg); }
  .nav-child-name { font-size: var(--text-sm); }
}

@media (prefers-reduced-motion: reduce) {
  .nav-btn, .nav-child-btn { transition: none; }
}
</style>
