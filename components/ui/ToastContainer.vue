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
  gap: 0.75rem;
  max-width: 400px;
  pointer-events: none;
}

.toast-container.top-right { top: 1.5rem; right: 1.5rem; }
.toast-container.top-left { top: 1.5rem; left: 1.5rem; }
.toast-container.bottom-right { bottom: 1.5rem; right: 1.5rem; flex-direction: column-reverse; }
.toast-container.bottom-left { bottom: 1.5rem; left: 1.5rem; flex-direction: column-reverse; }

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  pointer-events: auto;
}

.toast.info { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; }
.toast.success { background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; }
.toast.warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
.toast.error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; }

.toast-icon { font-size: 1.25rem; flex-shrink: 0; }
.toast-message { margin: 0; font-size: 0.95rem; font-weight: 500; flex: 1; }

.toast-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: background 0.3s ease;
  flex-shrink: 0;
}

.toast-close:hover { background: rgba(255, 255, 255, 0.3); }

/* 動畫 */
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.3s ease;
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.toast-container.top-left .toast-list-enter-from,
.toast-container.bottom-left .toast-list-enter-from,
.toast-container.top-left .toast-list-leave-to,
.toast-container.bottom-left .toast-list-leave-to {
  transform: translateX(-100px);
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
