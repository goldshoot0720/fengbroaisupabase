<template>
  <PageContainer>
    <div class="music-page">
      <div class="page-header">
        <h1 class="page-title">🎵 音樂庫</h1>
        <p class="page-description">
          使用 Netlify Blobs 優化音樂載入，支援多語言版本和多位演唱者
        </p>
      </div>

      <MusicManager />
    </div>
  </PageContainer>
</template>

<script setup>
import PageContainer from '../layout/PageContainer.vue'
import MusicManager from '../MusicManager.vue'

// 設置頁面標題
useHead({
  title: '音樂庫 - 鋒兄AI Supabase',
  meta: [
    { name: 'description', content: '音樂庫管理系統，支援多語言版本和多位演唱者' }
  ]
})
</script>

<style scoped>
.music-page {
  animation: fadeIn 0.3s ease-in;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  color: white;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.page-description {
  font-size: 1.1rem;
  opacity: 0.95;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .page-description {
    font-size: 1rem;
  }
  
  .page-header {
    padding: 1.5rem;
  }
}
</style>
