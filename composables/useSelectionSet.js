import { computed, ref } from 'vue'

export const useSelectionSet = (items, options = {}) => {
  const getId = options.getId || ((item) => item.id)
  const isSelectionMode = ref(false)
  const selectedIds = ref(new Set())

  const selectedItems = computed(() => {
    return items.value.filter(item => selectedIds.value.has(getId(item)))
  })

  const selectedCount = computed(() => selectedIds.value.size)

  const isAllSelected = computed(() => {
    return items.value.length > 0 && items.value.every(item => selectedIds.value.has(getId(item)))
  })

  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  const enterSelectionMode = () => {
    isSelectionMode.value = true
  }

  const exitSelectionMode = () => {
    isSelectionMode.value = false
    clearSelection()
  }

  const toggleSelect = (id) => {
    const nextSelectedIds = new Set(selectedIds.value)
    if (nextSelectedIds.has(id)) nextSelectedIds.delete(id)
    else nextSelectedIds.add(id)
    selectedIds.value = nextSelectedIds
  }

  const selectAll = () => {
    selectedIds.value = new Set(items.value.map(item => getId(item)))
  }

  const toggleSelectAll = () => {
    if (isAllSelected.value) clearSelection()
    else selectAll()
  }

  return {
    isSelectionMode,
    selectedIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelect,
    selectAll,
    toggleSelectAll
  }
}
