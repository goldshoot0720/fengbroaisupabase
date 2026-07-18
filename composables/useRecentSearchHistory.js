import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const DEFAULT_LIMIT = 37
const DEFAULT_DEBOUNCE_MS = 900

/**
 * Normalize a search history term. Objects (DOM Events) are rejected so
 * @blur / @keyup never become "[object FocusEvent]".
 */
export function normalizeSearchHistoryTerm(value) {
  if (value == null || typeof value === 'object') return ''
  return String(value).trim().replace(/\s+/g, ' ')
}

export function isValidSearchHistoryTerm(term) {
  if (!term) return false
  if (/^\[object\s+\w+\]$/i.test(term)) return false
  return true
}

/**
 * Persist recent search chips per feature (localStorage).
 *
 * @param {string} storageKey
 * @param {import('vue').Ref<string>} searchQuery
 * @param {{ limit?: number, debounceMs?: number, autoLoad?: boolean }} [options]
 */
export function useRecentSearchHistory(storageKey, searchQuery, options = {}) {
  const limit = options.limit ?? DEFAULT_LIMIT
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const autoLoad = options.autoLoad !== false

  const recentSearches = ref([])
  let searchHistoryTimer = null

  const persistRecentSearches = () => {
    if (typeof localStorage === 'undefined' || !storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(recentSearches.value))
  }

  const loadRecentSearches = () => {
    if (typeof localStorage === 'undefined' || !storageKey) return

    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]')
      recentSearches.value = Array.isArray(parsed)
        ? [
            ...new Set(
              parsed.map(normalizeSearchHistoryTerm).filter(isValidSearchHistoryTerm)
            ),
          ].slice(0, limit)
        : []
      // Rewrite if we stripped corrupted "[object FocusEvent]" entries
      persistRecentSearches()
    } catch {
      recentSearches.value = []
    }
  }

  const commitSearchHistory = (value) => {
    const raw =
      typeof value === 'string' || typeof value === 'number'
        ? value
        : searchQuery?.value
    const term = normalizeSearchHistoryTerm(raw)
    if (!isValidSearchHistoryTerm(term)) return

    recentSearches.value = [
      term,
      ...recentSearches.value.filter((item) => item !== term),
    ].slice(0, limit)
    persistRecentSearches()
  }

  const applyRecentSearch = (term) => {
    const normalized = normalizeSearchHistoryTerm(term)
    if (!isValidSearchHistoryTerm(normalized)) return
    if (searchQuery) searchQuery.value = normalized
    commitSearchHistory(normalized)
  }

  const clearRecentSearches = () => {
    recentSearches.value = []
    if (typeof localStorage !== 'undefined' && storageKey) {
      localStorage.removeItem(storageKey)
    }
  }

  const removeRecentSearch = (term) => {
    recentSearches.value = recentSearches.value.filter((item) => item !== term)
    persistRecentSearches()
  }

  const stopDebounce = () => {
    if (searchHistoryTimer) {
      clearTimeout(searchHistoryTimer)
      searchHistoryTimer = null
    }
  }

  if (searchQuery) {
    watch(searchQuery, (value) => {
      if (typeof window === 'undefined') return
      stopDebounce()
      const term = normalizeSearchHistoryTerm(value)
      if (!isValidSearchHistoryTerm(term)) return
      searchHistoryTimer = setTimeout(() => {
        commitSearchHistory(term)
      }, debounceMs)
    })
  }

  if (autoLoad) {
    onMounted(() => {
      loadRecentSearches()
    })
  }

  onBeforeUnmount(() => {
    stopDebounce()
  })

  return {
    recentSearches,
    loadRecentSearches,
    commitSearchHistory,
    applyRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    stopDebounce,
  }
}
