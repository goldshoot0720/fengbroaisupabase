<template>
  <button 
    class="base-button" 
    :class="[variant, size, { 'loading': loading, 'disabled': disabled, 'full-width': fullWidth }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="button-spinner">⏳</span>
    <span v-if="icon && !loading" class="button-icon">{{ icon }}</span>
    <span class="button-text"><slot /></span>
  </button>
</template>

<script setup>
defineProps({
  variant: { 
    type: String, 
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'outline'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  icon: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  fullWidth: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.base-button:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.base-button:active:not(.disabled) {
  transform: translateY(0);
}

/* 尺寸 */
.base-button.sm { padding: 0.5rem 1rem; font-size: 0.875rem; }
.base-button.md { padding: 0.75rem 1.5rem; font-size: 1rem; }
.base-button.lg { padding: 1rem 2rem; font-size: 1.125rem; }

/* 變體 */
.base-button.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}
.base-button.primary:hover:not(.disabled) {
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
}

.base-button.secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
}

.base-button.success {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
}
.base-button.success:hover:not(.disabled) {
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.base-button.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.base-button.danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}
.base-button.danger:hover:not(.disabled) {
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
}

.base-button.ghost {
  background: transparent;
  color: var(--text-primary, #2c3e50);
}
.base-button.ghost:hover:not(.disabled) {
  background: var(--bg-tertiary, #f8f9fa);
  box-shadow: none;
}

.base-button.outline {
  background: transparent;
  border: 2px solid #3b82f6;
  color: #3b82f6;
}
.base-button.outline:hover:not(.disabled) {
  background: #3b82f6;
  color: white;
}

/* 狀態 */
.base-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-button.loading {
  cursor: wait;
}

.base-button.full-width {
  width: 100%;
}

.button-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.button-icon {
  font-size: 1.1em;
}

/* 暗黑模式 */
:global(.dark) .base-button.ghost {
  color: var(--text-primary, #f1f5f9);
}
:global(.dark) .base-button.ghost:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
}
:global(.dark) .base-button.outline {
  border-color: #60a5fa;
  color: #60a5fa;
}
</style>
