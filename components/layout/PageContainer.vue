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
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary, #2c3e50);
  margin: 0;
}

.page-icon {
  font-size: 1.5rem;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

/* 暗黑模式 */
:global(.dark) .page-title {
  color: #f1f5f9;
}

/* 響應式 */
@media (max-width: 768px) {
  .page-header {
    margin-bottom: 1.5rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.3rem;
  }
  
  .page-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
