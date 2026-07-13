<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '📭' },
  title: { type: String, default: '沒有資料' },
  description: { type: String, default: '' }
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.8;
}

.empty-title {
  color: var(--text-primary, #2c3e50);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.empty-description {
  color: var(--text-secondary, #666);
  font-size: 0.95rem;
  margin: 0 0 1.5rem;
  max-width: 400px;
}

.empty-action {
  margin-top: 1rem;
}

/* 暗黑模式 */
:global(.dark) .empty-title {
  color: #f1f5f9;
}

:global(.dark) .empty-description {
  color: #94a3b8;
}
</style>
