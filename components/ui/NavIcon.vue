<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ name: { type: String, default: 'grid' } })
const icons = {
  'chevron-right': ['m9 5 7 7-7 7'],
  moon: ['M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z'],
  sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
  home: ['M3 11.5 12 4l9 7.5', 'M5 10.5V20h14v-9.5', 'M9 20v-6h6v6'],
  dashboard: ['M4 13h6V4H4z', 'M14 20h6V11h-6z', 'M14 7h6V4h-6z', 'M4 20h6v-3H4z'],
  daily: ['M7 3v3M17 3v3', 'M4 8h16v12H4z', 'm8 12 2 2 4-4'],
  content: ['M5 3h10l4 4v14H5z', 'M14 3v5h5', 'M8 13h8M8 17h6'],
  finance: ['M3 10h18', 'M5 10v8M9 10v8M15 10v8M19 10v8', 'M3 20h18', 'm4 8 5-4h6l5 4'],
  tools: ['m14.7 6.3 3-3 3 3-3 3', 'm13 8 3 3', 'M12 12 4 20', 'M4 20h4l8-8'],
  settings: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-3v-.8a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L5.6 17l.1-.1A1.7 1.7 0 0 0 6 15a1.7 1.7 0 0 0-1.5-1H4v-3h.5A1.7 1.7 0 0 0 6 10a1.7 1.7 0 0 0-.3-1.9L5.6 8l2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.8a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L18.8 8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.8v3h-.8a1.7 1.7 0 0 0-1.5 1Z'],
  grid: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'],
}
const paths = computed(() => icons[props.name] || icons.grid)
</script>

<style scoped>svg { width: 1.15rem; height: 1.15rem; display: block; }</style>
