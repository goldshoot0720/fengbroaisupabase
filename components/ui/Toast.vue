<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="[variant, position]">
        <span class="toast-icon">{{ iconMap[variant] }}</span>
        <div class="toast-content">
          <p class="toast-message">{{ message }}</p>
        </div>
        <button v-if="closable" class="toast-close" @click="close">✕</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  message: { type: String, default: '' },
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'warning', 'error'].includes(v)
  },
  position: {
    type: String,
    default: 'top-right',
    validator: (v) => ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'].includes(v)
  },
  duration: { type: Number, default: 3000 },
  closable: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = ref(props.modelValue)
let timer = null

const iconMap = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
}

const close = () => {
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}

const startTimer = () => {
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
}

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    clearTimer()
    startTimer()
  }
})

onMounted(() => {
  if (visible.value) {
    startTimer()
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  max-width: 400px;
}

/* 位置 */
.toast.top-right { top: 1.5rem; right: 1.5rem; }
.toast.top-left { top: 1.5rem; left: 1.5rem; }
.toast.bottom-right { bottom: 1.5rem; right: 1.5rem; }
.toast.bottom-left { bottom: 1.5rem; left: 1.5rem; }
.toast.top-center { top: 1.5rem; left: 50%; transform: translateX(-50%); }
.toast.bottom-center { bottom: 1.5rem; left: 50%; transform: translateX(-50%); }

/* 變體 */
.toast.info {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.toast.success {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
}

.toast.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.toast.error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.toast-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
}

.toast-message {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
}

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

.toast-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 動畫 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.toast.top-left .toast-enter-from,
.toast.bottom-left .toast-enter-from {
  transform: translateX(-100px);
}

.toast.top-left .toast-leave-to,
.toast.bottom-left .toast-leave-to {
  transform: translateX(-100px);
}

.toast.top-center .toast-enter-from,
.toast.bottom-center .toast-enter-from {
  transform: translateX(-50%) translateY(-20px);
}

.toast.top-center .toast-leave-to,
.toast.bottom-center .toast-leave-to {
  transform: translateX(-50%) translateY(-20px);
}

/* 響應式 */
@media (max-width: 480px) {
  .toast {
    left: 1rem !important;
    right: 1rem !important;
    max-width: none;
    transform: none !important;
  }
  
  .toast.top-center,
  .toast.bottom-center {
    transform: none !important;
  }
}
</style>
