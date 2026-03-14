<template>
  <div class="sidebar" :class="{ 'sidebar-open': isOpen }">
    <div class="sidebar-header">
      <div class="brand-logo">
        <div class="brand-icon">🏢</div>
        <div class="brand-text">
          <h2 class="brand-title">鋒兄管理系統</h2>
          <p class="brand-subtitle">鋒兄AI</p>
        </div>
      </div>
      <button @click="$emit('toggle')" class="sidebar-toggle">
        <span class="toggle-icon">{{ isOpen ? '✕' : '☰' }}</span>
      </button>
    </div>
    
    <nav class="sidebar-nav">
      <ul>
        <li v-for="page in pages" :key="page.id">
          <button 
            @click="$emit('navigate', page.id)" 
            :class="{ active: currentPage === page.id }"
            class="nav-btn"
          >
            <span class="nav-icon">{{ page.icon }}</span>
            {{ page.name }}
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup>
defineProps({
  isOpen: { type: Boolean, default: false },
  currentPage: { type: String, default: 'home' },
  pages: { 
    type: Array, 
    default: () => [
      { id: 'home', name: '鋒兄首頁', icon: '🏠' },
      { id: 'dashboard', name: '鋒兄儀表', icon: '📊' },
      { id: 'subscription', name: '鋒兄訂閱', icon: '💳' },
      { id: 'food', name: '鋒兄食品', icon: '🛒' },
      { id: 'note', name: '鋒兄筆記', icon: '📝' },
      { id: 'common', name: '鋒兄常用', icon: '⭐' },
      { id: 'gallery', name: '鋒兄圖片', icon: '🖼️' },
      { id: 'video', name: '鋒兄影片', icon: '🎥' },
      { id: 'music', name: '鋒兄音樂', icon: '🎵' },
      { id: 'document', name: '鋒兄文件', icon: '📄' },
      { id: 'podcast', name: '鋒兄播客', icon: '🎙️' },
      { id: 'bank', name: '鋒兄銀行', icon: '💰' },
      { id: 'routine', name: '鋒兄例行', icon: '📅' },
      { id: 'settings', name: '鋒兄設定', icon: '⚙️' },
      { id: 'about', name: '鋒兄關於', icon: 'ℹ️' }
    ]
  }
})

defineEmits(['toggle', 'navigate'])
</script>

<style scoped>
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #2c3e50 0%, #1a202c 100%);
  color: #ffffff;
  position: fixed;
  top: 0;
  left: -220px;
  height: 100vh;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar.sidebar-open {
  left: 0;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
}

.sidebar-header {
  padding: 1.25rem 1rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(10px);
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-icon {
  font-size: 1.8rem;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  border-radius: 10px;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
  animation: brandPulse 3s ease-in-out infinite;
}

@keyframes brandPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); }
  50% { transform: scale(1.08); box-shadow: 0 8px 25px rgba(59, 130, 246, 0.6); }
}

.brand-text { flex: 1; }

.brand-title {
  font-size: 1.1rem;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6);
}

.brand-subtitle {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.sidebar-toggle {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toggle-icon {
  font-size: 1.2rem;
}

.sidebar-nav {
  padding: 0.75rem 0;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0 0.5rem;
  margin: 0;
}

.nav-btn {
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: none;
  border: none;
  color: #ffffff;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  margin-bottom: 0.25rem;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.nav-btn.active {
  background: #3498db;
  border-right: 4px solid #2980b9;
}

.nav-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  width: 1.5rem;
  text-align: center;
}

/* 暗黑模式 */
:global(.dark) .sidebar {
  background: linear-gradient(180deg, #0f172a 0%, #0f172a 100%);
  border-right-color: #475569;
}

:global(.dark) .sidebar-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-bottom-color: #475569;
}

:global(.dark) .nav-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

:global(.dark) .nav-btn.active {
  background: #60a5fa;
  border-right-color: #3b82f6;
}

/* 桌面端 */
@media (min-width: 1200px) {
  .sidebar {
    position: static;
    left: 0;
    width: 220px;
    box-shadow: none;
  }

  .sidebar-toggle {
    display: none;
  }
}

/* 平板端 */
@media (min-width: 769px) and (max-width: 1199px) {
  .sidebar {
    position: static;
    left: 0;
    width: 200px;
    box-shadow: none;
  }

  .sidebar-toggle {
    display: none;
  }
}

/* 手機端 */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    left: -100%;
  }
  
  .sidebar.sidebar-open {
    left: 0;
  }
}
</style>
