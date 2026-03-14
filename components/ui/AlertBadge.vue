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
  gap: 0.25rem;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
}

/* 尺寸 */
.alert-badge.sm {
  padding: 0.15rem 0.5rem;
  font-size: 0.7rem;
}

.alert-badge.md {
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
}

.alert-badge.lg {
  padding: 0.3rem 0.8rem;
  font-size: 0.85rem;
}

/* 變體 */
.alert-badge.info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-left: 3px solid #3b82f6;
}

.alert-badge.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-left: 3px solid #10b981;
}

.alert-badge.warning {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
  border-left: 3px solid #f39c12;
}

.alert-badge.critical {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border-left: 3px solid #e74c3c;
}

.alert-badge.neutral {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border-left: 3px solid #6b7280;
}

.badge-icon {
  font-size: 0.9em;
}

/* 暗黑模式 */
:global(.dark) .alert-badge.info {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

:global(.dark) .alert-badge.success {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
}

:global(.dark) .alert-badge.warning {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

:global(.dark) .alert-badge.critical {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

:global(.dark) .alert-badge.neutral {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}
</style>
