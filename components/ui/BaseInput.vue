<template>
  <div class="base-input-wrapper" :class="{ 'has-error': error, 'disabled': disabled }">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    
    <div class="input-container">
      <span v-if="icon" class="input-icon">{{ icon }}</span>
      
      <input
        v-if="type !== 'textarea'"
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        class="base-input"
        :class="{ 'has-icon': icon }"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      
      <textarea
        v-else
        :id="inputId"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :rows="rows"
        class="base-input base-textarea"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
    </div>
    
    <p v-if="error" class="input-error">{{ error }}</p>
    <p v-else-if="hint" class="input-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  rows: { type: Number, default: 3 },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined }
})

defineEmits(['update:modelValue', 'blur', 'focus'])

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)
</script>

<style scoped>
.base-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.required-mark {
  color: #ef4444;
  margin-left: 0.25rem;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  font-size: 1.1rem;
  color: var(--text-secondary, #666);
  z-index: 1;
}

.base-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid var(--border-color, #e1e8ed);
  border-radius: 12px;
  font-size: 1rem;
  color: var(--text-primary, #2c3e50);
  background: var(--bg-secondary, #ffffff);
  transition: all 0.3s ease;
}

.base-input.has-icon {
  padding-left: 3rem;
}

.base-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.base-input::placeholder {
  color: var(--text-muted, #999);
}

.base-textarea {
  resize: vertical;
  min-height: 100px;
}

.has-error .base-input {
  border-color: #ef4444;
}

.has-error .base-input:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.disabled .base-input {
  background: var(--bg-tertiary, #f8f9fa);
  cursor: not-allowed;
  opacity: 0.7;
}

.input-error {
  font-size: 0.85rem;
  color: #ef4444;
  margin: 0;
}

.input-hint {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
  margin: 0;
}

/* 暗黑模式 */
:global(.dark) .input-label {
  color: #f1f5f9;
}

:global(.dark) .base-input {
  background: #1e293b;
  border-color: #475569;
  color: #f1f5f9;
}

:global(.dark) .base-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.1);
}

:global(.dark) .base-input::placeholder {
  color: #94a3b8;
}

:global(.dark) .input-icon {
  color: #94a3b8;
}

:global(.dark) .input-hint {
  color: #94a3b8;
}
</style>
