<template>
  <span class="alert-badge" :class="[variant, size]">
    <span v-if="icon" class="badge-icon">{{ icon }}</span>
    <span class="badge-text"><slot /></span>
  </span>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'warning', 'critical', 'neutral'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  icon: { type: String, default: '' }
})
</script>

<style scoped>
.alert-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  border-radius: var(--radius-sm);
  font-weight: 500;
  white-space: nowrap;
  --alert-tone: var(--info);
  --alert-ink: var(--info-text);
  background: color-mix(in oklab, var(--alert-tone) 14%, transparent);
  color: var(--alert-ink);
  border-left: 3px solid var(--alert-tone);
}

/* 尺寸：高度固定，跟 Badge 對齊 */
.alert-badge.sm {
  height: 18px;
  padding: 0 var(--sp-2);
  font-size: var(--text-2xs);
}

.alert-badge.md {
  height: 22px;
  padding: 0 9px;
  font-size: var(--text-xs);
}

.alert-badge.lg {
  height: 26px;
  padding: 0 var(--sp-3);
  font-size: var(--text-sm);
}

/* 變體：只換色相，其餘由上面的 --alert-tone 統一推導 */
.alert-badge.info { --alert-tone: var(--info); --alert-ink: var(--info-text); }
.alert-badge.success { --alert-tone: var(--success); --alert-ink: var(--success-text); }
.alert-badge.warning { --alert-tone: var(--warning); --alert-ink: var(--warning-text); }
.alert-badge.critical { --alert-tone: var(--danger); --alert-ink: var(--danger-text); }
.alert-badge.neutral { --alert-tone: var(--text-muted); --alert-ink: var(--text-secondary); }

.badge-icon {
  font-size: 0.9em;
}

/* 暗黑模式由 token 自動翻轉 */
</style>
