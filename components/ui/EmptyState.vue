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
  padding: var(--sp-12) var(--sp-8);
  text-align: center;
}

.empty-icon {
  font-size: 2.25rem;
  margin-bottom: var(--sp-3);
  opacity: 0.4;
}

.empty-title {
  font-family: var(--font-display);
  color: var(--text-primary);
  font-size: var(--text-md);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  margin: 0 0 var(--sp-2);
}

.empty-description {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0 0 var(--sp-4);
  max-width: 38ch;
  line-height: var(--leading-body);
}

.empty-action {
  margin-top: var(--sp-2);
}

/* 暗黑模式由 token 自動翻轉 */
</style>
