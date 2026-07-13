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
  background: var(--bg-secondary, #ffffff);
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border: 1px solid var(--border-color, #e1e8ed);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--card-color-start), var(--card-color-end));
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px var(--card-shadow);
}

.stat-card.clickable {
  cursor: pointer;
}

/* 變體顏色 */
.stat-card.default {
  --card-color-start: #6b7280;
  --card-color-end: #4b5563;
  --card-shadow: rgba(107, 114, 128, 0.3);
}

.stat-card.primary {
  --card-color-start: #3b82f6;
  --card-color-end: #1d4ed8;
  --card-shadow: rgba(59, 130, 246, 0.3);
}

.stat-card.success {
  --card-color-start: #10b981;
  --card-color-end: #047857;
  --card-shadow: rgba(16, 185, 129, 0.3);
}

.stat-card.warning {
  --card-color-start: #f59e0b;
  --card-color-end: #d97706;
  --card-shadow: rgba(245, 158, 11, 0.3);
}

.stat-card.danger {
  --card-color-start: #ef4444;
  --card-color-end: #dc2626;
  --card-shadow: rgba(239, 68, 68, 0.3);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--card-color-start), var(--card-color-end));
  flex-shrink: 0;
}

.stat-icon .icon {
  font-size: 1.8rem;
  color: white;
}

.stat-content {
  flex: 1;
  text-align: left;
}

.stat-title {
  color: var(--text-primary, #2c3e50);
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-number {
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--card-color-start), var(--card-color-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
  line-height: 1;
}

.stat-label {
  color: var(--text-secondary, #666);
  font-size: 0.85rem;
  font-weight: 500;
}

.stat-alert {
  margin-top: 0.5rem;
}

.stat-trend {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.trend-icon {
  font-size: 1.2rem;
  color: var(--text-secondary, #666);
}

/* 暗黑模式 */
:global(.dark) .stat-card {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
}

:global(.dark) .stat-title {
  color: #cbd5e1;
}

:global(.dark) .stat-number {
  background: none;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: unset;
  background-clip: unset;
  color: #60a5fa;
}

:global(.dark) .stat-label {
  color: #94a3b8;
}

:global(.dark) .stat-trend {
  background: rgba(255, 255, 255, 0.1);
}

:global(.dark) .trend-icon {
  color: #94a3b8;
}

/* 響應式 */
@media (max-width: 768px) {
  .stat-card {
    padding: 1.5rem;
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
  }
  
  .stat-icon .icon {
    font-size: 1.5rem;
  }
  
  .stat-number {
    font-size: 1.8rem;
  }
}

@media (max-width: 480px) {
  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .stat-content {
    text-align: center;
  }
}
</style>
