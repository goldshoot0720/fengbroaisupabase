<template>
  <div class="app-container">
    <NuxtRouteAnnouncer />
    <div class="responsive-layout">
      <AppSidebar 
        :is-open="isSidebarOpen"
        :active-content="activeContent"
        @toggle="toggleSidebar"
        @close="closeSidebar"
        @set-content="setActiveContent"
      />

      <main class="main-content">
        <button 
          class="menu-toggle mobile-only" 
          @click="toggleSidebar"
          aria-label="開啟選單"
        >
          ☰
        </button>
        
        <div class="content-area">
          <div class="content-display">
            <slot />
          </div>
        </div>
      </main>
    </div>

    <!-- 手機版遮罩 -->
    <div 
      v-if="isSidebarOpen" 
      class="overlay mobile-only" 
      @click="closeSidebar"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppSidebar from './AppSidebar.vue'

const props = defineProps({
  activeContent: {
    type: String,
    default: 'home'
  }
})

const emit = defineEmits(['update:activeContent'])

const isSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

const setActiveContent = (content) => {
  emit('update:activeContent', content)
  // 手機版選擇項目後自動關閉選單
  if (process.client && window.innerWidth <= 768) {
    closeSidebar()
  }
}

// 監聽視窗大小變化
const handleResize = () => {
  if (process.client && window.innerWidth > 768) {
    isSidebarOpen.value = false
  }
}

onMounted(() => {
  if (process.client) {
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('resize', handleResize)
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  overflow: hidden;
}

.responsive-layout {
  display: flex;
  height: 100vh;
  position: relative;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-toggle {
  display: none;
  background: #3498db;
  color: white;
  border: none;
  padding: 1rem;
  font-size: 1.2rem;
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 999;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.content-display {
  max-width: 1200px;
  margin: 0 auto;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.mobile-only {
  display: none;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .menu-toggle,
  .overlay {
    display: block;
  }
  
  .mobile-only {
    display: block;
  }
  
  .content-area {
    padding: 1rem;
  }
}
</style>