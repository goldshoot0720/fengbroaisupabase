<template>
  <div class="page-container" :class="{ 'with-padding': padding }">
    <div v-if="title || $slots.header" class="page-header">
      <slot name="header">
        <h1 v-if="title" class="page-title">
          <span v-if="icon" class="page-icon">{{ icon }}</span>
          {{ title }}
        </h1>
      </slot>
      <div v-if="$slots.actions" class="page-actions">
        <slot name="actions" />
      </div>
    </div>
    
    <div class="page-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  padding: { type: Boolean, default: true }
})
</script>

<style scoped>
.page-container {
  animation: fadeIn 0.3s ease-in;
  min-height: 100%;
}

.page-container.with-padding {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
  margin: 0;
}

.page-icon {
  font-size: var(--text-lg);
}

.page-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.page-body {
  width: 100%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 暗黑模式由 token 自動翻轉 */

/* 響應式 */
@media (max-width: 768px) {
  .page-container.with-padding {
    padding: 0;
  }

  .page-header {
    margin-bottom: var(--sp-4);
    gap: var(--sp-3);
    align-items: flex-start;
  }

  .page-title {
    font-size: var(--text-lg);
    line-height: 1.25;
    letter-spacing: var(--tracking-tight);
  }

  .page-icon {
    font-size: var(--text-md);
  }

  .page-actions {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    gap: var(--sp-2);
    padding-bottom: 0.15rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .page-actions::-webkit-scrollbar {
    display: none;
  }
}

@media (max-width: 480px) {
  .page-header {
    margin-bottom: var(--sp-3);
  }

  .page-title {
    font-size: var(--text-lg);
  }

  .page-actions {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-container {
    animation: none;
  }
}
</style>
