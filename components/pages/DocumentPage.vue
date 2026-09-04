<template>
  <PageContainer>
    <div class="document-page">
      <!-- ══ Drive 式頂欄：麵包屑 + 搜尋 ══ -->
      <header class="dr-topbar">
        <div class="dr-crumbs">
          <span class="dr-drive-mark" aria-hidden="true">▲</span>
          <span class="dr-crumb-root">鋒兄雲端硬碟</span>
          <template v-if="filterCategory">
            <span class="dr-crumb-sep">›</span>
            <span class="dr-crumb-current">{{ filterCategory }}</span>
          </template>
        </div>
        <div class="search-group search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋雲端硬碟中的文件..."
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <div class="dr-topbar-tools">
          <button class="dr-new-btn" @click="openInlineAdd">＋ 新增</button>
        </div>
      </header>

      <!-- ══ MEGA 式容量儀表 ══ -->
      <section class="mg-storage" aria-label="儲存狀態">
        <div class="mg-dial" role="img" :aria-label="`已使用 ${storageStats.usedPercent}%`">
          <svg viewBox="0 0 42 42" class="mg-dial-svg" aria-hidden="true">
            <circle class="mg-dial-track" cx="21" cy="21" r="16" />
            <circle
              class="mg-dial-value"
              cx="21"
              cy="21"
              r="16"
              :stroke-dasharray="`${storageStats.usedPercent} ${100 - storageStats.usedPercent}`"
            />
          </svg>
          <span class="mg-dial-label">{{ storageStats.usedPercent }}%</span>
        </div>
        <div class="mg-storage-copy">
          <p class="mg-storage-title">儲存空間</p>
          <p class="mg-storage-line">
            <strong>{{ documents.length }}</strong> 個項目 ·
            <strong>{{ storageStats.withFile }}</strong> 個有檔案 ·
            <strong>{{ availableCategories.length }}</strong> 個分類
          </p>
          <div class="mg-bar" aria-hidden="true">
            <span class="mg-bar-fill" :style="{ width: `${storageStats.usedPercent}%` }"></span>
          </div>
        </div>
        <div class="mg-kinds">
          <span v-for="kind in storageStats.kinds" :key="kind.key" class="mg-kind">
            <span class="mg-kind-icon" :class="`kind-${kind.key}`">{{ kind.icon }}</span>
            <span class="mg-kind-copy"><strong>{{ kind.count }}</strong>{{ kind.label }}</span>
          </span>
        </div>
        <div class="csv-actions">
          <button
            v-if="documents.length > 0"
            @click="exportToZip"
            class="btn btn-export"
            :disabled="importProgress.active"
          >
            匯出 ZIP
          </button>
          <button
            v-if="documents.length > 0"
            @click="exportDocumentsCsv"
            class="btn btn-export btn-export-secondary"
            :disabled="importProgress.active"
          >
            匯出 CSV
          </button>
          <label class="btn btn-import" :class="{ disabled: importProgress.active }">
            匯入 ZIP/CSV
            <input
              type="file"
              accept=".zip,.csv,text/csv"
              @change="handleImportFile"
              :disabled="importProgress.active"
              style="display: none"
            />
          </label>
        </div>
      </section>

      <!-- ══ Drive 式快速存取 ══ -->
      <section v-if="quickAccess.length > 0 && !searchQuery" class="dr-quick" aria-label="快速存取">
        <h2 class="dr-quick-title">快速存取</h2>
        <div class="dr-quick-row">
          <button
            v-for="doc in quickAccess"
            :key="'quick-' + doc.id"
            type="button"
            class="dr-quick-card"
            :class="{ active: detailDocument && detailDocument.id === doc.id }"
            @click="openDetails(doc)"
            @dblclick="doc.file && openFilePreview(doc)"
          >
            <span class="dr-quick-thumb">
              <img v-if="doc.cover" :src="doc.cover" :alt="doc.name" loading="lazy" />
              <img v-else-if="doc.file && isImageUrl(doc.file)" :src="doc.file" :alt="doc.name" loading="lazy" />
              <span v-else class="dr-file-icon" :class="`kind-${fileKind(doc).key}`">{{ fileKind(doc).icon }}</span>
            </span>
            <span class="dr-quick-copy">
              <strong>{{ doc.name || '未命名' }}</strong>
              <span>{{ doc.category || '未分類' }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- ══ 工具列：篩選 + 檢視切換 + 批次 ══ -->
      <div class="dr-toolbar">
        <div class="filter-group">
          <select v-model="filterCategory" class="filter-select">
            <option value="">全部分類</option>
            <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <button v-if="filterCategory" class="btn-clear-filter" @click="filterCategory = ''" title="清除篩選">✕</button>
        </div>

        <span class="dr-count">
          <template v-if="filterCategory || searchQuery">篩選結果 {{ filteredDocuments.length }} / 共 {{ documents.length }} 項</template>
          <template v-else>共 {{ documents.length }} 個項目</template>
        </span>
        <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>

        <div class="dr-toolbar-spacer"></div>

        <button v-if="!batchMode && filteredDocuments.length > 0" @click="enterBatchMode" class="btn-batch-mode">選取</button>
        <template v-if="batchMode">
          <label class="select-all-label">
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
            <span>全選</span>
          </label>
          <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除 ({{ selectedIds.size }})</button>
        </template>

        <div class="view-switcher" role="group" aria-label="文件顯示模式">
          <button
            type="button"
            class="view-switch-btn"
            :class="{ active: documentViewMode === 'card' }"
            title="格線檢視"
            @click="setDocumentViewMode('card')"
          >
            ▦ 格線
          </button>
          <button
            type="button"
            class="view-switch-btn"
            :class="{ active: documentViewMode === 'list' }"
            title="清單檢視"
            @click="setDocumentViewMode('list')"
          >
            ☰ 清單
          </button>
        </div>
        <button
          type="button"
          class="view-switch-btn dr-detail-toggle"
          :class="{ active: showDetailPane }"
          title="詳細資料窗格"
          @click="showDetailPane = !showDetailPane"
        >
          ⓘ 詳細資料
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>載入中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredDocuments.length === 0 && !isAddingInline" class="empty-state">
        <div class="empty-icon">📁</div>
        <p class="empty-text">
          {{ searchQuery ? '找不到符合的文件' : '這個資料夾是空的' }}
        </p>
        <button v-if="!searchQuery" @click="openInlineAdd" class="btn btn-primary">
          新增第一筆文件
        </button>
      </div>

      <div class="dr-workspace" :class="{ 'with-detail': showDetailPane }">
        <!-- Documents Grid -->
        <div v-if="isAddingInline || filteredDocuments.length > 0" :class="['documents-grid', `documents-grid--${documentViewMode}`]">

          <!-- 清單表頭（Dropbox 式欄位） -->
          <div v-if="documentViewMode === 'list' && filteredDocuments.length > 0" class="dr-list-head" aria-hidden="true">
            <span class="col-name">名稱</span>
            <span class="col-category">分類</span>
            <span class="col-file">檔案</span>
            <span class="col-date">修改時間</span>
            <span class="col-tools"></span>
          </div>

          <!-- 行內新增卡片 -->
          <div v-if="isAddingInline" class="document-card card-editing">
            <div class="card-header">
              <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="文件名稱" autofocus>
              <div class="card-actions">
                <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
              </div>
            </div>
            <div class="card-body inline-edit-content">
              <div class="inline-edit-form">
                <div class="inline-field-row">
                  <label>分類</label>
                  <input v-model="addForm.category" type="text" class="inline-input" placeholder="分類">
                </div>
                <div class="inline-field-row">
                  <label>備註</label>
                  <textarea v-model="addForm.note" class="inline-input inline-textarea" rows="3" placeholder="備註"></textarea>
                </div>
                <div class="inline-field-row">
                  <label>參考</label>
                  <input v-model="addForm.ref" type="text" class="inline-input" placeholder="參考">
                </div>
                <div class="inline-field-row">
                  <label>Hash</label>
                  <input v-model="addForm.hash" type="text" class="inline-input" placeholder="Hash">
                </div>
                <div class="inline-field-row">
                  <label>檔案</label>
                  <div class="inline-upload-area">
                    <label class="btn-inline-upload" :class="{ disabled: addFileUploading }">
                      {{ addFileUploading ? '上傳中...' : '選擇檔案' }}
                      <input
                        type="file"
                        multiple
                        style="display:none"
                        :disabled="addFileUploading"
                        @change="handleAddFileUpload"
                      />
                    </label>
                    <span v-if="addForm.file" class="inline-file-name">
                      {{ isCsvUrl(addForm.file) ? '📊' : '📎' }} {{ getFileName(addForm.file) }}
                      <button type="button" class="btn-inline-remove" @click="addForm.file = ''">✕</button>
                    </span>
                    <img v-if="addForm.file && isImageUrl(addForm.file)" :src="addForm.file" class="inline-img-preview" alt="預覽" />
                    <div v-else-if="addForm.file && isCsvUrl(addForm.file)" class="inline-csv-chip">CSV 檔 · 儲存後可表格預覽</div>
                    <input v-model="addForm.file" type="text" class="inline-input" placeholder="或輸入檔案 URL" style="margin-top:4px">
                  </div>
                </div>
                <div class="inline-field-row">
                  <label>封面URL</label>
                  <input v-model="addForm.cover" type="text" class="inline-input" placeholder="封面 URL">
                </div>
              </div>
            </div>
          </div>

          <div
            v-for="document in filteredDocuments"
            :key="document.id"
            class="document-card"
            :class="{
              'batch-selected': selectedIds.has(document.id),
              'card-editing': inlineEditingId === document.id,
              'document-card--list': documentViewMode === 'list' && inlineEditingId !== document.id,
              'is-active': detailDocument && detailDocument.id === document.id
            }"
            @click="batchMode ? toggleSelect(document.id) : openDetails(document)"
            @dblclick="!batchMode && document.file && openFilePreview(document)"
          >
            <!-- 行內編輯模式 -->
            <template v-if="inlineEditingId === document.id">
              <div class="card-header">
                <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="文件名稱">
                <div class="card-actions">
                  <button class="btn-icon save" @click="saveInlineEdit" title="儲存">💾</button>
                  <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
                </div>
              </div>
              <div class="card-body inline-edit-content">
                <div class="inline-edit-form">
                  <div class="inline-field-row">
                    <label>分類</label>
                    <input v-model="editForm.category" type="text" class="inline-input" placeholder="分類">
                  </div>
                  <div class="inline-field-row">
                    <label>備註</label>
                    <textarea v-model="editForm.note" class="inline-input inline-textarea" rows="3" placeholder="備註"></textarea>
                  </div>
                  <div class="inline-field-row">
                    <label>參考</label>
                    <input v-model="editForm.ref" type="text" class="inline-input" placeholder="參考">
                  </div>
                  <div class="inline-field-row">
                    <label>Hash</label>
                    <input v-model="editForm.hash" type="text" class="inline-input" placeholder="Hash">
                  </div>
                  <div class="inline-field-row">
                    <label>檔案</label>
                    <div class="inline-upload-area">
                      <label class="btn-inline-upload" :class="{ disabled: inlineFileUploading }">
                        {{ inlineFileUploading ? '上傳中...' : '選擇檔案' }}
                        <input
                          type="file"
                          style="display:none"
                          :disabled="inlineFileUploading"
                          @change="handleInlineFileUpload"
                        />
                      </label>
                      <span v-if="editForm.file" class="inline-file-name">
                        {{ isCsvUrl(editForm.file) ? '📊' : '📎' }} {{ getFileName(editForm.file) }}
                        <button type="button" class="btn-inline-remove" @click="editForm.file = ''">✕</button>
                      </span>
                      <img v-if="editForm.file && isImageUrl(editForm.file)" :src="editForm.file" class="inline-img-preview" alt="預覽" />
                      <div v-else-if="editForm.file && isCsvUrl(editForm.file)" class="inline-csv-chip">CSV 檔 · 可表格預覽</div>
                      <input v-model="editForm.file" type="text" class="inline-input" placeholder="或輸入檔案 URL" style="margin-top:4px">
                    </div>
                  </div>
                  <div class="inline-field-row">
                    <label>封面URL</label>
                    <input v-model="editForm.cover" type="text" class="inline-input" placeholder="封面 URL">
                  </div>
                </div>
              </div>
            </template>

            <!-- ══ 清單列（Dropbox 式） ══ -->
            <template v-else-if="documentViewMode === 'list'">
              <span class="col-name">
                <input
                  v-if="batchMode"
                  type="checkbox"
                  class="row-check"
                  :checked="selectedIds.has(document.id)"
                  @click.stop="toggleSelect(document.id)"
                />
                <span class="dr-file-icon" :class="`kind-${fileKind(document).key}`">{{ fileKind(document).icon }}</span>
                <span class="col-name-copy">
                  <span class="card-title">{{ document.name || '未命名' }}</span>
                  <span v-if="document.note" class="col-note">{{ truncateText(document.note, 60) }}</span>
                </span>
              </span>
              <span class="col-category">
                <span v-if="document.category" class="category-badge">{{ document.category }}</span>
                <span v-else class="dr-muted">—</span>
              </span>
              <span class="col-file">
                <span v-if="document.file" class="file-chip">
                  <span class="file-type-badge">{{ fileKind(document).label }}</span>
                  <span class="file-name">{{ getFileName(document.file) }}</span>
                </span>
                <span v-else class="dr-muted">—</span>
              </span>
              <span class="col-date">{{ formatDate(document.created_at) }}</span>
              <span class="col-tools" @click.stop>
                <button v-if="document.file" type="button" class="btn-icon" title="預覽" @click="openFilePreview(document)">👁</button>
                <a v-if="document.file" :href="document.file" :download="getFileName(document.file)" target="_blank" class="btn-icon" title="下載">⬇</a>
                <button class="btn-icon" title="編輯" @click="startInlineEdit(document)">✏️</button>
                <button class="btn-icon delete" title="刪除" @click="confirmDelete(document)">🗑️</button>
              </span>
            </template>

            <!-- ══ 格線卡（Drive 式） ══ -->
            <template v-else>
              <div class="dr-card-preview">
                <img v-if="document.cover" :src="document.cover" :alt="document.name" class="cover-image" loading="lazy" />
                <img v-else-if="document.file && isImageUrl(document.file)" :src="document.file" :alt="document.name" class="cover-image" loading="lazy" />
                <span v-else class="dr-file-icon dr-file-icon--lg" :class="`kind-${fileKind(document).key}`">{{ fileKind(document).icon }}</span>
                <input
                  v-if="batchMode"
                  type="checkbox"
                  class="row-check row-check--float"
                  :checked="selectedIds.has(document.id)"
                  @click.stop="toggleSelect(document.id)"
                />
                <span v-if="document.file" class="dr-card-type">{{ fileKind(document).label }}</span>
              </div>
              <div class="card-header">
                <span class="dr-file-icon dr-file-icon--sm" :class="`kind-${fileKind(document).key}`">{{ fileKind(document).icon }}</span>
                <h3 class="card-title">{{ document.name || '未命名' }}</h3>
                <div class="card-actions" @click.stop>
                  <button v-if="document.file" class="btn-icon" title="預覽" @click="openFilePreview(document)">👁</button>
                  <button @click="startInlineEdit(document)" class="btn-icon" title="編輯">✏️</button>
                  <button @click="confirmDelete(document)" class="btn-icon delete" title="刪除">🗑️</button>
                </div>
              </div>
              <div class="card-body">
                <div class="card-meta-row">
                  <span v-if="document.category" class="category-badge">{{ document.category }}</span>
                  <span class="timestamp">{{ formatDate(document.created_at) }}</span>
                </div>
                <p v-if="document.note" class="note-preview">{{ truncateText(document.note, 90) }}</p>
                <div v-if="document.file" class="file-info">
                  <span class="file-name">{{ getFileName(document.file) }}</span>
                  <a :href="document.file" :download="getFileName(document.file)" target="_blank" class="btn-download" title="下載" @click.stop>下載</a>
                </div>
                <div v-if="document.ref" class="ref-info">
                  <span class="label">參考</span>
                  <span class="value">{{ document.ref }}</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="hash-info" v-if="document.hash" title="檔案指紋">🔐 {{ truncateText(document.hash, 14) }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- ══ Dropbox 式詳細資料窗格 ══ -->
        <aside v-if="showDetailPane" class="dr-detail" aria-label="詳細資料">
          <header class="dr-detail-head">
            <h2>詳細資料</h2>
            <button class="btn-icon" title="關閉" @click="showDetailPane = false">✕</button>
          </header>

          <template v-if="detailDocument">
            <div class="dr-detail-preview">
              <img v-if="detailDocument.cover" :src="detailDocument.cover" :alt="detailDocument.name" />
              <img v-else-if="detailDocument.file && isImageUrl(detailDocument.file)" :src="detailDocument.file" :alt="detailDocument.name" />
              <span v-else class="dr-file-icon dr-file-icon--lg" :class="`kind-${fileKind(detailDocument).key}`">{{ fileKind(detailDocument).icon }}</span>
            </div>
            <h3 class="dr-detail-name">{{ detailDocument.name || '未命名' }}</h3>
            <div class="dr-detail-actions">
              <button v-if="detailDocument.file" class="btn btn-primary" @click="openFilePreview(detailDocument)">預覽</button>
              <a
                v-if="detailDocument.file"
                :href="detailDocument.file"
                :download="getFileName(detailDocument.file)"
                target="_blank"
                class="btn btn-secondary"
              >下載</a>
              <button class="btn btn-secondary" @click="startInlineEdit(detailDocument)">編輯</button>
            </div>
            <dl class="dr-detail-facts">
              <div><dt>類型</dt><dd>{{ fileKind(detailDocument).label }}</dd></div>
              <div v-if="detailDocument.category"><dt>分類</dt><dd>{{ detailDocument.category }}</dd></div>
              <div v-if="detailDocument.file"><dt>檔名</dt><dd>{{ getFileName(detailDocument.file) }}</dd></div>
              <div><dt>建立</dt><dd>{{ formatDate(detailDocument.created_at) }}</dd></div>
              <div v-if="detailDocument.ref"><dt>參考</dt><dd>{{ detailDocument.ref }}</dd></div>
              <div v-if="detailDocument.hash"><dt>指紋</dt><dd class="dr-hash">{{ detailDocument.hash }}</dd></div>
            </dl>
            <div v-if="detailDocument.note" class="dr-detail-note">
              <h4>備註</h4>
              <p>{{ detailDocument.note }}</p>
            </div>
          </template>
          <p v-else class="dr-detail-empty">選取一個項目以檢視詳細資料。</p>
        </aside>
      </div>

      <!-- 匯入進度 Overlay -->
      <div v-if="importProgress.active" class="import-overlay">
        <div class="import-modal-box">
          <div class="import-spinner-anim"></div>
          <h3 class="import-title">{{ importProgress.title }}</h3>
          <p class="import-step">{{ importProgress.step }}</p>
          <div class="import-progress-bar">
            <div class="import-progress-fill" :style="{ width: importProgress.percent + '%' }"></div>
          </div>
          <p class="import-percent">{{ importProgress.current }} / {{ importProgress.total }}（{{ importProgress.percent }}%）</p>
          <p v-if="importProgress.itemName" class="import-item-name">{{ importProgress.itemName }}</p>
          <div v-if="importProgress.stats" class="import-stats">
            <span v-if="importProgress.stats.fileOk > 0" class="stat-tag stat-ok">📄 {{ importProgress.stats.fileOk }}</span>
            <span v-if="importProgress.stats.coverOk > 0" class="stat-tag stat-ok">🖼️ {{ importProgress.stats.coverOk }}</span>
            <span v-if="importProgress.stats.fail > 0" class="stat-tag stat-fail">❌ {{ importProgress.stats.fail }}</span>
          </div>
        </div>
      </div>

      <!-- File Preview Modal -->
      <div v-if="previewDocument" class="modal-overlay file-preview-overlay" @click.self="closeFilePreview">
        <div class="modal-content file-preview-modal">
          <div class="modal-header">
            <h2 class="modal-title">{{ previewDocument.name || getFileName(previewDocument.file) }}</h2>
            <button @click="closeFilePreview" class="btn-close">×</button>
          </div>
          <div class="file-preview-modal-body">
            <img
              v-if="getFilePreviewType(previewDocument.file) === 'image'"
              :src="previewDocument.file"
              :alt="previewDocument.name"
              class="file-preview-large-img"
            />
            <iframe
              v-else-if="getFilePreviewType(previewDocument.file) === 'pdf'"
              :src="previewDocument.file"
              class="file-preview-large-frame"
              :title="previewDocument.name || getFileName(previewDocument.file)"
            ></iframe>
            <div
              v-else-if="getFilePreviewType(previewDocument.file) === 'csv'"
              class="file-preview-csv-panel"
            >
              <div v-if="previewTextLoading" class="file-preview-fallback">
                <p>CSV 讀取中...</p>
              </div>
              <div v-else-if="previewTextError" class="file-preview-fallback">
                <p>{{ previewTextError }}</p>
                <a :href="previewDocument.file" target="_blank" rel="noopener" class="btn btn-primary">開啟檔案</a>
              </div>
              <template v-else>
                <div class="csv-preview-toolbar">
                  <span class="csv-preview-meta">
                    {{ previewCsv.rowCount }} 列 · {{ previewCsv.headers.length }} 欄
                    <template v-if="previewCsv.truncated">（僅顯示前 {{ previewCsv.rows.length }} 列）</template>
                  </span>
                  <div class="csv-preview-mode-switch" role="group" aria-label="CSV 預覽模式">
                    <button
                      type="button"
                      class="csv-mode-btn"
                      :class="{ active: previewCsvMode === 'table' }"
                      @click="previewCsvMode = 'table'"
                    >
                      表格
                    </button>
                    <button
                      type="button"
                      class="csv-mode-btn"
                      :class="{ active: previewCsvMode === 'text' }"
                      @click="previewCsvMode = 'text'"
                    >
                      原文
                    </button>
                  </div>
                </div>
                <div v-if="previewCsvMode === 'table'" class="csv-preview-table-wrap">
                  <table v-if="previewCsv.headers.length" class="csv-preview-table">
                    <thead>
                      <tr>
                        <th class="csv-row-index">#</th>
                        <th v-for="(header, hi) in previewCsv.headers" :key="'h-' + hi">
                          {{ header || `欄 ${hi + 1}` }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in previewCsv.rows" :key="'r-' + ri">
                        <td class="csv-row-index">{{ ri + 1 }}</td>
                        <td v-for="(cell, ci) in row" :key="'c-' + ri + '-' + ci">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="file-preview-fallback">
                    <p>此 CSV 沒有可顯示的資料列。</p>
                  </div>
                </div>
                <pre v-else class="file-preview-text-content">{{ previewText }}</pre>
              </template>
            </div>
            <div
              v-else-if="getFilePreviewType(previewDocument.file) === 'text'"
              class="file-preview-text-panel"
            >
              <div v-if="previewTextLoading" class="file-preview-fallback">
                <p>文字讀取中...</p>
              </div>
              <div v-else-if="previewTextError" class="file-preview-fallback">
                <p>{{ previewTextError }}</p>
                <a :href="previewDocument.file" target="_blank" rel="noopener" class="btn btn-primary">開啟檔案</a>
              </div>
              <pre v-else class="file-preview-text-content">{{ previewText }}</pre>
            </div>
            <video
              v-else-if="getFilePreviewType(previewDocument.file) === 'video'"
              :src="previewDocument.file"
              class="file-preview-large-media"
              controls
              autoplay
            ></video>
            <audio
              v-else-if="getFilePreviewType(previewDocument.file) === 'audio'"
              :src="previewDocument.file"
              class="file-preview-large-audio"
              controls
              autoplay
            ></audio>
            <iframe
              v-else-if="getOfficePreviewUrl(previewDocument.file)"
              :src="getOfficePreviewUrl(previewDocument.file)"
              class="file-preview-large-frame"
              :title="previewDocument.name || getFileName(previewDocument.file)"
            ></iframe>
            <div v-else class="file-preview-fallback">
              <span class="file-generic-icon">{{ getFilePreviewIcon(previewDocument.file) }}</span>
              <p>{{ getFilePreviewLabel(previewDocument.file) }}</p>
              <a :href="previewDocument.file" target="_blank" rel="noopener" class="btn btn-primary">開啟檔案</a>
            </div>
          </div>
          <div class="file-preview-modal-actions">
            <a :href="previewDocument.file" target="_blank" rel="noopener" class="btn btn-secondary">開新分頁</a>
            <a :href="previewDocument.file" :download="getFileName(previewDocument.file)" class="btn btn-primary">下載</a>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">
              {{ isEditing ? '編輯文件' : '新增文件' }}
            </h2>
            <button @click="closeModal" class="btn-close">×</button>
          </div>

          <form @submit.prevent="handleSubmit" class="modal-form">
            <div class="form-group">
              <label class="form-label">名稱 *</label>
              <input
                v-model="formData.name"
                type="text"
                class="form-input"
                required
                placeholder="請輸入文件名稱"
              />
            </div>

            <div class="form-group">
              <label class="form-label">上傳檔案</label>
              <div class="upload-area">
                <input
                  ref="fileInput"
                  type="file"
                  :multiple="!isEditing"
                  @change="handleFileUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.fileInput.click()"
                  class="btn btn-upload"
                  :disabled="fileUploading"
                >
                  {{ fileUploading ? '上傳中...' : '選擇檔案' }}
                </button>
              </div>
              <div v-if="formData.file" class="file-preview">
                <span>{{ isCsvUrl(formData.file) ? '📊' : '📄' }} {{ getFileName(formData.file) }}</span>
                <button type="button" @click="removeFile" class="btn-remove">移除</button>
              </div>
              <input
                v-model="formData.file"
                type="text"
                class="form-input"
                placeholder="或輸入檔案 URL"
              />
            </div>

            <div class="form-group">
              <label class="form-label">備註</label>
              <textarea
                v-model="formData.note"
                class="form-textarea"
                rows="4"
                placeholder="請輸入備註..."
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">參考</label>
              <input
                v-model="formData.ref"
                type="text"
                class="form-input"
                placeholder="參考來源"
              />
            </div>

            <div class="form-group">
              <label class="form-label">分類</label>
              <input
                v-model="formData.category"
                type="text"
                class="form-input"
                placeholder="文件分類"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Hash</label>
              <input
                v-model="formData.hash"
                type="text"
                class="form-input"
                placeholder="檔案 Hash 值"
              />
            </div>

            <div class="form-group">
              <label class="form-label">封面上傳</label>
              <div class="upload-area">
                <input
                  ref="coverFileInput"
                  type="file"
                  accept="image/*"
                  @change="handleCoverUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.coverFileInput.click()"
                  class="btn btn-upload"
                  :disabled="coverUploading"
                >
                  {{ coverUploading ? '上傳中...' : '選擇封面' }}
                </button>
              </div>
              <div v-if="formData.cover" class="cover-upload-preview">
                <img :src="formData.cover" alt="封面預覽" class="preview-image" />
                <button type="button" @click="removeCover" class="btn-remove">移除</button>
              </div>
              <input
                v-model="formData.cover"
                type="text"
                class="form-input"
                placeholder="或輸入封面 URL"
              />
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModal" class="btn btn-secondary">
                取消
              </button>
              <button type="submit" class="btn btn-primary">
                {{ isEditing ? '更新' : '新增' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useDocuments } from '../../composables/useDocuments'
import { useStorage } from '../../composables/useStorage'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'

// SEO
useHead({
  title: '鋒兄文件 - 鋒兄AI Supabase'
})

// Composable
const {
  documents,
  loading,
  FIELDS,
  loadDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  importDocuments
} = useDocuments()

// Search & Filter
const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-document-search-history', searchQuery)
const filterCategory = ref('')
const DOCUMENT_VIEW_MODE_KEY = 'feng-document-view-mode'
const documentViewMode = ref('card')
const showDetailPane = ref(false)
const detailDocument = ref(null)
const previewDocument = ref(null)
const previewText = ref('')
const previewTextLoading = ref(false)
const previewTextError = ref('')
const previewCsvMode = ref('table')
const previewCsv = ref({ headers: [], rows: [], rowCount: 0, truncated: false })
const CSV_PREVIEW_MAX_ROWS = 500

const availableCategories = computed(() => {
  const cats = new Set()
  documents.value.forEach(doc => { if (doc.category) cats.add(doc.category) })
  return [...cats].sort()
})

/** Drive 式彩色檔案型別圖示 */
const FILE_KINDS = {
  image: { key: 'image', icon: '🖼', label: '圖片' },
  pdf: { key: 'pdf', icon: '📕', label: 'PDF' },
  csv: { key: 'sheet', icon: '📊', label: 'CSV' },
  text: { key: 'text', icon: '📝', label: '文字' },
  video: { key: 'video', icon: '🎬', label: '影片' },
  audio: { key: 'audio', icon: '🎧', label: '音訊' },
  office: { key: 'doc', icon: '📄', label: 'Office' },
  file: { key: 'file', icon: '📎', label: '檔案' }
}

const fileKind = (documentItem) => {
  if (!documentItem?.file) return { key: 'file', icon: '🗂', label: '無檔案' }
  const type = getFilePreviewType(documentItem.file)
  return FILE_KINDS[type] || FILE_KINDS.file
}

/** MEGA 式容量統計：以「有檔案的比例」當作使用率 */
const storageStats = computed(() => {
  const total = documents.value.length
  const withFile = documents.value.filter((doc) => doc.file).length
  const counts = new Map()
  documents.value.forEach((doc) => {
    if (!doc.file) return
    const kind = fileKind(doc)
    const entry = counts.get(kind.key) || { ...kind, count: 0 }
    entry.count += 1
    counts.set(kind.key, entry)
  })
  return {
    withFile,
    usedPercent: total ? Math.min(100, Math.round((withFile / total) * 100)) : 0,
    kinds: Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 4)
  }
})

/** Drive 式快速存取：最近 6 筆 */
const quickAccess = computed(() => documents.value.slice(0, 6))

const openDetails = (documentItem) => {
  detailDocument.value = documentItem
  showDetailPane.value = true
}

const setDocumentViewMode = (mode) => {
  if (!['card', 'list'].includes(mode)) return
  documentViewMode.value = mode
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DOCUMENT_VIEW_MODE_KEY, mode)
  }
}

const openFilePreview = async (documentItem) => {
  previewDocument.value = documentItem
  previewText.value = ''
  previewTextError.value = ''
  previewCsvMode.value = 'table'
  previewCsv.value = { headers: [], rows: [], rowCount: 0, truncated: false }
  const type = getFilePreviewType(documentItem?.file)
  if (type === 'csv' || type === 'text') {
    await loadPreviewText(documentItem.file, type === 'csv')
  }
}

const closeFilePreview = () => {
  previewDocument.value = null
  previewText.value = ''
  previewTextError.value = ''
  previewCsvMode.value = 'table'
  previewCsv.value = { headers: [], rows: [], rowCount: 0, truncated: false }
}

// Batch mode
const batchMode = ref(false)
const selectedIds = ref(new Set())
const enterBatchMode = () => { batchMode.value = true }
const exitBatchMode = () => { batchMode.value = false; selectedIds.value = new Set() }
const isAllSelected = computed(() => filteredDocuments.value.length > 0 && filteredDocuments.value.every(a => selectedIds.value.has(a.id)))
const toggleSelect = (id) => { const s = new Set(selectedIds.value); if (s.has(id)) s.delete(id); else s.add(id); selectedIds.value = s }
const toggleSelectAll = () => { if (isAllSelected.value) selectedIds.value = new Set(); else selectedIds.value = new Set(filteredDocuments.value.map(a => a.id)) }
const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return
  if (count === documents.value.length) {
    const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE document 確認：`)
    if (input !== 'DELETE document') { alert('輸入不正確，已取消'); return }
  } else { if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) return }
  let ok = 0
  for (const id of [...selectedIds.value]) { const r = await deleteDocument(id); if (r.success) ok++ }
  selectedIds.value = new Set(); batchMode.value = false
  alert(`已刪除 ${ok} 筆`)
}

// Upload state
const fileInput = ref(null)
const coverFileInput = ref(null)
const inlineFileInput = ref(null)
const triggerInlineFileInput = () => { inlineFileInput.value?.click() }
const { uploadFile } = useStorage()
const fileUploading = ref(false)
const coverUploading = ref(false)
const inlineFileUploading = ref(false)

// 行內新增
const isAddingInline = ref(false)
const addForm = reactive({ name: '', file: '', note: '', ref: '', category: '', hash: '', cover: '' })
const addFileInput = ref(null)
const addFileUploading = ref(false)

const openInlineAdd = () => {
  Object.assign(addForm, { name: '', file: '', note: '', ref: '', category: '', hash: '', cover: '' })
  isAddingInline.value = true
  inlineEditingId.value = null
}

const cancelInlineAdd = () => {
  isAddingInline.value = false
}

const triggerAddFileInput = () => { addFileInput.value?.click() }

const getNameFromLocalFile = (file) => {
  const name = file?.name || 'document'
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.slice(0, dotIndex) : name
}

const createDocumentFromUploadedFile = async (file, fileUrl, baseData = {}) => {
  const name = baseData.name || getNameFromLocalFile(file)
  return await addDocument({
    ...baseData,
    name,
    file: fileUrl
  })
}

const handleAddFileUpload = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  addFileUploading.value = true
  try {
    if (files.length > 1) {
      updateImportProgress({
        active: true,
        title: '多檔上傳中',
        step: '上傳文件檔案',
        current: 0,
        total: files.length,
        stats: { fileOk: 0, coverOk: 0, fail: 0 },
        itemName: ''
      })

      const stats = { fileOk: 0, coverOk: 0, fail: 0 }
      const baseData = {
        note: addForm.note,
        ref: addForm.ref,
        category: addForm.category,
        hash: addForm.hash,
        cover: addForm.cover
      }

      for (let index = 0; index < files.length; index++) {
        const batchFile = files[index]
        updateImportProgress({
          step: `上傳文件 ${index + 1}/${files.length}`,
          current: index,
          itemName: batchFile.name,
          stats: { ...stats }
        })

        const uploadResult = await uploadFile(batchFile, 'documents')
        if (uploadResult.success) {
          const created = await createDocumentFromUploadedFile(batchFile, uploadResult.url, baseData)
          if (created.success) stats.fileOk++
          else stats.fail++
        } else {
          stats.fail++
        }

        updateImportProgress({
          current: index + 1,
          itemName: batchFile.name,
          stats: { ...stats }
        })
      }

      resetImportProgress()
      isAddingInline.value = false
      await loadDocuments()
      alert(`已完成多檔上傳：成功 ${stats.fileOk} 筆，失敗 ${stats.fail} 筆`)
      return
    }

    const file = files[0]
    const result = await uploadFile(file, 'documents')
    if (result.success) {
      addForm.file = result.url
      if (!addForm.name) addForm.name = getNameFromLocalFile(file)
    }
    else { alert('上傳失敗: ' + result.error) }
  } catch (error) {
    resetImportProgress()
    alert('上傳失敗: ' + error.message)
  } finally {
    addFileUploading.value = false
    if (addFileInput.value) addFileInput.value.value = ''
  }
}

const saveInlineAdd = async () => {
  if (!addForm.name) { alert('請輸入文件名稱'); return }
  try {
    await addDocument({ ...addForm })
    isAddingInline.value = false
    await loadDocuments()
  } catch (error) {
    alert('新增失敗: ' + error.message)
  }
}


const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

// 行內編輯
const inlineEditingId = ref(null)
const editForm = reactive({})

const startInlineEdit = (doc) => {
  Object.assign(editForm, {
    id: doc.id,
    name: doc.name || '',
    file: doc.file || '',
    note: doc.note || '',
    ref: doc.ref || '',
    category: doc.category || '',
    hash: doc.hash || '',
    cover: doc.cover || ''
  })
  inlineEditingId.value = doc.id
}

const cancelInlineEdit = () => {
  inlineEditingId.value = null
}

const handleInlineFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  inlineFileUploading.value = true
  try {
    const result = await uploadFile(file, 'documents')
    if (result.success) {
      editForm.file = result.url
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    alert('上傳失敗: ' + error.message)
  } finally {
    inlineFileUploading.value = false
    if (inlineFileInput.value) inlineFileInput.value.value = ''
  }
}

const saveInlineEdit = async () => {
  if (!editForm.name) {
    alert('請輸入文件名稱')
    return
  }
  try {
    await updateDocument(editForm.id, { ...editForm })
    inlineEditingId.value = null
    await loadDocuments()
  } catch (error) {
    console.error('Inline edit save error:', error)
    alert('儲存失敗: ' + error.message)
  }
}

// Form data
const formData = ref({
  name: '',
  file: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  cover: ''
})

// Computed
const filteredDocuments = computed(() => {
  let list = documents.value
  if (filterCategory.value) {
    list = list.filter(doc => doc.category === filterCategory.value)
  }
  if (!searchQuery.value) return list
  const query = searchQuery.value.toLowerCase()
  return list.filter(doc => doc.name?.toLowerCase().includes(query))
})

// Methods
const openAddModal = () => {
  isEditing.value = false
  editingId.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (document) => {
  isEditing.value = true
  editingId.value = document.id
  formData.value = {
    name: document.name || '',
    file: document.file || '',
    note: document.note || '',
    ref: document.ref || '',
    category: document.category || '',
    hash: document.hash || '',
    cover: document.cover || ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

// File upload handler
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  fileUploading.value = true
  try {
    if (!isEditing.value && files.length > 1) {
      updateImportProgress({
        active: true,
        title: '多檔上傳中',
        step: '上傳文件檔案',
        current: 0,
        total: files.length,
        stats: { fileOk: 0, coverOk: 0, fail: 0 },
        itemName: ''
      })

      const stats = { fileOk: 0, coverOk: 0, fail: 0 }
      const baseData = {
        note: formData.value.note,
        ref: formData.value.ref,
        category: formData.value.category,
        hash: formData.value.hash,
        cover: formData.value.cover
      }

      for (let index = 0; index < files.length; index++) {
        const batchFile = files[index]
        updateImportProgress({
          step: `上傳文件 ${index + 1}/${files.length}`,
          current: index,
          itemName: batchFile.name,
          stats: { ...stats }
        })

        const uploadResult = await uploadFile(batchFile, 'documents')
        if (uploadResult.success) {
          const created = await createDocumentFromUploadedFile(batchFile, uploadResult.url, baseData)
          if (created.success) stats.fileOk++
          else stats.fail++
        } else {
          stats.fail++
        }

        updateImportProgress({
          current: index + 1,
          itemName: batchFile.name,
          stats: { ...stats }
        })
      }

      resetImportProgress()
      closeModal()
      await loadDocuments()
      alert(`已完成多檔上傳：成功 ${stats.fileOk} 筆，失敗 ${stats.fail} 筆`)
      return
    }

    const file = files[0]
    const result = await uploadFile(file, 'documents')
    if (result.success) {
      formData.value.file = result.url
      if (!formData.value.name) formData.value.name = getNameFromLocalFile(file)
      alert('檔案上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    resetImportProgress()
    alert('上傳失敗: ' + error.message)
  } finally {
    fileUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// Remove file
const removeFile = () => {
  formData.value.file = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Cover upload handler
const handleCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  try {
    const result = await uploadFile(file, 'document-covers')
    if (result.success) {
      formData.value.cover = result.url
      alert('封面上傳成功！')
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Cover upload error:', error)
    alert('封面上傳失敗: ' + error.message)
  } finally {
    coverUploading.value = false
  }
}

// Remove cover
const removeCover = () => {
  formData.value.cover = ''
  if (coverFileInput.value) {
    coverFileInput.value.value = ''
  }
}

const resetForm = () => {
  formData.value = {
    name: '',
    file: '',
    note: '',
    ref: '',
    category: '',
    hash: '',
    cover: ''
  }
}

const handleSubmit = async () => {
  try {
    if (isEditing.value) {
      await updateDocument(editingId.value, formData.value)
    } else {
      await addDocument(formData.value)
    }
    closeModal()
    await loadDocuments()
  } catch (error) {
    console.error('Error saving document:', error)
    alert('儲存失敗，請稍後再試')
  }
}

const confirmDelete = async (document) => {
  if (confirm(`確定要刪除文件「${document.name}」嗎？`)) {
    try {
      await deleteDocument(document.id)
      await loadDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('刪除失敗，請稍後再試')
    }
  }
}

// CSV Export（僅 metadata，不含附件檔本體）
const exportDocumentsCsv = () => {
  if (documents.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }
  const header = ['name', 'file', 'note', 'ref', 'category', 'hash', 'cover']
  const rows = documents.value.map((doc) => header.map((key) => {
    const value = doc[key] ?? ''
    return `"${String(value).replace(/"/g, '""')}"`
  }))
  const bom = '\uFEFF'
  const csvContent = bom + [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'supabase-document.csv'
  link.click()
  URL.revokeObjectURL(url)
}

// ZIP Export
const exportToZip = async () => {
  if (documents.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  try {
    updateImportProgress({
      active: true,
      title: '📦 匯出 ZIP 中...',
      step: '打包文件媒體',
      current: 0,
      total: documents.value.length,
      percent: 0,
      stats: null,
      itemName: ''
    })

    const { exportRecordsAsMediaZip } = await import('../../utils/zipMediaBundle')
    const { getPublicUrl } = useStorage()
    const resolveDocUrl = (value) => {
      if (!value) return ''
      if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value
      return getPublicUrl(value) || value
    }

    const stats = await exportRecordsAsMediaZip({
      records: documents.value,
      jsonFileName: 'documents.json',
      downloadName: 'supabase-documents.zip',
      mediaMap: {
        file: { folder: 'files', fallbackExt: 'bin' },
        cover: { folder: 'covers', fallbackExt: 'jpg' }
      },
      resolveUrl: resolveDocUrl,
      onProgress: ({ stage, current, total, percent, stats: packStats }) => {
        if (stage === 'media') {
          updateImportProgress({
            step: '打包文件媒體',
            current: current || 0,
            total: total || documents.value.length,
            itemName: `成功 ${packStats?.ok || 0} / 失敗 ${packStats?.fail || 0}`
          })
        } else {
          updateImportProgress({
            step: '壓縮 ZIP',
            current: documents.value.length,
            total: documents.value.length,
            itemName: `${percent || 0}%`
          })
        }
      }
    })

    updateImportProgress({ step: '匯出完成', current: documents.value.length, total: documents.value.length, itemName: 'supabase-documents.zip' })
    await new Promise(resolve => setTimeout(resolve, 250))
    resetImportProgress()
    alert(`匯出成功！\n媒體成功 ${stats.ok}，失敗 ${stats.fail}，略過 ${stats.skipped}`)
  } catch (error) {
    resetImportProgress()
    console.error('Error exporting ZIP:', error)
    alert('匯出失敗：' + error.message)
  }
}

// 匯入進度狀態
const importProgress = ref({
  active: false, title: '', step: '', current: 0, total: 0, percent: 0, itemName: '', stats: null
})
function updateImportProgress(fields) {
  Object.assign(importProgress.value, fields)
  if (fields.current !== undefined && importProgress.value.total > 0) {
    importProgress.value.percent = Math.round((fields.current / importProgress.value.total) * 100)
  }
}
function resetImportProgress() {
  importProgress.value = { active: false, title: '', step: '', current: 0, total: 0, percent: 0, itemName: '', stats: null }
}

// CSV Parser（支援引號內換行）
const parseCsvMatrix = (text) => {
  const rows = []
  let row = []
  let current = ''
  let inQuotes = false
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]
    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if (char === '\n' && !inQuotes) {
      row.push(current.trim())
      if (row.some(cell => cell !== '')) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }

  row.push(current.trim())
  if (row.some(cell => cell !== '')) rows.push(row)
  return rows
}

const parseDocCsv = (text) => {
  const rows = parseCsvMatrix(text)
  if (rows.length < 2) return []

  const headers = rows[0]
  return rows.slice(1).map(cells => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
}

const buildCsvPreviewTable = (text, maxRows = CSV_PREVIEW_MAX_ROWS) => {
  const matrix = parseCsvMatrix(text)
  if (matrix.length === 0) {
    return { headers: [], rows: [], rowCount: 0, truncated: false }
  }
  const headers = matrix[0]
  const dataRows = matrix.slice(1)
  const colCount = Math.max(headers.length, ...dataRows.map((r) => r.length), 0)
  const normalizeRow = (cells) => {
    const next = cells.slice(0, colCount)
    while (next.length < colCount) next.push('')
    return next
  }
  const normalizedHeaders = normalizeRow(headers)
  const truncated = dataRows.length > maxRows
  const rows = dataRows.slice(0, maxRows).map(normalizeRow)
  return {
    headers: normalizedHeaders,
    rows,
    rowCount: dataRows.length,
    truncated
  }
}

const importDocumentCsvRows = async (rows) => {
  if (!rows.length) {
    alert('CSV 檔案無有效資料')
    return
  }
  const firstRow = rows[0]
  const isAppwrite = '$id' in firstRow || '$createdAt' in firstRow || '$collectionId' in firstRow
  const mapped = rows.map((row, index) => mapImportedDocumentRow(row, index))
  let confirmMsg = `確定匯入 ${mapped.length} 筆文件資料？\n（純 CSV 僅匯入欄位，不會上傳附件檔）`
  if (isAppwrite) {
    confirmMsg = `ℹ️ 偵測到 Appwrite CSV 格式\n\n已自動對應欄位並移除系統欄位\n（純 CSV 僅匯入欄位，附件請改用 ZIP）\n\n確定匯入 ${mapped.length} 筆文件資料？`
  }
  if (!confirm(confirmMsg)) return

  updateImportProgress({
    active: true,
    title: '匯入 CSV 中...',
    step: '寫入資料庫',
    current: 0,
    total: mapped.length,
    stats: null,
    itemName: `${mapped.length} 筆`
  })
  try {
    const result = await importDocuments(mapped)
    resetImportProgress()
    if (result.success) {
      await loadDocuments()
      alert(`✅ ${result.message || '匯入成功'}！共 ${result.count} 筆資料`)
    } else {
      alert('匯入失敗: ' + result.error)
    }
  } catch (error) {
    resetImportProgress()
    alert('匯入失敗: ' + error.message)
  }
}

const handleImportFile = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const lower = (file.name || '').toLowerCase()
  const isCsvFile = lower.endsWith('.csv') || file.type === 'text/csv'
  const isZipFile = lower.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
  try {
    if (isCsvFile) {
      const text = await file.text()
      const cleanText = text.replace(/^\uFEFF/, '')
      const rows = parseDocCsv(cleanText)
      await importDocumentCsvRows(rows)
      return
    }
    if (!isZipFile) {
      alert('請選擇 .csv 或 .zip 檔案')
      return
    }
    await handleZipImport(event)
  } catch (error) {
    resetImportProgress()
    console.error('Import file error:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    if (!isZipFile && event?.target) event.target.value = ''
  }
}

// ZIP Import — 相容 supabase (documents.json) 及 appwrite (document.csv + files/ + covers/)
const isRemoteImportUrl = (value) => /^https?:\/\//i.test(value || '')

const getImportFileName = (path = '', fallback = 'file') => {
  const cleanPath = String(path || '').replace(/\\/g, '/')
  return cleanPath.split('/').pop() || fallback
}

const getImportMimeType = (fileName = '') => {
  const ext = getImportFileName(fileName).split('.').pop()?.toLowerCase() || ''
  const mimeMap = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

const findZipEntry = (zip, allZipFiles, rawPath, preferredFolder = 'files') => {
  if (!rawPath || isRemoteImportUrl(rawPath)) return null
  const normalizedPath = String(rawPath).replace(/\\/g, '/').replace(/^\/+/, '')
  const candidates = [
    normalizedPath,
    `${preferredFolder}/${normalizedPath}`,
    `files/${normalizedPath}`,
    `covers/${normalizedPath}`
  ]

  for (const candidate of candidates) {
    const entry = zip.file(candidate)
    if (entry) return entry
  }

  const baseName = getImportFileName(normalizedPath)
  const matchedPath = allZipFiles.find((path) => {
    const normalized = path.replace(/\\/g, '/')
    return normalized === baseName || normalized.endsWith(`/${baseName}`)
  })
  return matchedPath ? zip.file(matchedPath) : null
}

const getFirstRowValue = (row, keys) => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

const mapImportedDocumentRow = (row, index) => {
  const cleaned = {}
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('$')) continue
    cleaned[key] = value
  }

  const fileValue = getFirstRowValue(cleaned, ['file', 'file1', 'attachment', 'attachment1'])
  const fileName = getFirstRowValue(cleaned, ['filename', 'fileName', 'file1name', 'file1Name'])
  const title = getFirstRowValue(cleaned, ['name', 'title', 'subject', 'heading'])

  return {
    name: title || fileName || getImportFileName(fileValue, `Appwrite document ${index + 1}`),
    file: fileValue,
    note: getFirstRowValue(cleaned, ['note', 'content', 'description', 'body', 'summary']),
    ref: getFirstRowValue(cleaned, ['ref', 'reference', 'source', 'url', 'url1']),
    category: getFirstRowValue(cleaned, ['category', 'type', 'tag']),
    hash: getFirstRowValue(cleaned, ['hash']),
    cover: getFirstRowValue(cleaned, ['cover', 'thumbnail', 'image', 'cover1'])
  }
}

const handleZipImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    updateImportProgress({ active: true, title: '📦 正在解壓 ZIP...', step: '讀取檔案中', current: 0, total: 1, stats: null, itemName: file.name })

    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    const csvNames = [
      'document.csv',
      'documents.csv',
      'appwrite-document.csv',
      'appwrite-documents.csv',
      'appwrite-article.csv',
      'supabase-document.csv',
      'supabase-documents.csv',
      'supabase-article.csv'
    ]
    let csvFile = null
    for (const csvName of csvNames) {
      csvFile = zip.file(csvName)
      if (csvFile) break
    }
    if (!csvFile) {
      const csvFiles = zip.file(/\.csv$/i)
      csvFile = csvFiles[0] || null
    }
    const jsonFile = zip.file('documents.json')
    const allZipFiles = []
    zip.forEach((path, entry) => {
      if (!entry.dir) allZipFiles.push(path)
    })

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：document.csv + files/ + covers/ =====
      updateImportProgress({ step: '解析 CSV...', itemName: csvFile.name || 'document.csv' })
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseDocCsv(cleanText)

      if (parsed.length === 0) {
        resetImportProgress()
        alert('CSV 檔案無有效資料')
        return
      }

      resetImportProgress()
      const confirmMsg = `ℹ️ 偵測到 Appwrite document.zip 格式\n\n共 ${parsed.length} 筆文件\n系統將自動上傳檔案、封面至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      updateImportProgress({
        active: true, title: '📄 匯入文件中...', step: '準備上傳',
        current: 0, total: parsed.length,
        stats: { fileOk: 0, coverOk: 0, fail: 0 }, itemName: ''
      })

      const { uploadFile: uploadToStorage } = useStorage()
      const stats = { fileOk: 0, coverOk: 0, fail: 0 }

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        const mapped = mapImportedDocumentRow(row, i)

        const itemLabel = mapped.name || `第 ${i + 1} 筆`
        updateImportProgress({ current: i + 1, itemName: itemLabel })

        // 上傳檔案 (files/ 資料夾)
        const filePath = mapped.file
        const fileEntry = findZipEntry(zip, allZipFiles, filePath, 'files')
        if (filePath && !fileEntry && !isRemoteImportUrl(filePath)) mapped.file = ''
        if (filePath && fileEntry) {
          updateImportProgress({ step: `📄 上傳檔案 ${i + 1}/${parsed.length}` })
          const zipEntry = fileEntry
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = getFirstRowValue(row, ['filename', 'fileName', 'file1name', 'file1Name']) || getImportFileName(filePath, `file_${i}`)
              const ext = fileName.split('.').pop()?.toLowerCase() || ''
              const mimeMap = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain', zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', mp3: 'audio/mpeg', mp4: 'video/mp4' }
              const fileObj = new window.File([blob], fileName, { type: mimeMap[ext] || 'application/octet-stream' })
              const uploadResult = await uploadToStorage(fileObj, 'documents')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                stats.fileOk++
              } else {
                console.warn(`上傳檔案失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳檔案失敗 (${mapped.name}):`, err)
              mapped.file = ''
              stats.fail++
            }
          } else {
            mapped.file = ''
          }
        }

        // 上傳封面 (covers/ 資料夾)
        const coverPath = mapped.cover
        const coverEntry = findZipEntry(zip, allZipFiles, coverPath, 'covers')
        if (coverPath && !coverEntry && !isRemoteImportUrl(coverPath)) mapped.cover = ''
        if (coverPath && coverEntry) {
          updateImportProgress({ step: `🖼️ 上傳封面 ${i + 1}/${parsed.length}` })
          const zipEntry = coverEntry
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = getImportFileName(coverPath, `cover_${i}.jpg`)
              const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
              const fileObj = new window.File([blob], fileName, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
              const uploadResult = await uploadToStorage(fileObj, 'document-covers')
              if (uploadResult.success) {
                mapped.cover = uploadResult.url
                stats.coverOk++
              } else {
                console.warn(`上傳封面失敗 (${mapped.name}):`, uploadResult.error)
                mapped.cover = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳封面失敗 (${mapped.name}):`, err)
              mapped.cover = ''
              stats.fail++
            }
          } else {
            mapped.cover = ''
          }
        }

        updateImportProgress({ stats: { ...stats } })
        records.push(mapped)
      }

    } else if (jsonFile) {
      // ===== Supabase 格式：documents.json =====
      updateImportProgress({ step: '解析 JSON...', itemName: 'documents.json' })
      const jsonText = await jsonFile.async('text')
      const jsonData = JSON.parse(jsonText)

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        resetImportProgress()
        alert('JSON 檔案格式錯誤或無資料')
        return
      }

      records = jsonData.map(record => {
        const { id, created_at, updated_at, ...rest } = record
        return rest
      })

      resetImportProgress()
      if (!confirm(`確定要匯入 ${records.length} 筆文件記錄嗎？\n若 ZIP 內含檔案/封面，會自動上傳。`)) return

      updateImportProgress({
        active: true,
        title: '📄 匯入文件中...',
        step: '上傳媒體',
        current: 0,
        total: records.length,
        stats: null,
        itemName: ''
      })
      const { reuploadLocalMediaFromZip } = await import('../../utils/zipMediaBundle')
      const { uploadFile: uploadToStorage } = useStorage()
      const reuploaded = await reuploadLocalMediaFromZip({
        zip,
        records,
        mediaMap: {
          file: { prefixes: ['files/', 'media/'], storageFolder: 'documents', mimeFallback: 'application/octet-stream' },
          cover: { prefixes: ['covers/'], storageFolder: 'document-covers', mimeFallback: 'image/jpeg' }
        },
        uploadFile: uploadToStorage,
        onProgress: ({ current, total, stats }) => {
          updateImportProgress({
            current,
            total,
            step: '上傳媒體',
            itemName: `成功 ${stats.ok} / 失敗 ${stats.fail}`
          })
        }
      })
      records = reuploaded.records
      updateImportProgress({ step: '寫入資料庫', current: records.length, total: records.length })

    } else {
      resetImportProgress()
      alert('ZIP 檔案中找不到 document.csv 或 documents.json')
      return
    }

    // 匯入記錄到資料庫
    if (records.length > 0) {
      updateImportProgress({ step: '💾 寫入資料庫...', current: importProgress.value.total, percent: 99 })
      const result = await importDocuments(records)
      resetImportProgress()
      if (result.success) {
        await loadDocuments()
        alert(`✅ ${result.message}！共 ${result.count} 筆資料`)
      } else {
        alert('匯入失敗: ' + result.error)
      }
    } else {
      resetImportProgress()
    }
  } catch (error) {
    resetImportProgress()
    console.error('Error importing ZIP:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    event.target.value = ''
  }
}

// Utility functions
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const getFileName = (filePath) => {
  if (!filePath) return ''
  return filePath.split('/').pop() || filePath
}

const isImageUrl = (url) => {
  if (!url) return false
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)
}

const getFileExtension = (url) => {
  if (!url) return ''
  const cleanUrl = String(url).split('?')[0].split('#')[0]
  return cleanUrl.split('.').pop()?.toLowerCase() || ''
}

const isCsvUrl = (url) => getFileExtension(url) === 'csv'

const getFilePreviewType = (url) => {
  const ext = getFileExtension(url)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'csv') return 'csv'
  if (['txt', 'json', 'md', 'log', 'xml', 'html', 'css', 'js', 'ts'].includes(ext)) return 'text'
  if (['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'oga'].includes(ext)) return 'audio'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office'
  return 'file'
}

const getOfficePreviewUrl = (url) => {
  if (getFilePreviewType(url) !== 'office' || !/^https?:\/\//i.test(url || '')) return ''
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
}

const getFilePreviewIcon = (url) => {
  const type = getFilePreviewType(url)
  if (type === 'office') return '📄'
  if (type === 'audio') return '🎧'
  if (type === 'video') return '🎬'
  return '📎'
}

const getFilePreviewLabel = (url) => {
  const type = getFilePreviewType(url)
  if (type === 'office') return 'Office 文件可線上預覽'
  if (type === 'file') return '此檔案可開啟或下載'
  return '檔案預覽'
}

const scoreDecodedText = (text = '') => {
  const replacementCount = (text.match(/\uFFFD/g) || []).length
  const controlCount = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length
  return replacementCount * 8 + controlCount * 4
}

const decodePreviewText = (buffer) => {
  const candidates = [
    new TextDecoder('utf-8').decode(buffer),
    new TextDecoder('big5').decode(buffer)
  ]

  return candidates.sort((a, b) => scoreDecodedText(a) - scoreDecodedText(b))[0]
}

const loadPreviewText = async (url, asCsv = false) => {
  previewTextLoading.value = true
  previewTextError.value = ''
  previewCsv.value = { headers: [], rows: [], rowCount: 0, truncated: false }
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    const text = decodePreviewText(buffer)
    previewText.value = text
    if (asCsv) {
      previewCsv.value = buildCsvPreviewTable(text)
    }
  } catch (error) {
    console.error('Text preview error:', error)
    previewTextError.value = asCsv
      ? 'CSV 預覽失敗，請改用開啟檔案或下載。'
      : '文字預覽失敗，請改用開啟檔案或下載。'
  } finally {
    previewTextLoading.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  if (typeof localStorage !== 'undefined') {
    const savedMode = localStorage.getItem(DOCUMENT_VIEW_MODE_KEY)
    if (savedMode === 'card' || savedMode === 'list') {
      documentViewMode.value = savedMode
    }
  }
  loadDocuments()
})
</script>

<style scoped>
/* ============================================================
   鋒兄文件 — Google Drive × MEGA × Dropbox 融合介面
   · Drive：麵包屑、快速存取、彩色檔案型別圖示、格線／清單
   · MEGA：紅色容量儀表、加密指紋徽章
   · Dropbox：藍色主動作、乾淨清單列、右側詳細資料窗格
   ============================================================ */
.document-page {
  --dc-bg: var(--bg-canvas);
  --dc-surface: var(--bg-surface);
  --dc-inset: var(--bg-muted);
  --dc-line: var(--border-subtle);
  --dc-text: var(--text-primary);
  --dc-text-2: var(--text-secondary);
  --dc-text-3: var(--text-muted);
  --dc-blue: #0061ff;          /* Dropbox */
  --dc-blue-soft: color-mix(in oklab, #0061ff 12%, transparent);
  --dc-red: #d9272e;           /* MEGA */
  --dc-green: #0f9d58;         /* Drive */
  --dc-yellow: #f4b400;
  --dc-drive-blue: #4285f4;

  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  color: var(--dc-text);
  font-family: var(--font-body);
}

.dark .document-page {
  --dc-bg: #131316;
  --dc-surface: #1b1b1f;
  --dc-inset: #232329;
  --dc-line: #2e2e35;
  --dc-text: #ededf0;
  --dc-text-2: #b4b4be;
  --dc-text-3: #82828d;
  --dc-blue-soft: color-mix(in oklab, #0061ff 22%, transparent);
}

/* ══════════ Drive 頂欄 ══════════ */
.dr-topbar {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--dc-line);
}

.dr-crumbs {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-lg);
}

.dr-drive-mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-xs);
  background: linear-gradient(135deg, var(--dc-drive-blue) 0%, var(--dc-green) 55%, var(--dc-yellow) 100%);
  color: #fff;
  font-size: 0.75rem;
}

.dr-crumb-root {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--dc-text);
}

.dr-crumb-sep {
  color: var(--dc-text-3);
}

.dr-crumb-current {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--dc-text-2);
}

.search-area {
  flex: 1 1 260px;
  min-width: 200px;
}

.search-area :deep(input) {
  height: 40px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  background: var(--dc-inset);
  color: var(--dc-text);
  font-size: var(--text-sm);
}

.search-area :deep(input:focus) {
  outline: none;
  background: var(--dc-surface);
  border-color: var(--dc-line);
  box-shadow: var(--elevation-2);
}

.dr-topbar-tools {
  display: flex;
  gap: var(--sp-2);
}

.dr-new-btn {
  height: 40px;
  padding: 0 var(--sp-5);
  border-radius: var(--radius-full);
  border: none;
  background: var(--dc-blue);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition: filter var(--transition-fast);
}

.dr-new-btn:hover {
  filter: brightness(1.08);
}

/* ══════════ MEGA 容量儀表 ══════════ */
.mg-storage {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  flex-wrap: wrap;
  padding: var(--sp-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
}

.mg-dial {
  position: relative;
  width: 68px;
  height: 68px;
  flex: 0 0 auto;
}

.mg-dial-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.mg-dial-track,
.mg-dial-value {
  fill: none;
  stroke-width: 4;
}

.mg-dial-track {
  stroke: var(--dc-inset);
}

.mg-dial-value {
  stroke: var(--dc-red);
  stroke-linecap: round;
  transition: stroke-dasharray var(--transition-slow);
}

.mg-dial-label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dc-text);
}

.mg-storage-copy {
  flex: 1 1 220px;
  min-width: 200px;
}

.mg-storage-title {
  margin: 0 0 var(--sp-1);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--dc-text-3);
}

.mg-storage-line {
  margin: 0 0 var(--sp-2);
  font-size: var(--text-sm);
  color: var(--dc-text-2);
}

.mg-storage-line strong {
  color: var(--dc-text);
  font-family: var(--font-mono);
}

.mg-bar {
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--dc-inset);
  overflow: hidden;
}

.mg-bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--dc-red), #ff6b4a);
  transition: width var(--transition-normal);
}

.mg-kinds {
  display: flex;
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.mg-kind {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.mg-kind-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.mg-kind-copy {
  display: flex;
  flex-direction: column;
  font-size: var(--text-2xs);
  color: var(--dc-text-3);
  line-height: 1.3;
}

.mg-kind-copy strong {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--dc-text);
}

.csv-actions {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  margin-left: auto;
}

/* ══════════ 檔案型別圖示（Drive 配色） ══════════ */
.dr-file-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  flex: 0 0 auto;
}

.dr-file-icon--lg {
  width: 64px;
  height: 64px;
  font-size: 1.75rem;
  border-radius: var(--radius-md);
}

.dr-file-icon--sm {
  width: 24px;
  height: 24px;
  font-size: 0.8125rem;
  border-radius: var(--radius-xs);
}

.kind-doc { background: color-mix(in oklab, var(--dc-drive-blue) 16%, transparent); color: var(--dc-drive-blue); }
.kind-sheet { background: color-mix(in oklab, var(--dc-green) 16%, transparent); color: var(--dc-green); }
.kind-image { background: color-mix(in oklab, #a142f4 16%, transparent); color: #8b32d8; }
.kind-pdf { background: color-mix(in oklab, var(--dc-red) 16%, transparent); color: var(--dc-red); }
.kind-video { background: color-mix(in oklab, #ff6d00 16%, transparent); color: #e05f00; }
.kind-audio { background: color-mix(in oklab, #00acc1 16%, transparent); color: #00838f; }
.kind-text { background: color-mix(in oklab, var(--dc-yellow) 20%, transparent); color: #a97b00; }
.kind-file { background: var(--dc-inset); color: var(--dc-text-2); }

/* ══════════ Drive 快速存取 ══════════ */
.dr-quick-title {
  margin: 0 0 var(--sp-2);
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--dc-text-2);
}

.dr-quick-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
  gap: var(--sp-3);
}

.dr-quick-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dr-quick-card:hover {
  background: var(--dc-inset);
}

.dr-quick-card.active {
  border-color: var(--dc-blue);
  background: var(--dc-blue-soft);
}

.dr-quick-thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--dc-inset);
  flex: 0 0 auto;
}

.dr-quick-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dr-quick-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.dr-quick-copy strong {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dr-quick-copy span {
  font-size: var(--text-2xs);
  color: var(--dc-text-3);
}

/* ══════════ 工具列 ══════════ */
.dr-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: var(--sp-2) 0;
  border-top: 1px solid var(--dc-line);
  border-bottom: 1px solid var(--dc-line);
}

.filter-group {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
}

.filter-select {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  color: var(--dc-text);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-clear-filter {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: var(--dc-inset);
  color: var(--dc-text-2);
  font-size: 0.6875rem;
  cursor: pointer;
}

.dr-count {
  font-size: var(--text-xs);
  color: var(--dc-text-3);
}

.selected-count {
  font-size: var(--text-xs);
  color: var(--dc-blue);
  font-weight: 600;
}

.dr-toolbar-spacer {
  flex: 1;
}

.btn-batch-mode,
.btn-cancel-batch {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  color: var(--dc-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-batch-mode:hover,
.btn-cancel-batch:hover {
  background: var(--dc-inset);
  color: var(--dc-text);
}

.select-all-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--dc-text-2);
  cursor: pointer;
}

.select-all-label input,
.row-check {
  accent-color: var(--dc-blue);
  cursor: pointer;
}

.btn-batch-delete {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: none;
  background: var(--dc-red);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.view-switcher {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-full);
  background: var(--dc-inset);
}

.view-switch-btn {
  height: 26px;
  padding: 0 var(--sp-3);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--dc-text-3);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-switch-btn:hover {
  color: var(--dc-text);
}

.view-switch-btn.active {
  background: var(--dc-surface);
  color: var(--dc-blue);
  font-weight: 600;
  box-shadow: var(--elevation-1);
}

.dr-detail-toggle {
  border: 1px solid var(--dc-line);
  height: 32px;
  background: var(--dc-surface);
}

.dr-detail-toggle.active {
  border-color: var(--dc-blue);
  color: var(--dc-blue);
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
  color: var(--dc-text-3);
}

.empty-icon {
  font-size: 2.75rem;
  opacity: 0.5;
}

.empty-text {
  margin: 0;
  font-size: var(--text-md);
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid var(--dc-inset);
  border-top-color: var(--dc-blue);
  animation: dcSpin 0.8s linear infinite;
}

@keyframes dcSpin {
  to { transform: rotate(360deg); }
}

/* ══════════ 工作區 + 詳細窗格 ══════════ */
.dr-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sp-4);
  align-items: start;
}

.dr-workspace.with-detail {
  grid-template-columns: minmax(0, 1fr) 316px;
}

/* ══════════ 格線 / 清單 ══════════ */
.documents-grid {
  min-width: 0;
  display: grid;
  gap: var(--sp-3);
}

.documents-grid--card {
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
}

.documents-grid--list {
  grid-template-columns: 1fr;
  gap: 0;
}

.dr-list-head,
.document-card--list {
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) 130px minmax(0, 1.3fr) 116px 132px;
  gap: var(--sp-3);
  align-items: center;
}

.dr-list-head {
  padding: 0 var(--sp-3) var(--sp-2);
  border-bottom: 1px solid var(--dc-line);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dc-text-3);
}

.document-card {
  min-width: 0;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.document-card--list {
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--dc-line);
  border-radius: 0;
  cursor: pointer;
}

.document-card--list:hover {
  background: var(--dc-inset);
}

.document-card--list.is-active {
  background: var(--dc-blue-soft);
}

.document-card--list.batch-selected {
  background: var(--dc-blue-soft);
}

.documents-grid--card .document-card:not(.card-editing) {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  overflow: hidden;
  cursor: pointer;
}

.documents-grid--card .document-card:not(.card-editing):hover {
  box-shadow: var(--elevation-2);
}

.documents-grid--card .document-card.is-active {
  border-color: var(--dc-blue);
  box-shadow: 0 0 0 2px var(--dc-blue-soft);
}

.documents-grid--card .document-card.batch-selected {
  border-color: var(--dc-blue);
  background: var(--dc-blue-soft);
}

.dr-card-preview {
  position: relative;
  aspect-ratio: 16 / 10;
  display: grid;
  place-items: center;
  background: var(--dc-inset);
  border-bottom: 1px solid var(--dc-line);
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-check--float {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 18px;
  height: 18px;
}

.dr-card-type {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-3) var(--sp-1);
}

.card-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.document-card:hover .card-actions,
.card-editing .card-actions {
  opacity: 1;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: 0 var(--sp-3) var(--sp-3);
}

.card-meta-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.category-badge {
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--dc-blue-soft);
  color: var(--dc-blue);
  font-size: var(--text-2xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timestamp {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--dc-text-3);
}

.note-preview {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--dc-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.file-info {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  border-radius: var(--radius-sm);
  background: var(--dc-inset);
  font-size: var(--text-xs);
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dc-text-2);
}

.file-type-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--dc-inset);
  color: var(--dc-text-2);
}

.file-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.btn-download,
.btn-preview {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-xs);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  color: var(--dc-text-2);
  font-size: var(--text-2xs);
  text-decoration: none;
  cursor: pointer;
}

.btn-download:hover,
.btn-preview:hover {
  border-color: var(--dc-blue);
  color: var(--dc-blue);
}

.ref-info {
  display: flex;
  gap: var(--sp-2);
  font-size: var(--text-2xs);
  color: var(--dc-text-3);
  overflow: hidden;
}

.ref-info .label {
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.ref-info .value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--dc-line);
  min-height: 32px;
}

.hash-info {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--dc-text-3);
}

/* 清單列欄位 */
.col-name {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.col-name-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.col-note {
  font-size: var(--text-2xs);
  color: var(--dc-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-category,
.col-file,
.col-date {
  min-width: 0;
  font-size: var(--text-xs);
  color: var(--dc-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-date {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--dc-text-3);
}

.col-tools {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.document-card--list:hover .col-tools,
.document-card--list.is-active .col-tools {
  opacity: 1;
}

.dr-muted {
  color: var(--dc-text-3);
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--dc-text-2);
  font-size: 0.8125rem;
  text-decoration: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-icon:hover {
  background: var(--dc-inset);
  color: var(--dc-text);
}

.btn-icon.delete:hover {
  color: var(--dc-red);
}

.btn-icon.save:hover {
  color: var(--dc-blue);
}

/* ══════════ Dropbox 詳細窗格 ══════════ */
.dr-detail {
  position: sticky;
  top: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.dr-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dr-detail-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
}

.dr-detail-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-md);
  background: var(--dc-inset);
  overflow: hidden;
}

.dr-detail-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dr-detail-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.dr-detail-actions {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.dr-detail-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--dc-line);
}

.dr-detail-facts > div {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: var(--sp-2);
  font-size: var(--text-xs);
}

.dr-detail-facts dt {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  color: var(--dc-text-3);
}

.dr-detail-facts dd {
  margin: 0;
  color: var(--dc-text-2);
  overflow-wrap: anywhere;
}

.dr-hash {
  font-family: var(--font-mono);
  font-size: 10px;
}

.dr-detail-note {
  padding-top: var(--sp-2);
  border-top: 1px solid var(--dc-line);
}

.dr-detail-note h4 {
  margin: 0 0 var(--sp-1);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  color: var(--dc-text-3);
}

.dr-detail-note p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--dc-text-2);
  white-space: pre-wrap;
}

.dr-detail-empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--dc-text-3);
}

/* ══════════ 按鈕 ══════════ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  font-family: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--dc-blue);
  color: #fff;
  font-weight: 600;
}

.btn-primary:hover {
  filter: brightness(1.08);
}

.btn-secondary {
  background: var(--dc-surface);
  border-color: var(--dc-line);
  color: var(--dc-text-2);
}

.btn-secondary:hover {
  background: var(--dc-inset);
  color: var(--dc-text);
}

.btn-export,
.btn-import,
.btn-upload {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  color: var(--dc-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-export:hover:not(:disabled),
.btn-import:hover,
.btn-upload:hover:not(:disabled) {
  border-color: var(--dc-blue);
  color: var(--dc-blue);
}

.btn-export:disabled,
.btn-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-import.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* ══════════ 行內編輯 ══════════ */
.document-card.card-editing {
  grid-column: 1 / -1;
  border: 1px solid var(--dc-line);
  border-left: 4px solid var(--dc-blue);
  border-radius: var(--radius-md);
  background: var(--dc-surface);
  box-shadow: var(--elevation-2);
  padding: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.card-editing .card-header,
.card-editing .card-body {
  padding: 0;
}

.inline-edit-content {
  max-height: 440px;
  overflow-y: auto;
}

.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.inline-field-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.inline-field-row > label {
  flex: 0 0 68px;
  padding-top: 8px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--dc-text-3);
}

.inline-input,
.inline-textarea {
  flex: 1;
  min-width: 160px;
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--dc-line);
  background: var(--dc-inset);
  color: var(--dc-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.inline-input:focus,
.inline-textarea:focus {
  outline: none;
  border-color: var(--dc-blue);
  background: var(--dc-surface);
  box-shadow: 0 0 0 3px var(--dc-blue-soft);
}

.inline-textarea {
  resize: vertical;
}

.inline-name {
  font-size: var(--text-md);
  font-weight: 600;
}

.inline-upload-area {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  align-items: flex-start;
}

.btn-inline-upload {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px dashed var(--dc-line);
  color: var(--dc-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-inline-upload:hover {
  border-color: var(--dc-blue);
  color: var(--dc-blue);
}

.btn-inline-upload.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inline-file-name {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--text-xs);
  color: var(--dc-text-2);
  overflow-wrap: anywhere;
}

.btn-inline-remove {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: var(--dc-inset);
  color: var(--dc-text-2);
  font-size: 0.6875rem;
  cursor: pointer;
}

.btn-inline-remove:hover {
  background: var(--dc-red);
  color: #fff;
}

.inline-img-preview {
  max-width: 180px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--dc-line);
}

.inline-csv-chip {
  font-size: var(--text-2xs);
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--dc-green) 14%, transparent);
  color: var(--dc-green);
}

/* ══════════ 匯入 Overlay ══════════ */
.import-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: rgba(12, 12, 16, 0.68);
  backdrop-filter: blur(3px);
}

.import-modal-box {
  width: min(420px, 90vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-6);
  border-radius: var(--radius-lg);
  background: var(--dc-surface);
  border: 1px solid var(--dc-line);
  text-align: center;
}

.import-spinner-anim {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid var(--dc-inset);
  border-top-color: var(--dc-blue);
  animation: dcSpin 0.8s linear infinite;
}

.import-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.import-step,
.import-percent,
.import-item-name {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--dc-text-2);
}

.import-item-name {
  color: var(--dc-text-3);
  overflow-wrap: anywhere;
}

.import-progress-bar {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--dc-inset);
  overflow: hidden;
}

.import-progress-fill {
  height: 100%;
  background: var(--dc-blue);
  transition: width var(--transition-normal);
}

.import-stats {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  justify-content: center;
}

.stat-tag {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.stat-ok {
  background: color-mix(in oklab, var(--dc-green) 16%, transparent);
  color: var(--dc-green);
}

.stat-fail {
  background: color-mix(in oklab, var(--dc-red) 16%, transparent);
  color: var(--dc-red);
}

/* ══════════ Modal ══════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-4);
  background: rgba(12, 12, 16, 0.68);
  backdrop-filter: blur(3px);
}

.modal-content {
  width: min(620px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: var(--dc-surface);
  border: 1px solid var(--dc-line);
  box-shadow: var(--elevation-3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--dc-line);
}

.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--dc-text-2);
  font-size: 1.25rem;
  cursor: pointer;
}

.btn-close:hover {
  background: var(--dc-inset);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-5);
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.form-label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--dc-text-3);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--dc-line);
  background: var(--dc-inset);
  color: var(--dc-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--dc-blue);
  background: var(--dc-surface);
  box-shadow: 0 0 0 3px var(--dc-blue-soft);
}

.form-textarea {
  resize: vertical;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.file-preview,
.cover-upload-preview {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--dc-text-2);
}

.preview-image {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--dc-line);
}

.btn-remove {
  height: 28px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--dc-line);
  background: transparent;
  color: var(--dc-text-2);
  font-size: var(--text-2xs);
  cursor: pointer;
}

.btn-remove:hover {
  color: var(--dc-red);
  border-color: var(--dc-red);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--dc-line);
}

/* ══════════ 檔案預覽 Modal ══════════ */
.file-preview-modal {
  width: min(1040px, 100%);
  height: min(88vh, 900px);
}

.file-preview-modal-body {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: var(--sp-4);
  background: var(--dc-inset);
  overflow: auto;
}

.file-preview-large-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.file-preview-large-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
  border-radius: var(--radius-sm);
}

.file-preview-large-media {
  max-width: 100%;
  max-height: 100%;
}

.file-preview-large-audio {
  width: min(560px, 100%);
}

.file-preview-csv-panel,
.file-preview-text-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-height: 0;
}

.csv-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.csv-preview-meta {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--dc-text-3);
}

.csv-preview-mode-switch {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-full);
  background: var(--dc-surface);
  border: 1px solid var(--dc-line);
}

.csv-mode-btn {
  height: 24px;
  padding: 0 var(--sp-3);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--dc-text-3);
  font-size: var(--text-2xs);
  cursor: pointer;
}

.csv-mode-btn.active {
  background: var(--dc-blue);
  color: #fff;
  font-weight: 600;
}

.csv-preview-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
}

.csv-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

.csv-preview-table th,
.csv-preview-table td {
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--dc-line);
  text-align: left;
  white-space: nowrap;
}

.csv-preview-table thead th {
  position: sticky;
  top: 0;
  background: var(--dc-inset);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  color: var(--dc-text-3);
  z-index: 1;
}

.csv-row-index {
  font-family: var(--font-mono);
  color: var(--dc-text-3);
  width: 48px;
}

.file-preview-text-content {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: var(--sp-3);
  overflow: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--dc-line);
  background: var(--dc-surface);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.file-preview-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  color: var(--dc-text-2);
  text-align: center;
}

.file-generic-icon {
  font-size: 3rem;
}

.file-preview-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  border-top: 1px solid var(--dc-line);
}

/* ══════════ 響應式 ══════════ */
@media (max-width: 1100px) {
  .dr-workspace.with-detail {
    grid-template-columns: minmax(0, 1fr);
  }

  .dr-detail {
    position: static;
    max-height: none;
  }
}

@media (max-width: 768px) {
  .mg-storage {
    gap: var(--sp-3);
  }

  .csv-actions {
    margin-left: 0;
    width: 100%;
  }

  .dr-list-head {
    display: none;
  }

  .document-card--list {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--sp-1);
  }

  .col-category,
  .col-file,
  .col-date {
    grid-column: 1 / -1;
  }

  .col-tools {
    opacity: 1;
  }

  .card-actions {
    opacity: 1;
  }

  .documents-grid--card {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner,
  .import-spinner-anim {
    animation: none;
  }
}
</style>
