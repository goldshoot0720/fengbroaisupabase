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
  gap: 0.35rem;
  border-radius: 20px;
  font-weight: 600;
}

/* 尺寸 */
.badge.sm { padding: 0.15rem 0.5rem; font-size: 0.7rem; }
.badge.md { padding: 0.25rem 0.75rem; font-size: 0.8rem; }
.badge.lg { padding: 0.35rem 1rem; font-size: 0.9rem; }

/* 變體 */
.badge.default {
  background: var(--bg-tertiary, #f8f9fa);
  color: var(--text-secondary, #666);
}

.badge.primary {
  background: var(--primary-light, rgba(59, 130, 246, 0.1));
  color: var(--primary, #3b82f6);
}

.badge.success {
  background: var(--success-light, rgba(16, 185, 129, 0.1));
  color: var(--success, #10b981);
}

.badge.warning {
  background: var(--warning-light, rgba(245, 158, 11, 0.1));
  color: var(--warning, #f59e0b);
}

.badge.danger {
  background: var(--danger-light, rgba(239, 68, 68, 0.1));
  color: var(--danger, #ef4444);
}

.badge.info {
  background: var(--info-light, rgba(6, 182, 212, 0.1));
  color: var(--info, #06b6d4);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* 暗黑模式 */
:global(.dark) .badge.default {
  background: #334155;
  color: #94a3b8;
}

:global(.dark) .badge.primary {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

:global(.dark) .badge.success {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
}

:global(.dark) .badge.warning {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

:global(.dark) .badge.danger {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

:global(.dark) .badge.info {
  background: rgba(34, 211, 238, 0.2);
  color: #22d3ee;
}
</style>
