<template>
  <div class="recent-search-input">
    <form
      role="search"
      class="recent-search-form"
      @submit.prevent="handleSubmit"
    >
      <input
        :value="modelValue"
        type="text"
        class="search-input"
        :placeholder="placeholder"
        enterkeyhint="search"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.esc.prevent="clearQuery"
      >
      <button
        v-if="modelValue"
        type="button"
        class="search-clear"
        aria-label="清除搜尋內容"
        title="清除搜尋內容"
        @click="clearQuery"
      >×</button>
      <button
        type="submit"
        class="search-submit"
        aria-label="提交搜尋"
      >提交</button>
    </form>
    <RecentSearchChips
      :terms="terms"
      @apply="$emit('apply', $event)"
      @remove="$emit('remove', $event)"
      @clear="$emit('clear')"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜尋' },
  terms: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'submit', 'apply', 'remove', 'clear'])

const handleSubmit = () => {
  emit('submit', String(props.modelValue || '').trim())
}

const clearQuery = () => {
  emit('update:modelValue', '')
  emit('submit', '')
}
</script>

<style scoped>
.recent-search-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.search-input {
  flex: 1;
  min-width: 0;
}

.search-clear,
.search-submit {
  border: 1px solid var(--border-subtle, var(--border-color, #dfe5ec));
  background: var(--bg-surface, var(--bg-secondary, #fff));
  color: var(--text-primary, #2c3e50);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  border-radius: 10px;
  padding: 0.7rem 0.9rem;
}

.search-clear {
  width: 2.4rem;
  padding: 0.7rem 0;
}

.search-submit {
  background: var(--text-primary, #2c3e50);
  color: var(--bg-primary, #fff);
  border-color: transparent;
}

.search-clear:hover,
.search-submit:hover {
  opacity: 0.9;
}
</style>
