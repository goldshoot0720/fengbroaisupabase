# 元件使用指南

## 🎯 概述

本指南說明如何使用重構後的元件系統，包括 UI 元件、佈局元件和 Composables。

## 📁 專案結構

```
components/
├── layout/          # 佈局元件
├── pages/           # 頁面元件
├── ui/              # UI 元件
└── [舊元件...]

composables/         # 邏輯複用
assets/css/          # 全域樣式
```

## 🧩 UI 元件使用

### BaseButton
```vue
<template>
  <!-- 基本按鈕 -->
  <BaseButton @click="handleClick">點擊我</BaseButton>
  
  <!-- 帶圖示的按鈕 -->
  <BaseButton variant="primary" icon="➕" @click="addItem">新增</BaseButton>
  
  <!-- 載入狀態 -->
  <BaseButton :loading="isLoading" @click="submit">提交</BaseButton>
  
  <!-- 全寬按鈕 -->
  <BaseButton full-width variant="success">確認</BaseButton>
</template>
```

### BaseInput
```vue
<template>
  <!-- 基本輸入框 -->
  <BaseInput 
    v-model="name" 
    label="姓名" 
    placeholder="請輸入姓名"
    required
  />
  
  <!-- 帶圖示的輸入框 -->
  <BaseInput 
    v-model="email" 
    type="email"
    label="電子郵件" 
    icon="📧"
    :error="emailError"
  />
  
  <!-- 文字區域 -->
  <BaseInput 
    v-model="description" 
    type="textarea"
    label="描述" 
    :rows="4"
  />
</template>
```

### BaseModal
```vue
<template>
  <BaseModal 
    v-model="showModal" 
    title="確認刪除" 
    icon="⚠️"
    size="sm"
  >
    <p>您確定要刪除這個項目嗎？</p>
    
    <template #footer>
      <BaseButton variant="ghost" @click="showModal = false">取消</BaseButton>
      <BaseButton variant="danger" @click="confirmDelete">刪除</BaseButton>
    </template>
  </BaseModal>
</template>
```

### StatCard
```vue
<template>
  <!-- 統計卡片 -->
  <StatCard
    title="訂閱數量"
    :value="subscriptionCount"
    label="項目"
    icon="💳"
    variant="primary"
    prefix="共 "
    suffix=" 個"
  >
    <template #alert>
      <AlertBadge variant="warning">3 項即將到期</AlertBadge>
    </template>
  </StatCard>
</template>
```

### Toast 通知
```vue
<script setup>
import { useToast } from '~/composables/useToast'

const { success, error, warning, info } = useToast()

const handleSuccess = () => {
  success('操作成功！')
}

const handleError = () => {
  error('發生錯誤，請稍後再試')
}
</script>

<template>
  <div>
    <BaseButton @click="handleSuccess">成功通知</BaseButton>
    <BaseButton @click="handleError" variant="danger">錯誤通知</BaseButton>
    
    <!-- Toast 容器 -->
    <ToastContainer />
  </div>
</template>
```

## 🏗️ 佈局元件使用

### PageContainer
```vue
<template>
  <PageContainer title="頁面標題" icon="📊">
    <template #actions>
      <BaseButton variant="primary" icon="➕">新增</BaseButton>
    </template>
    
    <!-- 頁面內容 -->
    <div>頁面內容...</div>
  </PageContainer>
</template>
```

### AppSidebar & AppHeader
```vue
<template>
  <div class="app-container">
    <AppSidebar
      :is-open="sidebarOpen"
      :current-page="currentPage"
      :pages="pages"
      @toggle="toggleSidebar"
      @navigate="setCurrentPage"
    />
    
    <div class="main-content">
      <AppHeader
        :title="pageTitle"
        :is-dark-mode="isDarkMode"
        @toggle-sidebar="toggleSidebar"
        @toggle-dark-mode="toggleDarkMode"
      />
      
      <main class="page-content">
        <!-- 頁面內容 -->
      </main>
    </div>
  </div>
</template>
```

## 🔧 Composables 使用

### useTheme
```vue
<script setup>
import { useTheme } from '~/composables/useTheme'

const { isDarkMode, toggleDarkMode, initTheme } = useTheme()

// 初始化主題
onMounted(() => {
  initTheme()
})
</script>

<template>
  <BaseButton @click="toggleDarkMode">
    {{ isDarkMode ? '☀️ 亮色模式' : '🌙 暗黑模式' }}
  </BaseButton>
</template>
```

### useNavigation
```vue
<script setup>
import { useNavigation } from '~/composables/useNavigation'

const { 
  currentPage, 
  sidebarOpen, 
  pages, 
  pageTitle, 
  setCurrentPage, 
  toggleSidebar 
} = useNavigation()
</script>

<template>
  <div>
    <h1>{{ pageTitle }}</h1>
    <BaseButton @click="toggleSidebar">切換側邊欄</BaseButton>
  </div>
</template>
```

### useScroll
```vue
<script setup>
import { useScroll } from '~/composables/useScroll'

const { 
  showScrollButtons, 
  showTopButton, 
  showBottomButton, 
  scrollToTop, 
  scrollToBottom,
  setupScrollListener,
  removeScrollListener
} = useScroll()

onMounted(() => {
  setupScrollListener()
})

onUnmounted(() => {
  removeScrollListener()
})
</script>

<template>
  <div class="scroll-buttons">
    <button v-show="showTopButton" @click="scrollToTop">⬆️</button>
    <button v-show="showBottomButton" @click="scrollToBottom">⬇️</button>
  </div>
</template>
```

## 🎨 樣式系統

### CSS 變數使用
```css
.my-component {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  transition: all var(--transition-normal);
}

.my-component:hover {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow-lg);
}
```

### 工具類別
```html
<!-- 文字顏色 -->
<p class="text-primary">主要文字</p>
<p class="text-secondary">次要文字</p>
<p class="text-success">成功文字</p>

<!-- 背景顏色 -->
<div class="bg-primary">主要背景</div>
<div class="bg-secondary">次要背景</div>

<!-- 圓角 -->
<div class="rounded-sm">小圓角</div>
<div class="rounded-md">中圓角</div>
<div class="rounded-lg">大圓角</div>

<!-- 陰影 -->
<div class="shadow-sm">小陰影</div>
<div class="shadow-md">中陰影</div>
<div class="shadow-lg">大陰影</div>
```

## 📱 響應式設計

所有元件都內建響應式設計，會自動適應不同螢幕尺寸：

- **桌面端** (≥1200px): 完整功能和佈局
- **平板端** (769px-1199px): 適中的間距和字體
- **手機端** (≤768px): 緊湊佈局，觸控友好

## 🔍 最佳實踐

### 1. 元件命名
- 使用 PascalCase: `BaseButton`, `StatCard`
- 描述性命名: `ConfirmDialog`, `SearchInput`

### 2. Props 設計
```vue
<script setup>
defineProps({
  // 必要屬性
  title: { type: String, required: true },
  
  // 可選屬性帶預設值
  variant: { type: String, default: 'primary' },
  
  // 布林值屬性
  disabled: { type: Boolean, default: false },
  
  // 驗證器
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})
</script>
```

### 3. 事件處理
```vue
<script setup>
// 定義事件
defineEmits(['update:modelValue', 'change', 'submit'])

// 使用事件
const handleChange = (value) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>
```

### 4. 插槽使用
```vue
<template>
  <BaseCard>
    <!-- 預設插槽 -->
    <p>卡片內容</p>
    
    <!-- 具名插槽 -->
    <template #header>
      <h3>卡片標題</h3>
    </template>
    
    <template #actions>
      <BaseButton>操作</BaseButton>
    </template>
  </BaseCard>
</template>
```

## 🚀 開發工作流程

1. **新增功能**: 先檢查是否有現有元件可用
2. **創建元件**: 遵循現有的設計模式和命名規範
3. **測試元件**: 確保在不同螢幕尺寸下正常工作
4. **文件更新**: 更新使用指南和範例
5. **程式碼審查**: 確保符合專案標準

## 📚 參考資源

- [Vue 3 文件](https://vuejs.org/)
- [Nuxt 3 文件](https://nuxt.com/)
- [CSS 變數參考](./assets/css/variables.css)
- [元件原始碼](./components/)