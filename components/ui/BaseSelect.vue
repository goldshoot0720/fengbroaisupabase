<template>
  <div class="base-select-wrapper" :class="{ 'has-error': error, 'disabled': disabled }">
    <label v-if="label" :for="selectId" class="select-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    
    <div class="select-container">
      <span v-if="icon" class="select-icon">{{ icon }}</span>
      
      <select
        :id="selectId"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        class="base-select"
        :class="{ 'has-icon': icon }"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option 
          v-for="option in normalizedOptions" 
          :key="option.value" 
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      
      <span class="select-arrow">▼</span>
    </div>
    
    <p v-if="error" class="select-error">{{ error }}</p>
    <p v-else-if="hint" class="select-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false }
})

defineEmits(['update:modelValue'])

const selectId = computed(() => `select-${Math.random().toString(36).substr(2, 9)}`)

const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'object') {
      return { value: opt.value, label: opt.label || opt.value }
    }
    return { value: opt, label: opt }
  })
})
</script>

<style scoped>
.base-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.required-mark {
  color: #ef4444;
  margin-left: 0.25rem;
}

.select-container {
  position: relative;
  display: flex;
  align-items: center;
}

.select-icon {
  position: absolute;
  left: 1rem;
  font-size: 1.1rem;
  color: var(--text-secondary, #666);
  z-index: 1;
  pointer-events: none;
}

.base-select {
  width: 100%;
  padding: 0.875rem 2.5rem 0.875rem 1rem;
  border: 2px solid var(--border-color, #e1e8ed);
  border-radius: 12px;
  font-size: 1rem;
  color: var(--text-primary, #2c3e50);
  background: var(--bg-secondary, #ffffff);
  cursor: pointer;
  appearance: none;
  transition: all 0.3s ease;
}

.base-select.has-icon {
  padding-left: 3rem;
}

.base-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.select-arrow {
  position: absolute;
  right: 1rem;
  font-size: 0.7rem;
  color: var(--text-secondary, #666);
  pointer-events: none;
  transition: transform 0.3s ease;
}

.base-select:focus + .select-arrow {
  transform: rotate(180deg);
}

.has-error .base-select {
  border-color: #ef4444;
}

.disabled .base-select {
  background: var(--bg-tertiary, #f8f9fa);
  cursor: not-allowed;
  opacity: 0.7;
}

.select-error {
  font-size: 0.85rem;
  color: #ef4444;
  margin: 0;
}

.select-hint {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
  margin: 0;
}

/* 暗黑模式 */
:global(.dark) .select-label {
  color: #f1f5f9;
}

:global(.dark) .base-select {
  background: #1e293b;
  border-color: #475569;
  color: #f1f5f9;
}

:global(.dark) .base-select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.1);
}

:global(.dark) .select-icon,
:global(.dark) .select-arrow {
  color: #94a3b8;
}

:global(.dark) .select-hint {
  color: #94a3b8;
}

:global(.dark) .base-select option {
  background: #1e293b;
  color: #f1f5f9;
}
</style>
