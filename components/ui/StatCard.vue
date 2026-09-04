<template>
  <div 
    class="stat-card" 
    :class="[variant, { 'clickable': clickable }]"
    @click="clickable && $emit('click')"
  >
    <div class="stat-icon">
      <span class="icon">{{ icon }}</span>
    </div>
    
    <div class="stat-content">
      <h3 class="stat-title">{{ title }}</h3>
      <div class="stat-number">{{ formattedValue }}</div>
      <div class="stat-label">{{ label }}</div>
      
      <div v-if="$slots.alert" class="stat-alert">
        <slot name="alert" />
      </div>
    </div>
    
    <div class="stat-trend">
      <span class="trend-icon">{{ trendIcon }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [Number, String], required: true },
  label: { type: String, default: '' },
  icon: { type: String, default: '📊' },
  trendIcon: { type: String, default: '📈' },
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger'].includes(v)
  },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  clickable: { type: Boolean, default: false }
})

defineEmits(['click'])

const formattedValue = computed(() => {
  return `${props.prefix}${props.value}${props.suffix}`
})
</script>

<style scoped>
.stat-card {
  background: var(--bg-surface);
  padding: var(--sp-4);
  border-radius: var(--card-radius);
  box-shadow: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  border: 1px solid var(--border-subtle);
}

/* 頂部漸層條移除：語意色改由圖示磚承載，卡片保持安靜 */

.stat-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--elevation-2);
}

.stat-card.clickable {
  cursor: pointer;
}

/* 變體：只給一個色相，磚體用淡染、字用實色 */
.stat-card.default {
  --card-tone: var(--text-secondary);
}

.stat-card.primary {
  --card-tone: var(--primary);
}

.stat-card.success {
  --card-tone: var(--success);
}

.stat-card.warning {
  --card-tone: var(--warning);
}

.stat-card.danger {
  --card-tone: var(--danger);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--card-tone) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--card-tone) 22%, transparent);
  flex-shrink: 0;
}

.stat-icon .icon {
  font-size: var(--text-xl);
  color: var(--card-tone);
}

.stat-content {
  flex: 1;
  text-align: left;
}

/* 標題退成小字標籤，讓數字成為唯一的視覺重點 */
.stat-title {
  font-family: var(--font-mono);
  color: var(--text-muted);
  margin-bottom: var(--sp-1);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}

.stat-number {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
  margin-bottom: 2px;
  line-height: 1.1;
}

.stat-label {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 400;
}

.stat-alert {
  margin-top: var(--sp-2);
}

.stat-trend {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-muted);
  flex-shrink: 0;
}

.trend-icon {
  font-size: var(--text-md);
  color: var(--text-muted);
}

/* 暗黑模式：卡面走 token，深色下不再用漸層底 */
:global(.dark) .stat-card {
  background: var(--bg-surface);
  border-color: var(--border-subtle);
}

/* 響應式 */
@media (max-width: 768px) {
  .stat-card {
    padding: var(--sp-3);
  }

  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .stat-icon .icon {
    font-size: var(--text-lg);
  }

  .stat-number {
    font-size: var(--text-xl);
  }
}

@media (max-width: 480px) {
  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: var(--sp-3);
  }
  
  .stat-content {
    text-align: center;
  }
}
</style>
