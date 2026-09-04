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
  gap: var(--sp-2);
  border: none;
  border-radius: var(--control-radius);
  font-weight: 500;
  letter-spacing: -0.005em;
  cursor: pointer;
  /* 只換顏色，不位移：按鈕不該在游標下跳動 */
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
  white-space: nowrap;
}

.base-button:active:not(.disabled) {
  transform: scale(0.985);
}

/* 尺寸：只有三種高度 30 / 36 / 44 */
.base-button.sm { height: var(--control-h-sm); padding: 0 var(--sp-3); font-size: var(--text-xs); border-radius: var(--radius-sm); }
.base-button.md { height: var(--control-h); padding: 0 var(--sp-4); font-size: var(--text-sm); }
.base-button.lg { height: var(--control-h-lg); padding: 0 var(--sp-5); font-size: var(--text-md); }

/* 變體：實色填滿，不用漸層。層級靠明度差，不靠光暈。
   綠色塊配深字（--on-primary），語意色塊配近白字（--on-solid）。 */
.base-button.primary {
  background: var(--primary-solid);
  color: var(--on-primary);
}
.base-button.primary:hover:not(.disabled) {
  background: var(--primary-solid-hover);
}

/* secondary 是「安靜的預設」：紙面 + 髮絲線 */
.base-button.secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.base-button.secondary:hover:not(.disabled) {
  background: var(--bg-muted);
}

.base-button.success {
  background: var(--success-solid);
  color: var(--on-solid);
}
.base-button.success:hover:not(.disabled) {
  background: var(--success-solid-hover);
}

.base-button.warning {
  background: var(--warning-solid);
  color: var(--on-solid);
}
.base-button.warning:hover:not(.disabled) {
  background: var(--warning-solid-hover);
}

.base-button.danger {
  background: var(--danger-solid);
  color: var(--on-solid);
}
.base-button.danger:hover:not(.disabled) {
  background: var(--danger-solid-hover);
}

.base-button.ghost {
  background: transparent;
  color: var(--text-secondary);
}
.base-button.ghost:hover:not(.disabled) {
  background: var(--surface-hover);
  color: var(--text-primary);
  box-shadow: none;
}

/* 邊框保持 2px 佔位（尺寸不變），描邊改用 1px inset 髮絲線 */
.base-button.outline {
  background: transparent;
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary) 60%, transparent);
  color: var(--primary-text);
}
.base-button.outline:hover:not(.disabled) {
  background: var(--primary-muted);
  color: var(--primary-text);
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
  font-size: 1.05em;
  line-height: 1;
}

/* 暗黑模式：變體本身已全部走 token，只需微調中性面 */
:global(.dark) .base-button.secondary {
  background: var(--bg-muted);
}
:global(.dark) .base-button.secondary:hover:not(.disabled) {
  background: var(--bg-elevated);
}
</style>
