<template>
  <div
    v-if="terms.length > 0"
    class="recent-searches"
    aria-label="最近搜尋紀錄"
  >
    <span class="recent-label">最近搜尋</span>
    <span
      v-for="term in terms"
      :key="term"
      class="recent-chip"
    >
      <button
        type="button"
        class="recent-chip-text"
        @click="$emit('apply', term)"
      >
        {{ term }}
      </button>
      <button
        type="button"
        class="recent-chip-remove"
        :aria-label="`移除搜尋紀錄 ${term}`"
        @click="$emit('remove', term)"
      >
        X
      </button>
    </span>
    <button
      type="button"
      class="recent-clear"
      @click="$emit('clear')"
    >
      清除
    </button>
  </div>
</template>

<script setup>
defineProps({
  terms: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['apply', 'remove', 'clear'])
</script>

<style scoped>
.recent-searches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  width: 100%;
}

.recent-label {
  color: var(--text-muted, #7f8c8d);
  font-size: 0.82rem;
  font-weight: 600;
}

.recent-clear {
  border: 1px solid var(--border-subtle, #dfe5ec);
  border-radius: 999px;
  background: var(--bg-surface, #fff);
  color: var(--text-primary, #2c3e50);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 0.35rem 0.7rem;
  transition: all 0.2s;
}

.recent-chip {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border-subtle, #dfe5ec);
  border-radius: 999px;
  background: var(--bg-surface, #fff);
  transition: all 0.2s;
}

.recent-chip:hover {
  border-color: var(--primary, #3498db);
  color: var(--primary-hover, #2477b3);
  transform: translateY(-1px);
}

.recent-chip-text,
.recent-chip-remove {
  border: 0;
  background: transparent;
  color: var(--text-primary, #2c3e50);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
}

.recent-chip-text {
  padding: 0.35rem 0.25rem 0.35rem 0.7rem;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-chip-remove {
  padding: 0.35rem 0.65rem 0.35rem 0.35rem;
  color: var(--text-muted, #95a5a6);
}

.recent-chip-text:hover {
  color: var(--primary-hover, #2477b3);
}

.recent-chip-remove:hover {
  color: var(--danger, #e74c3c);
}

.recent-clear:hover {
  border-color: var(--danger, #f5576c);
  color: var(--danger, #e74c3c);
}
</style>
