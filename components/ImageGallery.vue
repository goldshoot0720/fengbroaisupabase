<template>
  <div class="image-gallery-container">
    <h1>圖片展示畫廊</h1>
    <div class="gallery-placeholder">
      <div class="placeholder-icon">🖼️</div>
      <h2>即將整合 Supabase Storage</h2>
      <p>圖片庫功能準備中，敬請期待</p>
    </div>
  </div>
</template>

<script setup>
// 未來將整合 Supabase Storage
</script>

<style scoped>
.image-gallery-container {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

h1 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 2.5rem;
}

.gallery-placeholder {
  background: white;
  border-radius: 16px;
  padding: 4rem 2rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-top: 1.5rem;
}

.placeholder-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  opacity: 0.6;
}

.gallery-placeholder h2 {
  color: #2c3e50;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.gallery-placeholder p {
  color: #666;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2rem;
  }

  .gallery-placeholder {
    padding: 3rem 1.5rem;
  }
}
</style>
