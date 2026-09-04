<template>
  <PageContainer>
    <div class="note-page">
      <!-- ══ Notion 式側欄 ══ -->
      <aside class="nb-sidebar">
        <div class="nb-workspace">
          <span class="nb-ws-icon" aria-hidden="true">鋒</span>
          <div class="nb-ws-copy">
            <strong>鋒兄筆記</strong>
            <span>{{ articles.length }} 篇 · {{ categoryOptions.length }} 個分類</span>
          </div>
        </div>

        <nav class="nb-nav" aria-label="筆記導覽">
          <button
            type="button"
            class="nb-nav-item"
            :class="{ active: selectedCategoryFilter === '' }"
            @click="selectedCategoryFilter = ''"
          >
            <span class="nb-nav-icon">📄</span>
            <span class="nb-nav-label">所有筆記</span>
            <span class="nb-nav-count">{{ articles.length }}</span>
          </button>
          <button
            type="button"
            class="nb-nav-item"
            :class="{ active: selectedCategoryFilter === PINNED_CATEGORY }"
            @click="selectedCategoryFilter = PINNED_CATEGORY"
          >
            <span class="nb-nav-icon">📌</span>
            <span class="nb-nav-label">置頂</span>
            <span class="nb-nav-count">{{ pinnedCount }}</span>
          </button>
          <button
            type="button"
            class="nb-nav-item"
            :class="{ active: selectedCategoryFilter === ATTACHMENT_FILTER_VALUE }"
            @click="selectedCategoryFilter = ATTACHMENT_FILTER_VALUE"
          >
            <span class="nb-nav-icon">📎</span>
            <span class="nb-nav-label">有附件</span>
            <span class="nb-nav-count">{{ attachmentCountTotal }}</span>
          </button>
        </nav>

        <div class="nb-section">
          <p class="nb-section-title">分類</p>
          <div class="nb-nav">
            <button
              v-for="category in categoryOptions"
              :key="'nav-' + category"
              type="button"
              class="nb-nav-item"
              :class="{ active: selectedCategoryFilter === category }"
              @click="selectedCategoryFilter = category"
            >
              <span class="nb-nav-icon">#</span>
              <span class="nb-nav-label">{{ category }}</span>
              <span class="nb-nav-count">{{ categoryCount(category) }}</span>
            </button>
            <p v-if="categoryOptions.length === 0" class="nb-nav-empty">尚未建立分類</p>
          </div>
        </div>

        <div class="nb-sidebar-foot">
          <button type="button" class="nb-nav-item" @click="trashOpen = true">
            <span class="nb-nav-icon">🗑</span>
            <span class="nb-nav-label">垃圾桶</span>
            <span v-if="trashedArticles.length" class="nb-nav-count">{{ trashedArticles.length }}</span>
          </button>
          <button type="button" class="nb-nav-item" :disabled="zipExporting" @click="exportArticlesZip">
            <span class="nb-nav-icon">📦</span>
            <span class="nb-nav-label">{{ zipExporting ? '匯出中...' : '匯出 ZIP' }}</span>
          </button>
          <button type="button" class="nb-nav-item" :disabled="zipImporting" @click="$refs.zipFileInput.click()">
            <span class="nb-nav-icon">📥</span>
            <span class="nb-nav-label">{{ zipImportButtonLabel }}</span>
          </button>
          <input
            ref="zipFileInput"
            type="file"
            accept=".zip"
            style="display:none"
            @change="handleImportZip"
          >
        </div>
      </aside>

      <!-- ══ 主要頁面 ══ -->
      <main class="nb-main">
        <nav class="nb-breadcrumb" aria-label="路徑">
          <span>鋒兄筆記</span>
          <span class="nb-crumb-sep">/</span>
          <span class="nb-crumb-current">{{ currentViewLabel }}</span>
        </nav>

        <header class="nb-page-head">
          <span class="nb-page-icon" aria-hidden="true">📝</span>
          <div class="nb-page-copy">
            <h1 class="nb-page-title">{{ currentViewLabel }}</h1>
            <p class="nb-page-sub">{{ filteredArticles.length }} 筆 · 依置頂與日期排序</p>
          </div>
          <button class="nb-new-btn" @click="startAddRow">＋ 新增筆記</button>
        </header>

        <div class="nb-toolbar">
          <div class="nb-view-tabs" role="tablist" aria-label="資料庫檢視">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              type="button"
              role="tab"
              class="nb-view-tab"
              :class="{ active: viewMode === option.value }"
              :aria-selected="viewMode === option.value"
              @click="viewMode = option.value"
            >
              <span aria-hidden="true">{{ option.icon }}</span> {{ option.label }}
            </button>
          </div>
          <div class="nb-toolbar-right">
            <div class="search-area">
              <RecentSearchInput
                v-model="searchQuery"
                placeholder="搜尋筆記標題或內容..."
                :terms="recentSearches"
                @submit="commitSearchHistory()"
                @apply="applyRecentSearch"
                @remove="removeRecentSearch"
                @clear="clearRecentSearches"
              />
            </div>
            <select v-model="selectedCategoryFilter" class="category-filter-select">
              <option value="">全部分類</option>
              <option :value="ATTACHMENT_FILTER_VALUE">有附件</option>
              <option v-for="category in categoryOptions" :key="'filter-' + category" :value="category">
                {{ category }}
              </option>
            </select>
            <button
              v-if="!batchMode && filteredArticles.length > 0"
              @click="enterBatchMode"
              class="btn-batch-mode"
            >
              選取
            </button>
            <template v-if="batchMode">
              <button @click="exitBatchMode" class="btn-cancel-batch">取消選取</button>
              <button
                v-if="selectedIds.size > 0"
                class="btn-batch-delete"
                @click="deleteSelected"
                :disabled="loading"
              >
                刪除 ({{ selectedIds.size }})
              </button>
            </template>
          </div>
        </div>

        <div v-if="zipImporting" class="zip-import-progress" role="status" aria-live="polite">
          <div class="zip-import-progress-head">
            <span>{{ zipImportStatus }}</span>
            <strong>{{ zipImportProgress }}%</strong>
          </div>
          <div class="zip-import-progress-bar" aria-hidden="true">
            <div class="zip-import-progress-fill" :style="{ width: `${zipImportProgress}%` }"></div>
          </div>
        </div>

        <div v-if="batchMode" class="batch-category-bar">
          <label class="select-all-label">
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
            <span>全選 ({{ selectedIds.size }}/{{ filteredArticles.length }})</span>
          </label>
          <input
            v-model="batchCategoryInput"
            type="text"
            class="batch-category-input"
            placeholder="輸入要套用的分類，使用逗號分隔"
            @keydown.enter.prevent="applyCategoriesToSelected"
          >
          <button
            type="button"
            class="btn-batch-apply"
            @click="applyCategoriesToSelected"
            :disabled="loading || selectedIds.size === 0"
          >
            套用分類 ({{ selectedIds.size }})
          </button>
          <button
            type="button"
            class="btn-batch-clear"
            @click="clearCategoriesFromSelected"
            :disabled="loading || selectedIds.size === 0"
          >
            清除分類
          </button>
        </div>

        <!-- 載入中 -->
        <div v-if="loading && articles.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p>載入資料中...</p>
        </div>

        <!-- 空狀態 -->
        <div v-if="!loading && filteredArticles.length === 0 && !showAddRow" class="empty-state">
          <span class="empty-icon" aria-hidden="true">🍃</span>
          <p>這個檢視還沒有內容</p>
          <button class="nb-new-btn nb-new-btn--ghost" @click="startAddRow">＋ 新增一頁</button>
        </div>

        <!-- 筆記資料庫 -->
        <div
          class="notes-container"
          :class="[`notes-container--${viewMode}`]"
          v-if="filteredArticles.length > 0 || showAddRow"
        >
          <!-- 表格檢視表頭 -->
          <div v-if="viewMode === 'table'" class="table-head" role="row">
            <span class="th th-title">名稱</span>
            <span class="th th-tags">分類</span>
            <span class="th th-date">日期</span>
            <span class="th th-files">附件</span>
            <span class="th th-tools"></span>
          </div>

          <!-- 行內新增卡片 -->
          <div v-if="showAddRow" class="note-card note-card-editing add-card note-card--editor">
            <div class="inline-form">
              <div class="inline-row">
                <input v-model="addForm.title" type="text" class="inline-input inline-title" placeholder="無標題" />
                <input v-model="addForm.newdate" type="date" class="inline-input inline-date" />
              </div>
              <div class="category-picker">
                <div class="category-picker-label">分類</div>
                <div v-if="selectedCategories(addForm).length > 0" class="category-selected-list">
                  <button
                    v-for="category in selectedCategories(addForm)"
                    :key="'add-selected-' + category"
                    type="button"
                    class="category-chip selected"
                    @click="toggleCategory(addForm, category)"
                  >
                    {{ category }} ×
                  </button>
                </div>
                <div v-if="categoryOptions.length > 0" class="category-option-list">
                  <button
                    v-for="category in categoryOptions"
                    :key="'add-option-' + category"
                    type="button"
                    class="category-chip"
                    :class="{ selected: hasCategory(addForm, category) }"
                    @click="toggleCategory(addForm, category)"
                  >
                    {{ category }}
                  </button>
                </div>
                <div class="category-input-row">
                  <input
                    v-model="newAddCategory"
                    type="text"
                    class="inline-input"
                    placeholder="新增分類"
                    @keydown.enter.prevent="appendCategory(addForm, newAddCategory, 'add')"
                  />
                  <button type="button" class="btn-category-add" @click="appendCategory(addForm, newAddCategory, 'add')">加入</button>
                </div>
              </div>
              <textarea v-model="addForm.content" class="inline-textarea" rows="4" placeholder="輸入內容，或貼上想記住的東西…"></textarea>
              <div class="inline-section">
                <h4 @click="addSection.urls = !addSection.urls" class="section-toggle">
                  <span class="section-caret">{{ addSection.urls ? '▾' : '▸' }}</span> 🔗 連結
                </h4>
                <div v-if="addSection.urls" class="section-content">
                  <input v-model="addForm.url1" type="url" class="inline-input mb-2" placeholder="連結 1" />
                  <input v-model="addForm.url2" type="url" class="inline-input mb-2" placeholder="連結 2" />
                  <input v-model="addForm.url3" type="url" class="inline-input" placeholder="連結 3" />
                </div>
              </div>
              <div class="inline-section">
                <h4 @click="addSection.files = !addSection.files" class="section-toggle">
                  <span class="section-caret">{{ addSection.files ? '▾' : '▸' }}</span> 📎 附件 (最多 3 個)
                </h4>
                <div v-if="addSection.files" class="section-content">
                  <div v-for="n in 3" :key="'add-file-' + n" class="attachment-upload-item" :class="{ 'mb-3': n < 3 }">
                    <label class="attachment-label">附件 {{ n }}</label>
                    <div v-if="addForm['file' + n]" class="attachment-preview">
                      <div class="attachment-preview-content">
                        <img v-if="isImageType(addForm['file' + n + 'type'])" :src="addForm['file' + n]" alt="預覽" class="attachment-thumb" />
                        <div v-else class="attachment-file-icon">📄</div>
                        <div class="attachment-info">
                          <span class="attachment-name">{{ addForm['file' + n + 'name'] || '已上傳' }}</span>
                          <span class="attachment-type-badge">{{ addForm['file' + n + 'type'] || 'FILE' }}</span>
                        </div>
                      </div>
                      <button type="button" class="btn-remove-attachment" @click="addForm['file' + n] = ''; addForm['file' + n + 'name'] = ''; addForm['file' + n + 'type'] = ''">✕</button>
                    </div>
                    <div v-else class="attachment-drop-zone" @click="triggerFileInput(n, 'add')" @dragover.prevent @drop.prevent="handleFileDrop($event, n, 'add')">
                      <span class="drop-icon">📎</span>
                      <span class="drop-text">點擊或拖曳上傳</span>
                    </div>
                    <input :ref="el => { if (el) addFileInputRefs[n] = el }" type="file" style="display:none" @change="handleFileUpload($event, n, 'add')" />
                    <div v-if="uploadingSlot === 'add-' + n" class="attachment-progress">
                      <div class="progress-bar"><div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div></div>
                      <span class="progress-text">上傳中...</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="inline-actions">
                <button @click="saveAddRow" class="btn-save-icon" title="新增">✓ 新增</button>
                <button @click="cancelAddRow" class="btn-cancel-icon" title="取消">✕ 取消</button>
              </div>
            </div>
          </div>

          <!-- 筆記列表 -->
          <div
            v-for="article in filteredArticles"
            :key="article.id"
            class="note-card"
            :class="[
              {
                'note-selected': selectedIds.has(article.id),
                'note-card-editing': editingRowId === article.id,
                'note-pinned': isPinnedArticle(article),
                'is-expanded': expandedNoteId === article.id
              },
              noteCardModeClass(article.id)
            ]"
          >

            <!-- 編輯模式 -->
            <template v-if="editingRowId === article.id">
              <div class="inline-form">
                <div class="inline-row">
                  <input v-model="editForm.title" type="text" class="inline-input inline-title" placeholder="無標題" />
                  <input v-model="editForm.newdate" type="date" class="inline-input inline-date" />
                </div>
                <div class="category-picker">
                  <div class="category-picker-label">分類</div>
                  <div v-if="selectedCategories(editForm).length > 0" class="category-selected-list">
                    <button
                      v-for="category in selectedCategories(editForm)"
                      :key="'edit-selected-' + category"
                      type="button"
                      class="category-chip selected"
                      @click="toggleCategory(editForm, category)"
                    >
                      {{ category }} ×
                    </button>
                  </div>
                  <div v-if="categoryOptions.length > 0" class="category-option-list">
                    <button
                      v-for="category in categoryOptions"
                      :key="'edit-option-' + category"
                      type="button"
                      class="category-chip"
                      :class="{ selected: hasCategory(editForm, category) }"
                      @click="toggleCategory(editForm, category)"
                    >
                      {{ category }}
                    </button>
                  </div>
                  <div class="category-input-row">
                    <input
                      v-model="newEditCategory"
                      type="text"
                      class="inline-input"
                      placeholder="新增分類"
                      @keydown.enter.prevent="appendCategory(editForm, newEditCategory, 'edit')"
                    />
                    <button type="button" class="btn-category-add" @click="appendCategory(editForm, newEditCategory, 'edit')">加入</button>
                  </div>
                </div>
                <textarea v-model="editForm.content" class="inline-textarea" rows="4" placeholder="輸入內容…"></textarea>
                <div class="inline-section">
                  <h4 @click="editSection.urls = !editSection.urls" class="section-toggle">
                    <span class="section-caret">{{ editSection.urls ? '▾' : '▸' }}</span> 🔗 連結
                  </h4>
                  <div v-if="editSection.urls" class="section-content">
                    <input v-model="editForm.url1" type="url" class="inline-input mb-2" placeholder="連結 1" />
                    <input v-model="editForm.url2" type="url" class="inline-input mb-2" placeholder="連結 2" />
                    <input v-model="editForm.url3" type="url" class="inline-input" placeholder="連結 3" />
                  </div>
                </div>
                <div class="inline-section">
                  <h4 @click="editSection.files = !editSection.files" class="section-toggle">
                    <span class="section-caret">{{ editSection.files ? '▾' : '▸' }}</span> 📎 附件 (最多 3 個)
                  </h4>
                  <div v-if="editSection.files" class="section-content">
                    <div v-for="n in 3" :key="'edit-file-' + n" class="attachment-upload-item" :class="{ 'mb-3': n < 3 }">
                      <label class="attachment-label">附件 {{ n }}</label>
                      <div v-if="editForm['file' + n]" class="attachment-preview">
                        <div class="attachment-preview-content">
                          <img v-if="isImageType(editForm['file' + n + 'type'])" :src="editForm['file' + n]" alt="預覽" class="attachment-thumb" />
                          <div v-else class="attachment-file-icon">📄</div>
                          <div class="attachment-info">
                            <span class="attachment-name">{{ editForm['file' + n + 'name'] || '已上傳' }}</span>
                            <span class="attachment-type-badge">{{ editForm['file' + n + 'type'] || 'FILE' }}</span>
                          </div>
                        </div>
                        <button type="button" class="btn-remove-attachment" @click="editForm['file' + n] = ''; editForm['file' + n + 'name'] = ''; editForm['file' + n + 'type'] = ''">✕</button>
                      </div>
                      <div v-else class="attachment-drop-zone" @click="triggerFileInput(n, 'edit')" @dragover.prevent @drop.prevent="handleFileDrop($event, n, 'edit')">
                        <span class="drop-icon">📎</span>
                        <span class="drop-text">點擊或拖曳上傳</span>
                      </div>
                      <input :ref="el => { if (el) editFileInputRefs[n] = el }" type="file" style="display:none" @change="handleFileUpload($event, n, 'edit')" />
                      <div v-if="uploadingSlot === 'edit-' + n" class="attachment-progress">
                        <div class="progress-bar"><div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div></div>
                        <span class="progress-text">上傳中...</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="inline-actions">
                  <button @click="saveInlineEdit(article.id)" class="btn-save-icon" title="儲存">✓ 儲存</button>
                  <button @click="cancelInlineEdit" class="btn-cancel-icon" title="取消">✕ 取消</button>
                </div>
              </div>
            </template>

            <!-- ══ 表格 / 列表檢視：Notion 資料庫列 ══ -->
            <template v-else-if="viewMode === 'table' || viewMode === 'list'">
              <div class="db-row" @click="toggleExpandNote(article.id)">
                <span class="row-handle" aria-hidden="true">⠿</span>
                <label v-if="batchMode" class="card-checkbox" @click.stop>
                  <input type="checkbox" :checked="selectedIds.has(article.id)" @change="toggleSelect(article.id)" />
                </label>
                <span class="row-title">
                  <span class="row-page-icon" aria-hidden="true">{{ isPinnedArticle(article) ? '📌' : '📄' }}</span>
                  <span class="row-title-text">{{ article.title || '無標題' }}</span>
                  <span class="row-open-hint">開啟</span>
                </span>
                <span class="row-tags">
                  <span
                    v-for="category in splitCategories(article.category)"
                    :key="article.id + '-' + category"
                    class="note-category"
                    :class="{ pinned: category === PINNED_CATEGORY }"
                  >{{ category }}</span>
                </span>
                <span class="row-date">{{ formatDate(article.newdate) }}</span>
                <span class="row-files">
                  <span v-if="attachmentCount(article) > 0" class="files-chip">📎 {{ attachmentCount(article) }}</span>
                  <span v-else class="files-empty">—</span>
                </span>
                <span class="row-tools" @click.stop>
                  <button
                    class="btn-icon pin"
                    :class="{ active: isPinnedArticle(article) }"
                    @click="togglePinnedArticle(article)"
                    :title="isPinnedArticle(article) ? '取消置頂' : '置頂'"
                    :disabled="loading"
                  >📌</button>
                  <button class="btn-icon" @click="startInlineEdit(article)" title="編輯">✏️</button>
                  <button class="btn-icon delete" @click="confirmDelete(article)" title="刪除">🗑️</button>
                </span>
              </div>

              <!-- 展開的頁面內容（Notion Peek） -->
              <div v-if="expandedNoteId === article.id" class="db-peek">
                <div class="note-content">
                  <p>{{ article.content || '（沒有內容）' }}</p>
                </div>
                <div class="note-attachments" v-if="hasAttachments(article)">
                  <div class="attachment-group" v-if="article.url1 || article.url2 || article.url3">
                    <h4>🔗 相關連結</h4>
                    <div class="links-list">
                      <a v-if="article.url1" :href="article.url1" target="_blank" class="link-item">{{ article.url1 }}</a>
                      <a v-if="article.url2" :href="article.url2" target="_blank" class="link-item">{{ article.url2 }}</a>
                      <a v-if="article.url3" :href="article.url3" target="_blank" class="link-item">{{ article.url3 }}</a>
                    </div>
                  </div>
                  <div class="attachment-group" v-if="article.file1 || article.file2 || article.file3">
                    <h4>📎 附件檔案</h4>
                    <div class="files-list">
                      <template v-for="n in 3" :key="'peek-file' + n">
                        <div v-if="article['file' + n]" class="file-item-card">
                          <img
                            v-if="isImageType(article['file' + n + 'type']) && !isMultipartAttachment(article['file' + n])"
                            :src="article['file' + n]"
                            :alt="article['file' + n + 'name'] || '附件'"
                            class="file-preview-img"
                            @click="openPreview(article['file' + n])"
                          />
                          <div v-else class="file-icon-box">📄</div>
                          <div class="file-detail">
                            <span class="file-name">{{ article['file' + n + 'name'] || '附件 ' + n }}</span>
                            <span class="file-type">{{ article['file' + n + 'type'] || 'FILE' }}</span>
                          </div>
                          <button
                            type="button"
                            class="btn-download"
                            title="開啟/下載"
                            :disabled="isAttachmentDownloading(article, n)"
                            @click="downloadAttachment(article, n)"
                          >
                            {{ isAttachmentDownloading(article, n) ? '下載中' : '⬇️' }}
                          </button>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- ══ 圖庫檢視：Notion Gallery 卡片 ══ -->
            <template v-else>
              <div class="note-header">
                <div class="note-meta">
                  <label v-if="batchMode" class="card-checkbox" @click.stop>
                    <input type="checkbox" :checked="selectedIds.has(article.id)" @change="toggleSelect(article.id)" />
                  </label>
                  <span class="note-page-icon" aria-hidden="true">{{ isPinnedArticle(article) ? '📌' : '📄' }}</span>
                  <span class="note-date">{{ formatDate(article.newdate) }}</span>
                </div>
                <div class="note-actions">
                  <button
                    class="btn-icon pin"
                    :class="{ active: isPinnedArticle(article) }"
                    @click="togglePinnedArticle(article)"
                    :title="isPinnedArticle(article) ? '取消置頂' : '置頂'"
                    :disabled="loading"
                  >
                    📌
                  </button>
                  <button class="btn-icon" @click="startInlineEdit(article)" title="編輯">✏️</button>
                  <button class="btn-icon delete" @click="confirmDelete(article)" title="刪除">🗑️</button>
                </div>
              </div>

              <h3 class="note-title">{{ article.title || '無標題' }}</h3>
              <div v-if="article.category" class="note-category-list">
                <div
                  v-for="category in splitCategories(article.category)"
                  :key="article.id + '-' + category"
                  class="note-category"
                  :class="{ pinned: category === PINNED_CATEGORY }"
                >
                  {{ category }}
                </div>
              </div>

              <div class="note-content">
                <p>{{ article.content }}</p>
              </div>

              <div class="note-attachments" v-if="hasAttachments(article)">
                <div class="attachment-group" v-if="article.url1 || article.url2 || article.url3">
                  <h4>🔗 相關連結</h4>
                  <div class="links-list">
                    <a v-if="article.url1" :href="article.url1" target="_blank" class="link-item">{{ article.url1 }}</a>
                    <a v-if="article.url2" :href="article.url2" target="_blank" class="link-item">{{ article.url2 }}</a>
                    <a v-if="article.url3" :href="article.url3" target="_blank" class="link-item">{{ article.url3 }}</a>
                  </div>
                </div>

                <div class="attachment-group" v-if="article.file1 || article.file2 || article.file3">
                  <h4>📎 附件檔案</h4>
                  <div class="files-list">
                    <template v-for="n in 3" :key="'file' + n">
                      <div v-if="article['file' + n]" class="file-item-card">
                        <img
                          v-if="isImageType(article['file' + n + 'type']) && !isMultipartAttachment(article['file' + n])"
                          :src="article['file' + n]"
                          :alt="article['file' + n + 'name'] || '附件'"
                          class="file-preview-img"
                          @click="openPreview(article['file' + n])"
                        />
                        <div v-else class="file-icon-box">📄</div>
                        <div class="file-detail">
                          <span class="file-name">{{ article['file' + n + 'name'] || '附件 ' + n }}</span>
                          <span class="file-type">{{ article['file' + n + 'type'] || 'FILE' }}</span>
                        </div>
                        <button
                          type="button"
                          class="btn-download"
                          title="開啟/下載"
                          :disabled="isAttachmentDownloading(article, n)"
                          @click="downloadAttachment(article, n)"
                        >
                          {{ isAttachmentDownloading(article, n) ? '下載中' : '⬇️' }}
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </main>

      <!-- 圖片預覽 Lightbox -->
      <div v-if="previewUrl" class="lightbox-overlay" @click="closePreview">
        <div class="lightbox-content" @click.stop>
          <button class="lightbox-close" @click="closePreview">✕</button>
          <img :src="previewUrl" alt="預覽" class="lightbox-img" />
        </div>
      </div>
      <RestoreTrashModal
        v-model="trashOpen"
        title="筆記垃圾桶"
        :items="trashedArticles"
        :label-fields="['title']"
        @restore="restoreTrashedArticle"
        @clear="clearArticleTrash"
      />
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import { useArticles } from '../../composables/useArticles'
import { useStorage } from '../../composables/useStorage'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'
import RestoreTrashModal from '../ui/RestoreTrashModal.vue'
import { useLocalTrash } from '../../composables/useLocalTrash'

const {
  articles,
  loading,
  loadArticles,
  addArticle,
  updateArticle,
  deleteArticle: deleteArticleRecord,
  restoreArticle,
  importArticles
} = useArticles()

const trashOpen = ref(false)
const {
  items: trashedArticles,
  load: loadArticleTrash,
  moveToTrash: saveArticlesToTrash,
  remove: removeArticleFromTrash,
  clear: clearArticleTrashRecords,
} = useLocalTrash('fengbro.notes.trash')

const restoreTrashedArticle = async (item) => {
  const result = await restoreArticle(item.record)
  if (result.success) removeArticleFromTrash(item)
  else alert(`還原筆記失敗：${result.error}`)
}

const clearArticleTrash = () => {
  if (!trashedArticles.value.length) return
  if (confirm(`永久清空 ${trashedArticles.value.length} 篇筆記？此操作無法復原。`)) clearArticleTrashRecords()
}

const {
  uploading,
  uploadProgress,
  uploadFile,
  isMultipartManifestUrl,
  resolveMultipartFile
} = useStorage()

// 空表單模板
const emptyForm = () => ({
  title: '', content: '', category: '', newdate: '',
  url1: '', url2: '', url3: '',
  file1: '', file1name: '', file1type: '',
  file2: '', file2name: '', file2type: '',
  file3: '', file3name: '', file3type: ''
})

// 狀態
const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-note-search-history', searchQuery)
const selectedCategoryFilter = ref('')
const ATTACHMENT_FILTER_VALUE = '__with_attachments__'
const PINNED_CATEGORY = '置頂'
const viewMode = ref('table')
const expandedNoteId = ref(null)
const uploadingSlot = ref(null)
const previewUrl = ref(null)
const batchMode = ref(false)
const selectedIds = ref(new Set())
const downloadingAttachments = ref(new Set())
const batchCategoryInput = ref('')
const newAddCategory = ref('')
const newEditCategory = ref('')

const viewOptions = [
  { value: 'table', label: '表格', icon: '▦' },
  { value: 'gallery', label: '圖庫', icon: '▤' },
  { value: 'list', label: '列表', icon: '☰' }
]

const currentViewLabel = computed(() => {
  if (selectedCategoryFilter.value === ATTACHMENT_FILTER_VALUE) return '有附件'
  if (selectedCategoryFilter.value) return selectedCategoryFilter.value
  return '所有筆記'
})

const toggleExpandNote = (id) => {
  expandedNoteId.value = expandedNoteId.value === id ? null : id
}

/** 單篇附件數量（供資料庫列顯示） */
const attachmentCount = (article) => {
  if (!article) return 0
  return [1, 2, 3].filter((n) => article['file' + n]).length
}

// 行內新增
const showAddRow = ref(false)
const addForm = reactive(emptyForm())
const addSection = reactive({ urls: false, files: false })
const addFileInputRefs = {}

// 行內編輯
const editingRowId = ref(null)
const editForm = reactive(emptyForm())
const editSection = reactive({ urls: false, files: false })
const editFileInputRefs = {}

// 初始化
onMounted(() => {
  loadArticleTrash()
  loadArticles()
})

// 搜尋過濾
const hasFileAttachments = (article) => {
  return !!(article.file1 || article.file2 || article.file3)
}

const isPinnedArticle = (article) => {
  return splitCategories(article.category).includes(PINNED_CATEGORY)
}

const sortPinnedArticles = (list) => {
  return [...list].sort((a, b) => {
    const pinRank = Number(isPinnedArticle(b)) - Number(isPinnedArticle(a))
    if (pinRank !== 0) return pinRank
    return new Date(b.newdate || 0) - new Date(a.newdate || 0)
  })
}

const filteredArticles = computed(() => {
  let list = articles.value

  if (selectedCategoryFilter.value) {
    list = selectedCategoryFilter.value === ATTACHMENT_FILTER_VALUE
      ? list.filter(article => hasFileAttachments(article))
      : list.filter(article => splitCategories(article.category).includes(selectedCategoryFilter.value))
  }

  if (!searchQuery.value) return sortPinnedArticles(list)
  
  const query = searchQuery.value.toLowerCase()
  return sortPinnedArticles(list.filter(article => 
    (article.title && article.title.toLowerCase().includes(query)) ||
    (article.content && article.content.toLowerCase().includes(query)) ||
    (article.category && article.category.toLowerCase().includes(query))
  ))
})

const categoryOptions = computed(() => {
  return [...new Set(
    articles.value
      .flatMap(article => splitCategories(article.category))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
})

const splitCategories = (value) => {
  if (!value) return []
  return [...new Set(
    String(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  )]
}

const joinCategories = (categories) => categories.join(', ')

const selectedCategories = (form) => splitCategories(form.category)

const hasCategory = (form, category) => selectedCategories(form).includes(category)

const toggleCategory = (form, category) => {
  const next = selectedCategories(form)

  if (next.includes(category)) {
    form.category = joinCategories(next.filter(item => item !== category))
    return
  }

  form.category = joinCategories([...next, category])
}

const appendCategory = (form, rawCategory, mode) => {
  const category = rawCategory.trim()
  if (!category) return

  const next = selectedCategories(form)
  if (!next.includes(category)) {
    form.category = joinCategories([...next, category])
  }

  if (mode === 'add') newAddCategory.value = ''
  if (mode === 'edit') newEditCategory.value = ''
}

const togglePinnedArticle = async (article) => {
  const categories = splitCategories(article.category)
  const nextCategories = isPinnedArticle(article)
    ? categories.filter(category => category !== PINNED_CATEGORY)
    : [PINNED_CATEGORY, ...categories]

  const result = await updateArticle(article.id, {
    ...article,
    category: joinCategories(nextCategories)
  })

  if (!result.success) {
    alert('置頂更新失敗: ' + result.error)
  }
}

const findArticleById = (id) => articles.value.find(article => article.id === id)

const normalizeBatchCategories = (value) => splitCategories(value)

const applyCategoriesToSelected = async () => {
  const categoriesToApply = normalizeBatchCategories(batchCategoryInput.value)
  if (selectedIds.value.size === 0 || categoriesToApply.length === 0) return

  let successCount = 0
  for (const id of selectedIds.value) {
    const article = findArticleById(id)
    if (!article) continue

    const mergedCategories = [...new Set([
      ...splitCategories(article.category),
      ...categoriesToApply
    ])]

    const result = await updateArticle(id, {
      ...article,
      category: joinCategories(mergedCategories)
    })

    if (result.success) successCount++
  }

  if (successCount > 0) {
    batchCategoryInput.value = ''
  }
}

const clearCategoriesFromSelected = async () => {
  if (selectedIds.value.size === 0) return
  if (!confirm(`確定要清除 ${selectedIds.value.size} 篇筆記的分類嗎？`)) return

  let successCount = 0
  for (const id of selectedIds.value) {
    const article = findArticleById(id)
    if (!article) continue

    const result = await updateArticle(id, {
      ...article,
      category: ''
    })

    if (result.success) successCount++
  }

  if (successCount > 0) {
    batchCategoryInput.value = ''
  }
}

const noteCardModeClass = () => `note-card--${viewMode.value}`

/** 側欄統計 */
const pinnedCount = computed(() => articles.value.filter((article) => isPinnedArticle(article)).length)
const attachmentCountTotal = computed(() => articles.value.filter((article) => hasFileAttachments(article)).length)
const categoryCount = (category) =>
  articles.value.filter((article) => splitCategories(article.category).includes(category)).length

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

// 檢查是否有附件
const hasAttachments = (article) => {
  return article.url1 || article.url2 || article.url3 ||
         hasFileAttachments(article)
}

// 行內新增
const startAddRow = () => {
  Object.assign(addForm, emptyForm())
  addForm.newdate = new Date().toISOString().split('T')[0]
  newAddCategory.value = ''
  addSection.urls = false
  addSection.files = false
  showAddRow.value = true
  editingRowId.value = null
}

const cancelAddRow = () => {
  showAddRow.value = false
}

const saveAddRow = async () => {
  if (!addForm.title && !addForm.content) {
    alert('請至少輸入標題或內容')
    return
  }
  const result = await addArticle({ ...addForm })
  if (result.success) {
    showAddRow.value = false
  } else {
    alert('新增失敗: ' + result.error)
  }
}

// 行內編輯
const startInlineEdit = (article) => {
  const data = { ...article }
  if (data.newdate) data.newdate = data.newdate.split('T')[0]
  Object.assign(editForm, data)
  newEditCategory.value = ''
  editSection.urls = !!(article.url1 || article.url2 || article.url3)
  editSection.files = !!(article.file1 || article.file2 || article.file3)
  editingRowId.value = article.id
  showAddRow.value = false
}

const cancelInlineEdit = () => {
  editingRowId.value = null
}

const saveInlineEdit = async (id) => {
  if (!editForm.title && !editForm.content) {
    alert('請至少輸入標題或內容')
    return
  }
  const result = await updateArticle(id, { ...editForm })
  if (result.success) {
    editingRowId.value = null
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 確認刪除
const confirmDelete = async (article) => {
  if (confirm(`確定要刪除這則筆記嗎？\n標題: ${article.title || '(無標題)'}`)) {
    const result = await deleteArticleRecord(article.id)
    if (result.success) {
      saveArticlesToTrash(article)
      selectedIds.value.delete(article.id)
    }
  }
}

// 批量選擇
const enterBatchMode = () => {
  batchMode.value = true
}

const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value = new Set()
  batchCategoryInput.value = ''
}

const isAllSelected = computed(() => {
  return filteredArticles.value.length > 0 && filteredArticles.value.every(a => selectedIds.value.has(a.id))
})

const toggleSelect = (id) => {
  const s = new Set(selectedIds.value)
  if (s.has(id)) { s.delete(id) } else { s.add(id) }
  selectedIds.value = s
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    const next = new Set(selectedIds.value)
    filteredArticles.value.forEach(article => next.delete(article.id))
    selectedIds.value = next
  } else {
    const next = new Set(selectedIds.value)
    filteredArticles.value.forEach(article => next.add(article.id))
    selectedIds.value = next
  }
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return

  const isDeletingAll = count === articles.value.length

  if (isDeletingAll) {
    const input = prompt(`即將刪除全部 ${count} 筆筆記！\n\n請輸入 DELETE article 確認：`)
    if (input !== 'DELETE article') {
      alert('輸入不正確，已取消刪除')
      return
    }
  } else {
    if (!confirm(`確定要刪除選中的 ${count} 筆筆記嗎？`)) return
  }

  let successCount = 0
  const ids = [...selectedIds.value]
  const deletedRecords = articles.value.filter((article) => selectedIds.value.has(article.id))
  for (const id of ids) {
    const result = await deleteArticleRecord(id)
    if (result.success) successCount++
  }
  saveArticlesToTrash(deletedRecords.filter((record) => !articles.value.some((article) => article.id === record.id)))
  selectedIds.value = new Set()
  batchMode.value = false
  alert(`已刪除 ${successCount} 筆筆記`)
}

const zipFileInput = ref(null)
const zipExporting = ref(false)
const zipImporting = ref(false)
const zipImportProgress = ref(0)
const zipImportStatus = ref('準備匯入...')
const zipImportButtonLabel = computed(() => {
  return zipImporting.value ? `匯入中 ${zipImportProgress.value}%` : '匯入 ZIP'
})

const setZipImportProgress = (percent, status) => {
  zipImportProgress.value = Math.min(100, Math.max(0, Math.round(percent)))
  if (status) zipImportStatus.value = status
}

const parseCsv = (text) => {
  const parseRow = (line) => {
    const cells = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current.trim())
    return cells
  }
  
  const splitIntoRows = (text) => {
    const rows = []
    let current = ''
    let inQuotes = false
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '"') {
        inQuotes = !inQuotes
        current += char
      } else if (char === '\n' && !inQuotes) {
        if (current.trim()) rows.push(current)
        current = ''
      } else {
        current += char
      }
    }
    if (current.trim()) rows.push(current)
    return rows
  }
  
  const lines = splitIntoRows(text)
  if (lines.length < 2) return []
  
  const headers = parseRow(lines[0])
  console.log('CSV Headers:', headers)
  
  return lines.slice(1).map((line, idx) => {
    const cells = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    if (idx === 0) console.log('First row parsed:', obj)
    return obj
  })
}

// ZIP 匯出（format: 'appwrite' | 'supabase'）
const exportArticlesZip = async () => {
  if (articles.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  const header = ['title', 'content', 'category', 'ref', 'newdate', 'url1', 'url2', 'url3', 'file1', 'file1name', 'file1type', 'file2', 'file2name', 'file2type', 'file3', 'file3name', 'file3type']

  zipExporting.value = true
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const filesFolder = zip.folder('files')
    const csvRows = []

    for (let rowIdx = 0; rowIdx < articles.value.length; rowIdx++) {
      const a = articles.value[rowIdx]
      const row = {
        title: a.title || '',
        content: a.content || '',
        category: a.category || '',
        ref: a.ref || '',
        newdate: a.newdate || '',
        url1: a.url1 || '',
        url2: a.url2 || '',
        url3: a.url3 || '',
        file1: a.file1 || '',
        file1name: a.file1name || '',
        file1type: a.file1type || '',
        file2: a.file2 || '',
        file2name: a.file2name || '',
        file2type: a.file2type || '',
        file3: a.file3 || '',
        file3name: a.file3name || '',
        file3type: a.file3type || ''
      }

      // 下載每個 file slot 的附件並存入 ZIP
      for (let slot = 1; slot <= 3; slot++) {
        const fileUrl = row['file' + slot]
        const fileName = row['file' + slot + 'name']
        if (!fileUrl) continue

        try {
          const blob = isMultipartAttachment(fileUrl)
            ? (await resolveMultipartFile(fileUrl)).blob
            : await (async () => {
                const controller = new AbortController()
                const timer = setTimeout(() => controller.abort(), 10000)
                try {
                  const response = await fetch(fileUrl, { signal: controller.signal })
                  if (!response.ok) {
                    throw new Error(`附件下載失敗 (HTTP ${response.status})`)
                  }
                  return await response.blob()
                } finally {
                  clearTimeout(timer)
                }
              })()

          const zipFileName = `${rowIdx}_${slot}_${fileName || 'file'}`
          filesFolder.file(zipFileName, blob)
          row['file' + slot] = `files/${zipFileName}`
        } catch (err) {
          if (err.name === 'AbortError') {
            console.warn(`下載附件逾時 (row ${rowIdx}, slot ${slot}): ${fileUrl}`)
          } else {
            console.warn(`下載附件失敗 (row ${rowIdx}, slot ${slot}):`, err)
          }
        }
      }

      csvRows.push(row)
    }

    // 組裝 CSV
    const csvContent = [
      header,
      ...csvRows.map(row => header.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`))
    ].map(r => r.join(',')).join('\n')

    zip.file('supabase-article.csv', csvContent)

    // 下載 ZIP
    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = 'supabase-article.zip'
    link.click()
    URL.revokeObjectURL(url)

    alert(`匯出成功！共 ${csvRows.length} 筆筆記`)
  } catch (error) {
    console.error('ZIP 匯出失敗:', error)
    alert('匯出失敗：' + error.message)
  } finally {
    zipExporting.value = false
  }
}

// ZIP 匯入
const handleImportZip = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  zipImporting.value = true
  setZipImportProgress(1, '讀取 ZIP 檔案...')
  try {
    const JSZip = (await import('jszip')).default
    setZipImportProgress(5, '解析 ZIP 內容...')
    const zip = await JSZip.loadAsync(file)

    // 找到 CSV 檔案（優先找 appwrite-article.csv / supabase-article.csv，否則找任何 .csv）
    let csvFile = zip.file('appwrite-article.csv') || zip.file('supabase-article.csv')
    if (!csvFile) {
      const csvFiles = zip.file(/\.csv$/i)
      if (csvFiles.length > 0) {
        csvFile = csvFiles[0]
      }
    }
    if (!csvFile) {
      alert('ZIP 檔案中找不到 CSV 檔案')
      return
    }

    setZipImportProgress(12, '讀取 CSV 資料...')
    const rawCsvText = await csvFile.async('text')
    // 移除 BOM 字元
    const csvText = rawCsvText.replace(/^\uFEFF/, '')
    let rows = parseCsv(csvText)
    setZipImportProgress(20, `已解析 ${rows.length} 筆資料`)
    if (rows.length === 0) {
      alert('CSV 檔案無有效資料')
      return
    }

    // 欄位轉換（相容 Appwrite 與 Supabase 格式）
    const firstRow = rows[0]
    const hasAppwriteSystemFields = '$id' in firstRow || '$createdAt' in firstRow || '$collectionId' in firstRow
    const hasNewDateCamel = 'newDate' in firstRow

    if (hasAppwriteSystemFields || hasNewDateCamel) {
      console.log('偵測到 Appwrite/camelCase 格式 ZIP，自動轉換欄位')
      rows = rows.map(r => {
        const mapped = {}
        for (const [key, value] of Object.entries(r)) {
          if (key.startsWith('$')) {
            if (key === '$createdAt' && !r.newDate && !r.newdate) {
              mapped.newdate = value
            }
            continue
          }
          if (key === 'newDate') {
            mapped.newdate = value
          } else {
            mapped[key] = value
          }
        }
        return mapped
      })
    }
    setZipImportProgress(28, '整理匯入欄位...')

    // 統計附件數量
    let fileCount = 0
    for (const row of rows) {
      for (let s = 1; s <= 3; s++) {
        const fp = row['file' + s]
        if (fp && fp.startsWith('files/')) fileCount++
      }
    }

    let confirmMsg = `確定匯入 ${rows.length} 筆筆記資料？`
    if (fileCount > 0) {
      confirmMsg += `\n（含 ${fileCount} 個附件將自動上傳至 Supabase Storage）`
    }
    if (!confirm(confirmMsg)) return
    setZipImportProgress(32, fileCount > 0 ? `準備上傳附件 0/${fileCount}` : '準備寫入資料庫...')

    // MIME type 對照表
    const mimeTypes = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
      pdf: 'application/pdf', zip: 'application/zip', mp3: 'audio/mpeg', mp4: 'video/mp4',
      txt: 'text/plain', json: 'application/json', csv: 'text/csv'
    }
    const getMimeType = (name) => {
      const ext = (name || '').split('.').pop().toLowerCase()
      return mimeTypes[ext] || 'application/octet-stream'
    }

    // 列出 ZIP 中 files/ 目錄下的所有檔案（方便 debug & fallback 比對）
    const allZipFiles = []
    zip.forEach((path, entry) => {
      if (!entry.dir) allZipFiles.push(path)
    })
    console.log('ZIP 內所有檔案:', allZipFiles)

    // 遍歷每筆記錄，上傳附件
    let uploadedCount = 0
    let failedCount = 0
    const updateAttachmentImportProgress = () => {
      if (fileCount === 0) return
      const handledCount = uploadedCount + failedCount
      const percent = 32 + (handledCount / fileCount) * 50
      setZipImportProgress(percent, `上傳附件 ${handledCount}/${fileCount}`)
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      for (let slot = 1; slot <= 3; slot++) {
        const filePath = row['file' + slot]
        if (!filePath) continue
        // 已是完整 URL（Supabase 或其他）直接保留
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) continue

        // 嘗試多種路徑找到 ZIP 中的檔案
        let zipEntry = zip.file(filePath)
        if (!zipEntry && !filePath.startsWith('files/')) {
          zipEntry = zip.file('files/' + filePath)
        }
        if (!zipEntry) {
          // 模糊比對：用檔名末段匹配
          const baseName = filePath.split('/').pop()
          const match = allZipFiles.find(p => p.endsWith('/' + baseName) || p === baseName)
          if (match) zipEntry = zip.file(match)
        }

        if (!zipEntry) {
          console.warn(`ZIP 中找不到檔案: ${filePath}`)
          row['file' + slot] = ''
          failedCount++
          updateAttachmentImportProgress()
          continue
        }

        try {
          const arrayBuffer = await zipEntry.async('arraybuffer')
          const fileName = row['file' + slot + 'name'] || filePath.split('/').pop()
          const mimeType = getMimeType(fileName)
          const fileObj = new File([arrayBuffer], fileName, { type: mimeType })

          console.log(`上傳附件 row=${i} slot=${slot}: ${fileName} (${mimeType}, ${fileObj.size} bytes)`)
          const result = await uploadFile(fileObj, 'article')
          if (result.success) {
            row['file' + slot] = result.url
            uploadedCount++
            updateAttachmentImportProgress()
          } else {
            console.warn(`上傳附件失敗 (row ${i}, slot ${slot}):`, result.error)
            row['file' + slot] = ''
            failedCount++
            updateAttachmentImportProgress()
          }
        } catch (err) {
          console.warn(`處理附件失敗 (row ${i}, slot ${slot}):`, err)
          row['file' + slot] = ''
          failedCount++
          updateAttachmentImportProgress()
        }
      }
    }
    if (fileCount > 0) {
      console.log(`附件上傳完成: 成功 ${uploadedCount}, 失敗 ${failedCount}`)
    }

    setZipImportProgress(88, '寫入筆記資料庫...')
    const result = await importArticles(rows)
    if (result.success) {
      setZipImportProgress(100, '匯入完成')
      let msg = `匯入成功！共 ${result.count} 筆資料`
      if (uploadedCount > 0) msg += `\n附件上傳: ${uploadedCount} 個成功`
      if (failedCount > 0) msg += `\n附件失敗: ${failedCount} 個`
      alert(msg)
    } else {
      alert('匯入失敗: ' + result.error)
    }
  } catch (error) {
    console.error('ZIP 匯入失敗:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    zipImporting.value = false
    zipImportProgress.value = 0
    zipImportStatus.value = '準備匯入...'
    e.target.value = ''
  }
}

// 判斷是否為圖片類型
const isImageType = (type) => {
  if (!type) return false
  const t = type.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(t)
}

// 取得檔案副檔名
const getFileExt = (filename) => {
  if (!filename) return ''
  return filename.split('.').pop().toLowerCase()
}

const isMultipartAttachment = (url) => isMultipartManifestUrl(url)

const triggerBlobDownload = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName || 'attachment'
  link.click()
  URL.revokeObjectURL(objectUrl)
}

const resolveAttachmentBlob = async (fileUrl) => {
  if (isMultipartAttachment(fileUrl)) {
    return await resolveMultipartFile(fileUrl)
  }

  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`附件下載失敗 (HTTP ${response.status})`)
  }

  return {
    blob: await response.blob(),
    manifest: null
  }
}

const getAttachmentDownloadKey = (article, slot) => `${article?.id || 'new'}-${slot}`

const isAttachmentDownloading = (article, slot) => {
  return downloadingAttachments.value.has(getAttachmentDownloadKey(article, slot))
}

const downloadAttachment = async (article, slot) => {
  const fileUrl = article?.['file' + slot]
  const fileName = article?.['file' + slot + 'name'] || `attachment-${slot}`
  if (!fileUrl) return
  const downloadKey = getAttachmentDownloadKey(article, slot)
  if (downloadingAttachments.value.has(downloadKey)) return

  const nextDownloading = new Set(downloadingAttachments.value)
  nextDownloading.add(downloadKey)
  downloadingAttachments.value = nextDownloading

  try {
    const { blob } = await resolveAttachmentBlob(fileUrl)
    triggerBlobDownload(blob, fileName)
  } catch (error) {
    console.error('下載附件失敗:', error)
    alert('下載附件失敗: ' + error.message)
  } finally {
    const next = new Set(downloadingAttachments.value)
    next.delete(downloadKey)
    downloadingAttachments.value = next
  }
}

// 觸發檔案選擇（mode: 'add' | 'edit'）
const closePreview = () => {
  if (typeof previewUrl.value === 'string' && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
}

const triggerFileInput = (slot, mode) => {
  if (mode === 'add') addFileInputRefs[slot]?.click()
  else editFileInputRefs[slot]?.click()
}

// 上傳檔案（mode: 'add' | 'edit'）
const handleFileUpload = async (e, slot, mode) => {
  const file = e.target.files?.[0]
  if (!file) return
  const form = mode === 'add' ? addForm : editForm
  uploadingSlot.value = mode + '-' + slot
  const result = await uploadFile(file, 'article')
  if (result.success) {
    form['file' + slot] = result.url
    form['file' + slot + 'name'] = file.name
    form['file' + slot + 'type'] = getFileExt(file.name)
  } else {
    alert('上傳失敗: ' + result.error)
  }
  uploadingSlot.value = null
  e.target.value = ''
}

// 拖曳上傳（mode: 'add' | 'edit'）
const handleFileDrop = async (e, slot, mode) => {
  const file = e.dataTransfer.files?.[0]
  if (!file) return
  const form = mode === 'add' ? addForm : editForm
  uploadingSlot.value = mode + '-' + slot
  const result = await uploadFile(file, 'article')
  if (result.success) {
    form['file' + slot] = result.url
    form['file' + slot + 'name'] = file.name
    form['file' + slot + 'type'] = getFileExt(file.name)
  } else {
    alert('上傳失敗: ' + result.error)
  }
  uploadingSlot.value = null
}

// 開啟大圖預覽
const openPreview = async (url) => {
  if (!url) return

  closePreview()

  if (!isMultipartAttachment(url)) {
    previewUrl.value = url
    return
  }

  try {
    const { blob } = await resolveAttachmentBlob(url)
    previewUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('預覽附件失敗:', error)
    alert('預覽附件失敗: ' + error.message)
  }
}

// SEO
useHead({
  title: '鋒兄筆記 - 鋒兄AI Supabase',
  meta: [
    { name: 'description', content: '記錄生活點滴與重要資訊' }
  ]
})
</script>

<style scoped>
/* ============================================================
   鋒兄筆記 — Notion 風格
   · 左側工作區側欄、麵包屑、大標題頁首
   · 資料庫檢視分頁：表格／圖庫／列表
   · 幾乎無彩、髮絲線、pastel 標籤、hover 才浮現的操作
   ============================================================ */
.note-page {
  --nb-bg: #ffffff;
  --nb-sidebar: #f7f7f5;
  --nb-hover: rgba(55, 53, 47, 0.06);
  --nb-active: rgba(55, 53, 47, 0.1);
  --nb-line: rgba(55, 53, 47, 0.12);
  --nb-line-soft: rgba(55, 53, 47, 0.07);
  --nb-text: #37352f;
  --nb-text-2: #6b6960;
  --nb-text-3: #9b9a97;
  --nb-blue: #2383e2;
  --nb-red: #eb5757;
  --nb-yellow: #fbf3db;
  --nb-yellow-text: #8a6d20;
  --nb-tag-bg: rgba(55, 53, 47, 0.08);

  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 0;
  min-height: 70vh;
  border: 1px solid var(--nb-line-soft);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--nb-bg);
  color: var(--nb-text);
  font-family: var(--font-body);
}

.dark .note-page {
  --nb-bg: #191919;
  --nb-sidebar: #202020;
  --nb-hover: rgba(255, 255, 255, 0.055);
  --nb-active: rgba(255, 255, 255, 0.1);
  --nb-line: rgba(255, 255, 255, 0.13);
  --nb-line-soft: rgba(255, 255, 255, 0.08);
  --nb-text: #e9e9e7;
  --nb-text-2: #a5a49f;
  --nb-text-3: #7b7a76;
  --nb-yellow: #3a2f14;
  --nb-yellow-text: #e5c07b;
  --nb-tag-bg: rgba(255, 255, 255, 0.09);
}

/* ══════════ 側欄 ══════════ */
.nb-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-3);
  background: var(--nb-sidebar);
  border-right: 1px solid var(--nb-line-soft);
}

.nb-workspace {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  border-radius: var(--radius-sm);
}

.nb-ws-icon {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  background: var(--nb-text);
  color: var(--nb-bg);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-xs);
}

.nb-ws-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nb-ws-copy strong {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--nb-text);
}

.nb-ws-copy span {
  font-size: var(--text-2xs);
  color: var(--nb-text-3);
}

.nb-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nb-nav-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  height: 30px;
  padding: 0 var(--sp-2);
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--nb-text-2);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.nb-nav-item:hover:not(:disabled) {
  background: var(--nb-hover);
  color: var(--nb-text);
}

.nb-nav-item.active {
  background: var(--nb-active);
  color: var(--nb-text);
  font-weight: 500;
}

.nb-nav-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nb-nav-icon {
  flex: 0 0 18px;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--nb-text-3);
}

.nb-nav-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nb-nav-count {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--nb-text-3);
}

.nb-nav-empty {
  margin: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--nb-text-3);
}

.nb-section-title {
  margin: 0 var(--sp-2) var(--sp-1);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--nb-text-3);
}

.nb-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.nb-sidebar-foot {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--nb-line-soft);
}

/* ══════════ 主要頁面 ══════════ */
.nb-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-6) var(--sp-8);
  overflow-x: hidden;
}

.nb-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--nb-text-3);
}

.nb-crumb-sep {
  opacity: 0.6;
}

.nb-crumb-current {
  color: var(--nb-text-2);
}

.nb-page-head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding-top: var(--sp-2);
}

.nb-page-icon {
  font-size: 2.25rem;
  line-height: 1;
}

.nb-page-copy {
  flex: 1;
  min-width: 0;
}

.nb-page-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 1.1rem + 1.4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--nb-text);
}

.nb-page-sub {
  margin: var(--sp-1) 0 0;
  font-size: var(--text-xs);
  color: var(--nb-text-3);
}

.nb-new-btn {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: none;
  background: var(--nb-blue);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: filter var(--transition-fast);
}

.nb-new-btn:hover {
  filter: brightness(1.08);
}

.nb-new-btn--ghost {
  background: transparent;
  border: 1px solid var(--nb-line);
  color: var(--nb-text-2);
}

.nb-new-btn--ghost:hover {
  background: var(--nb-hover);
  color: var(--nb-text);
}

/* ══════════ 工具列 + 檢視分頁 ══════════ */
.nb-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  border-bottom: 1px solid var(--nb-line-soft);
  padding-bottom: var(--sp-2);
}

.nb-view-tabs {
  display: flex;
  gap: var(--sp-1);
}

.nb-view-tab {
  height: 28px;
  padding: 0 var(--sp-2);
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--nb-text-3);
  font-size: var(--text-sm);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.nb-view-tab:hover {
  background: var(--nb-hover);
  color: var(--nb-text);
}

.nb-view-tab.active {
  color: var(--nb-text);
  font-weight: 600;
  border-bottom-color: var(--nb-text);
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
}

.nb-toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.search-area {
  flex: 1 1 200px;
  min-width: 180px;
}

.search-area :deep(input) {
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: var(--nb-hover);
  color: var(--nb-text);
  font-size: var(--text-sm);
}

.search-area :deep(input:focus) {
  outline: none;
  border-color: var(--nb-blue);
  background: var(--nb-bg);
}

.category-filter-select {
  height: 30px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line);
  background: var(--nb-bg);
  color: var(--nb-text);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-batch-mode,
.btn-cancel-batch,
.btn-batch-apply,
.btn-batch-clear {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line);
  background: var(--nb-bg);
  color: var(--nb-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-batch-mode:hover,
.btn-cancel-batch:hover,
.btn-batch-apply:hover:not(:disabled),
.btn-batch-clear:hover:not(:disabled) {
  background: var(--nb-hover);
  color: var(--nb-text);
}

.btn-batch-apply:disabled,
.btn-batch-clear:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-batch-delete {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in oklab, var(--nb-red) 40%, transparent);
  background: color-mix(in oklab, var(--nb-red) 10%, transparent);
  color: var(--nb-red);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
}

.btn-batch-delete:hover:not(:disabled) {
  background: var(--nb-red);
  color: #fff;
}

.batch-category-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  padding: var(--sp-3);
  border-radius: var(--radius-sm);
  background: var(--nb-yellow);
  border: 1px solid var(--nb-line-soft);
}

.batch-category-input {
  flex: 1;
  min-width: 200px;
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line);
  background: var(--nb-bg);
  color: var(--nb-text);
  font-size: var(--text-sm);
}

.select-all-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--nb-yellow-text);
  cursor: pointer;
}

.select-all-label input,
.card-checkbox input {
  accent-color: var(--nb-blue);
  cursor: pointer;
}

/* ══════════ 匯入進度 ══════════ */
.zip-import-progress {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line-soft);
  background: var(--nb-hover);
}

.zip-import-progress-head {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--nb-text-2);
}

.zip-import-progress-bar {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--nb-line-soft);
  overflow: hidden;
}

.zip-import-progress-fill {
  height: 100%;
  background: var(--nb-blue);
  transition: width var(--transition-normal);
}

/* ══════════ 狀態 ══════════ */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-16) var(--sp-4);
  color: var(--nb-text-3);
  font-size: var(--text-sm);
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--nb-line);
  border-top-color: var(--nb-blue);
  animation: nbSpin 0.8s linear infinite;
}

@keyframes nbSpin {
  to { transform: rotate(360deg); }
}

/* ══════════ 資料庫容器 ══════════ */
.notes-container--table,
.notes-container--list {
  display: flex;
  flex-direction: column;
}

.notes-container--gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: var(--sp-3);
}

.table-head {
  display: grid;
  grid-template-columns: 18px minmax(0, 2.2fr) minmax(0, 1.4fr) 108px 76px 104px;
  gap: var(--sp-3);
  align-items: center;
  padding: 0 var(--sp-2) var(--sp-2);
  border-bottom: 1px solid var(--nb-line);
}

.th {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nb-text-3);
}

.th-title {
  grid-column: 2;
}

/* ══════════ 資料庫列 ══════════ */
.note-card {
  min-width: 0;
}

.notes-container--table .note-card:not(.note-card-editing),
.notes-container--list .note-card:not(.note-card-editing) {
  border-bottom: 1px solid var(--nb-line-soft);
}

.db-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 2.2fr) minmax(0, 1.4fr) 108px 76px 104px;
  gap: var(--sp-3);
  align-items: center;
  min-height: 38px;
  padding: var(--sp-2);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background var(--transition-fast);
}

.db-row:hover {
  background: var(--nb-hover);
}

.note-selected .db-row {
  background: color-mix(in oklab, var(--nb-blue) 10%, transparent);
}

.notes-container--list .db-row,
.notes-container--list .table-head {
  grid-template-columns: 18px minmax(0, 1fr) auto;
}

.notes-container--list .row-tags,
.notes-container--list .row-date,
.notes-container--list .row-files {
  display: none;
}

.row-handle {
  color: var(--nb-text-3);
  opacity: 0;
  font-size: 0.75rem;
  cursor: grab;
  transition: opacity var(--transition-fast);
}

.db-row:hover .row-handle {
  opacity: 0.6;
}

.card-checkbox {
  display: inline-flex;
  align-items: center;
}

.row-title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.row-page-icon {
  font-size: 0.8125rem;
}

.row-title-text {
  font-size: var(--text-sm);
  color: var(--nb-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: 1px solid transparent;
}

.db-row:hover .row-title-text {
  border-bottom-color: var(--nb-line);
}

.row-open-hint {
  flex: 0 0 auto;
  font-size: var(--text-2xs);
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--nb-line);
  color: var(--nb-text-3);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.db-row:hover .row-open-hint {
  opacity: 1;
}

.row-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  overflow: hidden;
}

.row-date {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--nb-text-3);
}

.row-files {
  font-size: var(--text-2xs);
  color: var(--nb-text-3);
}

.files-chip {
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  background: var(--nb-tag-bg);
}

.row-tools {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.db-row:hover .row-tools,
.note-card.is-expanded .row-tools {
  opacity: 1;
}

.db-peek {
  padding: var(--sp-3) var(--sp-4) var(--sp-5) calc(18px + var(--sp-3) + var(--sp-2));
  border-left: 2px solid var(--nb-line);
  margin: 0 0 var(--sp-3) var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* ══════════ 圖庫卡片 ══════════ */
.notes-container--gallery .note-card:not(.note-card-editing) {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border: 1px solid var(--nb-line-soft);
  border-radius: var(--radius-md);
  background: var(--nb-bg);
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.05);
  transition: box-shadow var(--transition-fast), background var(--transition-fast);
}

.notes-container--gallery .note-card:not(.note-card-editing):hover {
  background: var(--nb-hover);
  box-shadow: 0 2px 6px rgba(15, 15, 15, 0.08);
}

.notes-container--gallery .note-selected {
  outline: 2px solid var(--nb-blue);
  outline-offset: 1px;
}

.note-pinned .note-title::before {
  content: '📌 ';
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.note-page-icon {
  font-size: 0.8125rem;
}

.note-date {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--nb-text-3);
}

.note-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.note-card:hover .note-actions {
  opacity: 1;
}

.btn-icon {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--nb-text-2);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-icon:hover:not(:disabled) {
  background: var(--nb-active);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon.pin {
  filter: grayscale(1);
  opacity: 0.6;
}

.btn-icon.pin.active {
  filter: none;
  opacity: 1;
}

.btn-icon.delete:hover {
  color: var(--nb-red);
}

.note-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: 1.3;
  color: var(--nb-text);
}

.note-category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.note-category {
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  background: var(--nb-tag-bg);
  color: var(--nb-text-2);
  white-space: nowrap;
}

.note-category.pinned {
  background: var(--nb-yellow);
  color: var(--nb-yellow-text);
}

.note-content {
  font-size: var(--text-sm);
  line-height: 1.68;
  color: var(--nb-text-2);
}

.note-content p {
  margin: 0;
  white-space: pre-wrap;
}

.notes-container--gallery .note-content p {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ══════════ 連結與附件 ══════════ */
.note-attachments {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--nb-line-soft);
}

.attachment-group h4 {
  margin: 0 0 var(--sp-2);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nb-text-3);
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-item {
  font-size: var(--text-xs);
  color: var(--nb-blue);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in oklab, var(--nb-blue) 30%, transparent);
  align-self: flex-start;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-item:hover {
  background: var(--nb-hover);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.file-item-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line-soft);
  background: var(--nb-hover);
}

.file-preview-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  cursor: zoom-in;
}

.file-icon-box {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  background: var(--nb-tag-bg);
}

.file-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: var(--text-xs);
  color: var(--nb-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-type {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  color: var(--nb-text-3);
}

.btn-download {
  width: 30px;
  height: 30px;
  border: 1px solid var(--nb-line);
  border-radius: var(--radius-xs);
  background: var(--nb-bg);
  color: var(--nb-text-2);
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-download:hover:not(:disabled) {
  background: var(--nb-hover);
}

.btn-download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ══════════ 行內編輯表單 ══════════ */
.note-card-editing {
  grid-column: 1 / -1;
  padding: var(--sp-4);
  border: 1px solid var(--nb-line);
  border-radius: var(--radius-md);
  background: var(--nb-bg);
  box-shadow: 0 4px 16px rgba(15, 15, 15, 0.09);
  margin: var(--sp-2) 0;
}

.inline-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.inline-row {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.inline-input,
.inline-textarea,
.batch-category-input {
  font-family: inherit;
}

.inline-input {
  flex: 1;
  min-width: 140px;
  height: 32px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-xs);
  border: 1px solid var(--nb-line-soft);
  background: var(--nb-hover);
  color: var(--nb-text);
  font-size: var(--text-sm);
}

.inline-input:focus,
.inline-textarea:focus {
  outline: none;
  border-color: var(--nb-blue);
  background: var(--nb-bg);
}

.inline-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  height: 42px;
  border-color: transparent;
  background: transparent;
  padding-left: 0;
}

.inline-date {
  flex: 0 0 150px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.inline-textarea {
  width: 100%;
  padding: var(--sp-2);
  border-radius: var(--radius-xs);
  border: 1px solid var(--nb-line-soft);
  background: var(--nb-hover);
  color: var(--nb-text);
  font-size: var(--text-sm);
  line-height: 1.68;
  resize: vertical;
}

.category-picker {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line-soft);
  background: var(--nb-hover);
}

.category-picker-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--nb-text-3);
}

.category-selected-list,
.category-option-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.category-chip {
  height: 24px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-xs);
  border: 1px solid transparent;
  background: var(--nb-tag-bg);
  color: var(--nb-text-2);
  font-size: var(--text-2xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-chip:hover {
  border-color: var(--nb-line);
  color: var(--nb-text);
}

.category-chip.selected {
  background: color-mix(in oklab, var(--nb-blue) 16%, transparent);
  color: var(--nb-blue);
}

.category-input-row {
  display: flex;
  gap: var(--sp-2);
}

.btn-category-add {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-xs);
  border: 1px solid var(--nb-line);
  background: var(--nb-bg);
  color: var(--nb-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-category-add:hover {
  background: var(--nb-hover);
  color: var(--nb-text);
}

.inline-section {
  border-top: 1px solid var(--nb-line-soft);
  padding-top: var(--sp-2);
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 0 var(--sp-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--nb-text-2);
  cursor: pointer;
  user-select: none;
}

.section-caret {
  color: var(--nb-text-3);
  font-size: 0.6875rem;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.mb-2 { margin-bottom: var(--sp-2); }
.mb-3 { margin-bottom: var(--sp-3); }

.attachment-upload-item {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.attachment-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  color: var(--nb-text-3);
}

.attachment-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line-soft);
  background: var(--nb-hover);
}

.attachment-preview-content {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.attachment-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: var(--radius-xs);
}

.attachment-file-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  background: var(--nb-tag-bg);
}

.attachment-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.attachment-name {
  font-size: var(--text-xs);
  color: var(--nb-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-type-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  color: var(--nb-text-3);
}

.btn-remove-attachment {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--nb-text-3);
  cursor: pointer;
}

.btn-remove-attachment:hover {
  background: var(--nb-active);
  color: var(--nb-red);
}

.attachment-drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  min-height: 52px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--nb-line);
  color: var(--nb-text-3);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.attachment-drop-zone:hover {
  border-color: var(--nb-blue);
  color: var(--nb-blue);
  background: var(--nb-hover);
}

.attachment-progress {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.progress-bar {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--nb-line-soft);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--nb-blue);
  transition: width var(--transition-normal);
}

.progress-text {
  font-size: var(--text-2xs);
  color: var(--nb-text-3);
}

.inline-actions {
  display: flex;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--nb-line-soft);
}

.btn-save-icon {
  height: 32px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-sm);
  border: none;
  background: var(--nb-blue);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}

.btn-save-icon:hover {
  filter: brightness(1.08);
}

.btn-cancel-icon {
  height: 32px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--nb-line);
  background: transparent;
  color: var(--nb-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-cancel-icon:hover {
  background: var(--nb-hover);
  color: var(--nb-text);
}

/* ══════════ Lightbox ══════════ */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-popover);
  display: grid;
  place-items: center;
  padding: var(--sp-6);
  background: rgba(15, 15, 15, 0.8);
}

.lightbox-content {
  position: relative;
  max-width: min(90vw, 1000px);
  max-height: 88vh;
}

.lightbox-img {
  max-width: 100%;
  max-height: 88vh;
  object-fit: contain;
  border-radius: var(--radius-sm);
  display: block;
}

.lightbox-close {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #37352f;
  font-size: 0.875rem;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

/* ══════════ 響應式 ══════════ */
@media (max-width: 1024px) {
  .note-page {
    grid-template-columns: minmax(0, 1fr);
  }

  .nb-sidebar {
    flex-direction: row;
    align-items: center;
    gap: var(--sp-3);
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--nb-line-soft);
  }

  .nb-section {
    overflow: visible;
  }

  .nb-nav {
    flex-direction: row;
  }

  .nb-nav-item {
    width: auto;
    white-space: nowrap;
  }

  .nb-section-title {
    display: none;
  }

  .nb-sidebar-foot {
    flex-direction: row;
    border-top: none;
    padding-top: 0;
  }

  .nb-main {
    padding: var(--sp-4);
  }
}

@media (max-width: 768px) {
  .table-head {
    display: none;
  }

  .db-row,
  .notes-container--list .db-row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--sp-1);
  }

  .row-handle,
  .row-open-hint {
    display: none;
  }

  .row-tags,
  .row-date,
  .row-files {
    grid-column: 1 / -1;
  }

  .row-tools {
    opacity: 1;
  }

  .note-actions {
    opacity: 1;
  }

  .notes-container--gallery {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .db-row,
  .btn-icon,
  .nb-nav-item {
    transition: none;
  }

  .spinner {
    animation: none;
  }
}
</style>
