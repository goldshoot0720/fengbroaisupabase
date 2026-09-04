<template>
  <button
    v-if="!selectionMode"
    type="button"
    class="btn-batch-mode"
    :disabled="disabled || visibleCount === 0"
    title="全選刪除"
    @click="$emit('select-all')"
  >全選刪除</button>
  <template v-else>
    <button
      type="button"
      class="btn-batch-mode"
      :disabled="disabled"
      @click="$emit('select-all')"
    >{{ isAllSelected ? '取消全選' : '全選' }}</button>
    <button
      type="button"
      class="btn-cancel-batch"
      :disabled="disabled"
      @click="$emit('clear')"
    >取消選取</button>
    <button
      v-if="selectedCount > 0"
      type="button"
      class="btn-batch-delete"
      :disabled="disabled"
      @click="$emit('delete-selected')"
    >刪除選取 ({{ selectedCount }})</button>
  </template>
</template>

<script setup>
defineProps({
  selectionMode: { type: Boolean, default: false },
  isAllSelected: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  visibleCount: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
})

defineEmits(['select-all', 'clear', 'delete-selected'])
</script>

<style scoped>
.btn-batch-mode,
.btn-cancel-batch,
.btn-batch-delete {
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: var(--control-radius);
  cursor: pointer;
  font-weight: 500;
  font-size: var(--text-sm);
  height: var(--control-h);
  padding: 0 var(--sp-3);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.btn-batch-mode:hover:not(:disabled),
.btn-cancel-batch:hover:not(:disabled) {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.btn-batch-delete {
  background: var(--danger-solid);
  border-color: var(--danger-solid);
  color: var(--on-solid);
}

.btn-batch-delete:hover:not(:disabled) {
  background: var(--danger-solid-hover);
  border-color: var(--danger-solid-hover);
}

.btn-batch-mode:disabled,
.btn-cancel-batch:disabled,
.btn-batch-delete:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
