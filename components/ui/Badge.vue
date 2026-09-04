<template>
  <span class="badge" :class="[variant, size]">
    <span v-if="dot" class="badge-dot"></span>
    <slot />
  </span>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  dot: { type: Boolean, default: false }
})
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: var(--radius-full);
  font-weight: 500;
  letter-spacing: 0.005em;
  white-space: nowrap;
  /* 淡染底 + 同色髮絲環，讓標籤在白卡上有邊界又不吵 */
  box-shadow: inset 0 0 0 1px color-mix(in oklab, currentColor 22%, transparent);
}

/* 尺寸：高度固定，排在表格列裡不會把列撐高 */
.badge.sm { height: 18px; padding: 0 var(--sp-2); font-size: var(--text-2xs); }
.badge.md { height: 22px; padding: 0 9px; font-size: var(--text-xs); }
.badge.lg { height: 26px; padding: 0 var(--sp-3); font-size: var(--text-sm); }

/* 變體 */
.badge.default {
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.badge.primary {
  background: var(--primary-light);
  color: var(--primary-text);
}

.badge.success {
  background: var(--success-light);
  color: var(--success-text);
}

.badge.warning {
  background: var(--warning-light);
  color: var(--warning-text);
}

.badge.danger {
  background: var(--danger-light);
  color: var(--danger-text);
}

.badge.info {
  background: var(--info-light);
  color: var(--info-text);
}

.badge-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 50%;
  background: currentColor;
}

/* 暗黑模式由 token 自動翻轉，不需要另一套硬寫色 */
</style>
