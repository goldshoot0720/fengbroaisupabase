<template>
  <Teleport to="body">
    <div class="toast-container" :class="position">
      <TransitionGroup name="toast-list">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="toast.variant"
        >
          <span class="toast-icon">{{ iconMap[toast.variant] }}</span>
          <p class="toast-message">{{ toast.message }}</p>
          <button 
            v-if="toast.closable" 
            class="toast-close" 
            @click="removeToast(toast.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../../composables/useToast'

defineProps({
  position: {
    type: String,
    default: 'top-right',
    validator: (v) => ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(v)
  }
})

const { toasts, removeToast } = useToast()

const iconMap = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  max-width: min(400px, calc(100vw - 2rem));
  max-height: min(70vh, 520px);
  overflow-y: auto;
  pointer-events: none;
}

.toast-container.top-right { top: 1.5rem; right: 1.5rem; }
.toast-container.top-left { top: 1.5rem; left: 1.5rem; }
.toast-container.bottom-right { bottom: 1.5rem; right: 1.5rem; flex-direction: column-reverse; }
.toast-container.bottom-left { bottom: 1.5rem; left: 1.5rem; flex-direction: column-reverse; }

/* Toast 是紙卡不是色塊：語意色只出現在左緣色條與圖示，訊息本身維持高可讀性 */
.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  box-shadow:
    inset 3px 0 0 var(--toast-tone),
    var(--elevation-3);
  pointer-events: auto;
}

.toast.info { --toast-tone: var(--info); }
.toast.success { --toast-tone: var(--success); }
.toast.warning { --toast-tone: var(--warning); }
.toast.error { --toast-tone: var(--danger); }

.toast-icon {
  font-size: var(--text-md);
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 1px;
  color: var(--toast-tone);
}
.toast-message {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 400;
  flex: 1;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.toast-close {
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  width: 24px;
  height: 24px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
  flex-shrink: 0;
}

.toast-close:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

/* 動畫 */
.toast-list-enter-active,
.toast-list-leave-active {
  transition:
    opacity var(--duration-normal) var(--ease-standard),
    transform var(--duration-normal) var(--ease-standard);
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.toast-container.top-left .toast-list-enter-from,
.toast-container.bottom-left .toast-list-enter-from,
.toast-container.top-left .toast-list-leave-to,
.toast-container.bottom-left .toast-list-leave-to {
  transform: translateX(-24px);
}

/* 響應式 */
@media (max-width: 480px) {
  .toast-container {
    left: 1rem !important;
    right: 1rem !important;
    max-width: none;
  }
}
</style>
