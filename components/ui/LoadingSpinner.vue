<template>
  <div class="loading-spinner" :class="[size]">
    <div class="spinner"></div>
    <p v-if="text" class="loading-text">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  text: { type: String, default: '' }
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.spinner {
  border-radius: 50%;
  border-style: solid;
  border-color: var(--primary, #3b82f6);
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

/* 尺寸 */
.loading-spinner.sm .spinner {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

.loading-spinner.md .spinner {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.loading-spinner.lg .spinner {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

.loading-text {
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
  margin: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
