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
  gap: var(--sp-2);
  margin-top: var(--sp-2);
  width: 100%;
}

.recent-label {
  color: var(--text-muted, var(--text-muted));
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}

.recent-clear {
  border: 1px solid var(--border-subtle, var(--border-subtle));
  border-radius: 999px;
  background: var(--bg-surface, var(--bg-surface));
  color: var(--text-primary, var(--text-primary));
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.2;
  height: 26px;
  padding: 0 var(--sp-3);
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.recent-chip {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border-subtle, var(--border-subtle));
  border-radius: 999px;
  height: 26px;
  background: var(--bg-surface, var(--bg-surface));
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.recent-chip:hover {
  border-color: var(--border-strong);
  background: var(--bg-muted);
}

.recent-chip-text,
.recent-chip-remove {
  border: 0;
  background: transparent;
  color: var(--text-primary, var(--text-primary));
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.2;
}

.recent-chip-text {
  padding: 0 var(--sp-1) 0 var(--sp-3);
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-chip-remove {
  padding: 0 var(--sp-2) 0 var(--sp-1);
  color: var(--text-muted, var(--text-muted));
}

.recent-chip-text:hover {
  color: var(--primary-hover, var(--primary-text));
}

.recent-chip-remove:hover {
  color: var(--danger, var(--danger-text));
}

.recent-clear:hover {
  border-color: var(--danger, var(--danger));
  color: var(--danger, var(--danger-text));
}
</style>
