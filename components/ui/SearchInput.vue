<template>
  <div class="search-input-wrapper">
    <span class="search-icon">🔍</span>
    <input
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      class="search-input"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="$emit('search', modelValue)"
    />
    <button 
      v-if="modelValue && clearable" 
      class="clear-btn"
      @click="handleClear"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜尋...' },
  clearable: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear'])

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style scoped>
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  font-size: 1rem;
  color: var(--text-muted, #999);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.75rem;
  border: 2px solid var(--border-color, #e1e8ed);
  border-radius: 25px;
  font-size: 1rem;
  color: var(--text-primary, #2c3e50);
  background: var(--bg-secondary, #ffffff);
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary, #3b82f6);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: var(--text-muted, #999);
}

.clear-btn {
  position: absolute;
  right: 0.75rem;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--bg-tertiary, #f8f9fa);
  color: var(--text-secondary, #666);
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background: var(--danger, #ef4444);
  color: white;
}

/* 暗黑模式 */
:global(.dark) .search-input {
  background: #1e293b;
  border-color: #475569;
  color: #f1f5f9;
}

:global(.dark) .search-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.1);
}

:global(.dark) .search-input::placeholder {
  color: #94a3b8;
}

:global(.dark) .search-icon {
  color: #94a3b8;
}

:global(.dark) .clear-btn {
  background: #334155;
  color: #94a3b8;
}

:global(.dark) .clear-btn:hover {
  background: #f87171;
  color: white;
}
</style>
