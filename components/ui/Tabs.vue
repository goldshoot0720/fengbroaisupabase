<template>
  <div class="tabs-wrapper">
    <div class="tabs-header" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: modelValue === tab.id }"
        role="tab"
        :aria-selected="modelValue === tab.id"
        @click="$emit('update:modelValue', tab.id)"
      >
        <span v-if="tab.icon" class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>
    
    <div class="tabs-content">
      <slot :name="modelValue" />
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  tabs: {
    type: Array,
    required: true,
    validator: (tabs) => tabs.every(tab => tab.id && tab.label)
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.tabs-wrapper {
  width: 100%;
}

.tabs-header {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--border-color, #e1e8ed);
  margin-bottom: 1.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs-header::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary, #666);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  white-space: nowrap;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary, #3b82f6);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.tab-btn:hover {
  color: var(--text-primary, #2c3e50);
}

.tab-btn.active {
  color: var(--primary, #3b82f6);
}

.tab-btn.active::after {
  transform: scaleX(1);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-badge {
  background: var(--primary, #3b82f6);
  color: white;
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.tabs-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 暗黑模式 */
:global(.dark) .tabs-header {
  border-color: #475569;
}

:global(.dark) .tab-btn {
  color: #94a3b8;
}

:global(.dark) .tab-btn:hover {
  color: #f1f5f9;
}

:global(.dark) .tab-btn.active {
  color: #60a5fa;
}

:global(.dark) .tab-btn.active::after {
  background: #60a5fa;
}

:global(.dark) .tab-badge {
  background: #60a5fa;
}

/* 響應式 */
@media (max-width: 768px) {
  .tab-btn {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .tab-btn {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }
  
  .tab-icon {
    font-size: 1rem;
  }
}
</style>
