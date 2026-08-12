<template>
  <BaseModal :model-value="modelValue" :title="title" icon="🗑️" size="lg" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="items.length" class="trash-list">
      <article v-for="item in items" :key="`${item.record?.id}-${item.deletedAt}`" class="trash-item">
        <div>
          <strong>{{ getLabel(item.record) }}</strong>
          <span>移入時間：{{ formatDeletedAt(item.deletedAt) }}</span>
        </div>
        <button type="button" class="trash-restore" @click="$emit('restore', item)">還原</button>
      </article>
    </div>
    <div v-else class="trash-empty">垃圾桶目前是空的。</div>
    <template #footer>
      <button type="button" class="trash-clear" :disabled="!items.length" @click="$emit('clear')">永久清空</button>
      <button type="button" class="trash-close" @click="$emit('update:modelValue', false)">關閉</button>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '垃圾桶' },
  items: { type: Array, default: () => [] },
  labelFields: { type: Array, default: () => ['name', 'title'] },
})
defineEmits(['update:modelValue', 'restore', 'clear'])

const getLabel = (record = {}) => {
  for (const field of props.labelFields) if (record[field]) return record[field]
  return '未命名項目'
}
const formatDeletedAt = (value) => new Date(value).toLocaleString('zh-TW')
</script>

<style scoped>
.trash-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.trash-item { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-surface); }
.trash-item div { min-width: 0; display: flex; flex-direction: column; gap: var(--spacing-2xs); }
.trash-item strong { overflow: hidden; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.trash-item span { color: var(--text-muted); font-size: var(--text-xs); }
.trash-restore, .trash-close, .trash-clear { min-height: 44px; padding: 0 var(--spacing-md); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); cursor: pointer; font-weight: 700; }
.trash-restore, .trash-close { color: var(--text-primary); background: var(--bg-muted); }
.trash-clear { color: var(--danger); background: var(--danger-light); }
.trash-clear:disabled { cursor: not-allowed; opacity: 0.45; }
.trash-empty { padding: var(--spacing-xl); color: var(--text-secondary); text-align: center; }
</style>
