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
  border: 1px solid var(--border-color, #dfe5ec);
  background: var(--bg-secondary, #fff);
  color: var(--text-primary, #2c3e50);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.45rem 0.75rem;
}

.btn-batch-delete {
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
}

.btn-batch-mode:disabled,
.btn-cancel-batch:disabled,
.btn-batch-delete:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
