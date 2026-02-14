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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-container {
  background: var(--bg-secondary, #ffffff);
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
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
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, #e1e8ed);
  background: var(--bg-tertiary, #f8f9fa);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #2c3e50);
}

.modal-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary, #666);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-primary, #2c3e50);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color, #e1e8ed);
  background: var(--bg-tertiary, #f8f9fa);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* 動畫 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9) translateY(20px);
}

/* 暗黑模式 */
:global(.dark) .modal-container {
  background: #1e293b;
}

:global(.dark) .modal-header {
  background: #334155;
  border-color: #475569;
}

:global(.dark) .modal-title {
  color: #f1f5f9;
}

:global(.dark) .modal-close {
  color: #94a3b8;
}

:global(.dark) .modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

:global(.dark) .modal-footer {
  background: #334155;
  border-color: #475569;
}

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
