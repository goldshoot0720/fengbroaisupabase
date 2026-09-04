<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeOnOverlay && close()">
        <div class="modal-container" :class="[size]">
          <div class="modal-header">
            <div class="header-content">
              <span v-if="icon" class="modal-icon">{{ icon }}</span>
              <h3 class="modal-title">{{ title }}</h3>
            </div>
            <button v-if="showClose" class="modal-close" @click="close">✕</button>
          </div>
          
          <div class="modal-body">
            <slot />
          </div>
          
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v)
  },
  showClose: { type: Boolean, default: true },
  closeOnOverlay: { type: Boolean, default: true },
  closeOnEsc: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'close'])

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleEsc = (e) => {
  if (e.key === 'Escape' && props.closeOnEsc && props.modelValue) {
    close()
  }
}

watch(() => props.modelValue, (val) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = val ? 'hidden' : ''
  }
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleEsc)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleEsc)
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  /* 暖色遮罩，不是純黑：底下的紙面才不會變灰 */
  background: color-mix(in oklab, var(--overlay-scrim) 55%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: var(--sp-4);
}

.modal-container {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--elevation-3);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 尺寸 */
.modal-container.sm { width: 100%; max-width: 400px; }
.modal-container.md { width: 100%; max-width: 560px; }
.modal-container.lg { width: 100%; max-width: 720px; }
.modal-container.xl { width: 100%; max-width: 960px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4);
  border-bottom: 1px solid var(--border-subtle);
  background: transparent;
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.modal-icon {
  font-size: var(--text-lg);
}

.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}

.modal-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-lg);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--sp-4);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-muted);
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
}

/* 動畫：進場輕一點，不要「彈」 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--duration-normal) var(--ease-standard);
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform var(--duration-normal) var(--ease-standard);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.98) translateY(8px);
}

/* 暗黑模式由 token 自動翻轉 */

/* 響應式 */
@media (max-width: 768px) {
  .modal-container {
    max-height: 85vh;
  }
  
  .modal-header, .modal-body, .modal-footer {
    padding: 1rem;
  }
}
</style>
