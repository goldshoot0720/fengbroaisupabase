<template>
  <div 
    class="base-card" 
    :class="[variant, { 'hoverable': hoverable, 'clickable': clickable }]"
    @click="clickable && $emit('click')"
  >
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <div class="header-content">
          <span v-if="icon" class="header-icon">{{ icon }}</span>
          <h3 v-if="title" class="header-title">{{ title }}</h3>
        </div>
        <div v-if="$slots.actions" class="header-actions">
          <slot name="actions" />
        </div>
      </slot>
    </div>
    
    <div class="card-body">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  variant: { 
    type: String, 
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v)
  },
  hoverable: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<style scoped>
.base-card {
  background: var(--bg-secondary, #ffffff);
  border: 1px solid var(--border-color, #e1e8ed);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.base-card.hoverable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.base-card.clickable {
  cursor: pointer;
}

/* 變體樣式 */
.base-card.primary { border-top: 4px solid #3b82f6; }
.base-card.success { border-top: 4px solid #10b981; }
.base-card.warning { border-top: 4px solid #f59e0b; }
.base-card.danger { border-top: 4px solid #ef4444; }
.base-card.info { border-top: 4px solid #06b6d4; }

.card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #e1e8ed);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-tertiary, #f8f9fa);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.card-body {
  padding: 1.5rem;
}

.card-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color, #e1e8ed);
  background: var(--bg-tertiary, #f8f9fa);
}

/* 響應式 */
@media (max-width: 768px) {
  .card-header, .card-body, .card-footer {
    padding: 1rem;
  }
}
</style>
