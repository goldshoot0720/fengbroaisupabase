import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MEDIA_TRAFFIC_EVENT_NAME, readMediaTraffic } from '../utils/mediaTraffic'

export const useMediaTraffic = () => {
  const snapshot = ref(readMediaTraffic(typeof localStorage === 'undefined' ? null : localStorage))
  const refresh = () => { snapshot.value = readMediaTraffic(typeof localStorage === 'undefined' ? null : localStorage) }
  const onUpdate = (event) => { snapshot.value = event?.detail || readMediaTraffic(localStorage) }

  onMounted(() => {
    refresh()
    window.addEventListener(MEDIA_TRAFFIC_EVENT_NAME, onUpdate)
    window.addEventListener('storage', refresh)
  })
  onBeforeUnmount(() => {
    window.removeEventListener(MEDIA_TRAFFIC_EVENT_NAME, onUpdate)
    window.removeEventListener('storage', refresh)
  })

  return {
    snapshot,
    total: computed(() => snapshot.value.total),
    categories: computed(() => snapshot.value.categories),
    actions: computed(() => snapshot.value.actions),
    month: computed(() => snapshot.value.month),
    refresh,
  }
}
