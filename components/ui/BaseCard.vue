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
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--card-radius);
  overflow: hidden;
  /* 靜止＝零陰影。只有 hover 才微微浮起 */
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.base-card.hoverable:hover {
  border-color: var(--border-strong);
  box-shadow: var(--elevation-2);
}

.base-card.clickable {
  cursor: pointer;
}

/* 變體：頂邊色條保留 4px 佔位不變，改用降彩度的語意色，不搶內容 */
.base-card.primary { border-top: 4px solid var(--primary); }
.base-card.success { border-top: 4px solid color-mix(in oklab, var(--success) 62%, var(--bg-surface)); }
.base-card.warning { border-top: 4px solid color-mix(in oklab, var(--warning) 62%, var(--bg-surface)); }
.base-card.danger { border-top: 4px solid color-mix(in oklab, var(--danger) 62%, var(--bg-surface)); }
.base-card.info { border-top: 4px solid color-mix(in oklab, var(--info) 62%, var(--bg-surface)); }

.card-header {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.header-icon {
  font-size: var(--text-lg);
}

.header-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}

.card-body {
  padding: var(--card-pad);
}

.card-footer {
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-muted);
}

/* 響應式 */
@media (max-width: 768px) {
  .card-header, .card-body, .card-footer {
    padding: var(--sp-3);
  }
}
</style>
