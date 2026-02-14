<template>
  <div class="pagination" v-if="totalPages > 1">
    <button 
      class="page-btn prev"
      :disabled="currentPage <= 1"
      @click="goToPage(currentPage - 1)"
    >
      ◀
    </button>
    
    <div class="page-numbers">
      <button
        v-for="page in visiblePages"
        :key="page"
        class="page-btn"
        :class="{ active: page === currentPage, ellipsis: page === '...' }"
        :disabled="page === '...'"
        @click="page !== '...' && goToPage(page)"
      >
        {{ page }}
      </button>
    </div>
    
    <button 
      class="page-btn next"
      :disabled="currentPage >= totalPages"
      @click="goToPage(currentPage + 1)"
    >
      ▶
    </button>
    
    <span class="page-info">
      第 {{ currentPage }} / {{ totalPages }} 頁
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  maxVisible: { type: Number, default: 5 }
})

const emit = defineEmits(['update:currentPage', 'change'])

const visiblePages = computed(() => {
  const pages = []
  const { currentPage, totalPages, maxVisible } = props
  
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    const half = Math.floor(maxVisible / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push('...')
    }
    
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i)
      }
    }
    
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
  }
  
  return pages
})

const goToPage = (page) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('update:currentPage', page)
    emit('change', page)
  }
}
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 1rem 0;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  border: 1px solid var(--border-color, #e1e8ed);
  border-radius: 8px;
  background: var(--bg-secondary, #ffffff);
  color: var(--text-primary, #2c3e50);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled):not(.active):not(.ellipsis) {
  background: var(--primary, #3b82f6);
  color: white;
  border-color: var(--primary, #3b82f6);
}

.page-btn.active {
  background: var(--primary, #3b82f6);
  color: white;
  border-color: var(--primary, #3b82f6);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.ellipsis {
  border: none;
  background: transparent;
  cursor: default;
}

.page-info {
  margin-left: 1rem;
  color: var(--text-secondary, #666);
  font-size: 0.85rem;
}

/* 暗黑模式 */
:global(.dark) .page-btn {
  background: #1e293b;
  border-color: #475569;
  color: #f1f5f9;
}

:global(.dark) .page-btn:hover:not(:disabled):not(.active):not(.ellipsis) {
  background: #60a5fa;
  border-color: #60a5fa;
}

:global(.dark) .page-btn.active {
  background: #60a5fa;
  border-color: #60a5fa;
}

:global(.dark) .page-info {
  color: #94a3b8;
}

/* 響應式 */
@media (max-width: 480px) {
  .pagination {
    gap: 0.25rem;
  }
  
  .page-btn {
    min-width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }
  
  .page-info {
    width: 100%;
    text-align: center;
    margin: 0.5rem 0 0;
  }
}
</style>
