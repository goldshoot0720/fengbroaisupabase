<template>
  <PageContainer>
    <div class="feng-tools-page">
      <section class="tools-hero">
        <div class="tools-hero__copy">
          <p class="tools-kicker">FENGBRO TOOLKIT</p>
          <h2>鋒兄工具</h2>
          <p class="tools-lead">
            集中處理網路比價、手機通路價格、YouTube、金融觀察，以及圖片加語音生成影片。
          </p>
        </div>

        <div class="tools-segments" role="tablist" aria-label="鋒兄工具分頁">
          <button
            v-for="tab in toolTabs"
            :key="tab.value"
            type="button"
            class="tools-segment"
            :class="{ active: activeTool === tab.value }"
            @click="activeTool = tab.value"
          >
            <span class="tools-segment__label">{{ tab.label }}</span>
            <span class="tools-segment__desc">{{ tab.description }}</span>
          </button>
        </div>
      </section>

      <section v-if="activeTool === 'biggo'" class="tool-panel">
        <div class="tool-panel__header">
          <div>
            <p class="panel-kicker">鋒兄比價</p>
            <h3>貼上商品網址或關鍵字，查 BigGo 價格區間</h3>
          </div>
        </div>

        <div class="tool-input-grid">
          <label class="tool-field tool-field--wide">
            <span>商品網址</span>
            <input
              v-model.trim="biggoForm.url"
              type="url"
              class="tool-input"
              placeholder="https://24h.pchome.com.tw/prod/DRAHGT-A900HAAZH"
              @keydown.enter.prevent="runBiggoLookup"
            />
          </label>
          <label class="tool-field tool-field--wide">
            <span>或直接輸入關鍵字</span>
            <input
              v-model.trim="biggoForm.keyword"
              type="text"
              class="tool-input"
              placeholder="例如：iPhone 16 Pro 256G"
              @keydown.enter.prevent="runBiggoLookup"
            />
          </label>
          <button type="button" class="tool-primary-btn" :disabled="biggoLoading" @click="runBiggoLookup">
            {{ biggoLoading ? '查詢中...' : '查詢價格' }}
          </button>
        </div>

        <p v-if="biggoError" class="tool-error">{{ biggoError }}</p>

        <template v-if="biggoResult">
          <p v-if="biggoSourceNotice" class="tool-notice">{{ biggoSourceNotice }}</p>
          <p v-if="biggoResult.notice" class="tool-notice">{{ biggoResult.notice }}</p>

          <div class="tool-meta">
            <div>
              <span class="tool-meta__label">商品</span>
              <strong>{{ biggoResult.productTitle }}</strong>
            </div>
            <div>
              <span class="tool-meta__label">BigGo 關鍵字</span>
              <strong>{{ biggoResult.keyword }}</strong>
            </div>
            <div v-if="biggoResult.biggoUrl">
              <span class="tool-meta__label">可行方案</span>
              <a :href="biggoResult.biggoUrl" target="_blank" rel="noreferrer" class="store-card__link">開啟 BigGo 搜尋</a>
            </div>
          </div>

          <div class="stats-grid">
            <article class="stat-tile">
              <span>現在價格</span>
              <strong>{{ formatCurrency(biggoResult.currentPrice) }}</strong>
            </article>
            <article class="stat-tile">
              <span>歷史最高價</span>
              <strong>{{ formatCurrency(biggoResult.historicalHigh) }}</strong>
            </article>
            <article class="stat-tile">
              <span>歷史最低價</span>
              <strong>{{ formatCurrency(biggoResult.historicalLow) }}</strong>
            </article>
          </div>

          <div class="chart-shell">
            <div class="chart-shell__header">
              <div>
                <p class="panel-kicker">價格統計圖</p>
                <h4>BigGo 歷史快照</h4>
              </div>
              <p class="chart-caption">每 7 天更新一次目前價格</p>
            </div>

            <svg
              v-if="biggoChart.points.length > 1"
              class="price-chart"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-label="BigGo 價格走勢"
            >
              <polyline class="chart-area" :points="biggoChart.areaPoints" />
              <polyline class="chart-line" :points="biggoChart.points" />
              <circle
                v-for="point in biggoChart.circles"
                :key="point.key"
                class="chart-dot"
                :cx="point.x"
                :cy="point.y"
                r="1.8"
              />
            </svg>
            <div v-else class="chart-empty">
              {{ biggoResult.lookupMode === 'price' ? '至少累積兩筆 7 天快照後，這裡會出現價格走勢。' : '目前還沒有可繪製的歷史價格資料。' }}
            </div>

            <div v-if="biggoHistory.length > 0" class="chart-legend chart-legend--row">
              <div v-for="entry in biggoHistory" :key="entry.date" class="history-chip">
                <span>{{ formatHistoryDate(entry.date) }}</span>
                <strong>{{ formatCurrency(entry.currentPrice) }}</strong>
              </div>
            </div>
          </div>
        </template>
      </section>

      <section v-else-if="activeTool === 'manual'" class="tool-panel">
        <div class="tool-panel__header">
          <div>
            <p class="panel-kicker">手動紀錄</p>
            <h3>自行輸入商品與價錢，追蹤紀錄與走勢</h3>
            <p class="tool-subtitle">資料保存在此裝置瀏覽器本機，可隨時新增、刪除與查看價格走勢。</p>
          </div>
        </div>

        <div class="manual-block">
          <div class="manual-block__header">
            <p class="panel-kicker">商品</p>
            <h4>新增要追蹤的商品</h4>
          </div>
          <div class="tool-input-grid manual-product-form">
            <label class="tool-field tool-field--wide">
              <span>商品名稱</span>
              <input
                v-model.trim="manualProductForm.name"
                type="text"
                class="tool-input"
                placeholder="例如：iPhone 16 Pro 256G"
                @keydown.enter.prevent="addManualProduct"
              />
            </label>
            <label class="tool-field">
              <span>備註（選填）</span>
              <input
                v-model.trim="manualProductForm.note"
                type="text"
                class="tool-input"
                placeholder="規格、品牌、連結…"
                @keydown.enter.prevent="addManualProduct"
              />
            </label>
            <button type="button" class="tool-primary-btn" @click="addManualProduct">
              新增商品
            </button>
          </div>
          <p v-if="manualProductError" class="tool-error">{{ manualProductError }}</p>

          <div v-if="manualProducts.length === 0" class="chart-empty chart-empty--small">
            尚未新增商品。先建立商品後，就能開始記錄價錢。
          </div>
          <div v-else class="manual-product-list" role="listbox" aria-label="手動紀錄商品清單">
            <button
              v-for="product in manualProducts"
              :key="product.id"
              type="button"
              class="manual-product-chip"
              :class="{ active: selectedManualProductId === product.id }"
              role="option"
              :aria-selected="selectedManualProductId === product.id"
              @click="selectedManualProductId = product.id"
            >
              <span class="manual-product-chip__name">{{ product.name }}</span>
              <small>
                {{ product.prices.length }} 筆
                <template v-if="latestManualPrice(product) !== null">
                  · 最新 {{ formatCurrency(latestManualPrice(product)) }}
                </template>
              </small>
              <span
                class="manual-product-chip__delete"
                title="刪除商品"
                @click.stop="confirmRemoveManualProduct(product.id)"
              >
                刪除
              </span>
            </button>
          </div>
        </div>

        <template v-if="selectedManualProduct">
          <div class="manual-block">
            <div class="manual-block__header">
              <div>
                <p class="panel-kicker">價錢</p>
                <h4>為「{{ selectedManualProduct.name }}」新增價錢</h4>
                <p v-if="selectedManualProduct.note" class="tool-subtitle">{{ selectedManualProduct.note }}</p>
              </div>
            </div>

            <div class="tool-input-grid manual-price-form">
              <label class="tool-field">
                <span>價錢（元）</span>
                <input
                  v-model="manualPriceForm.price"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="decimal"
                  class="tool-input"
                  placeholder="例如：35900"
                  @keydown.enter.prevent="addManualPrice"
                />
              </label>
              <label class="tool-field">
                <span>日期</span>
                <input
                  v-model="manualPriceForm.date"
                  type="date"
                  class="tool-input"
                  @keydown.enter.prevent="addManualPrice"
                />
              </label>
              <label class="tool-field">
                <span>店家／備註（選填）</span>
                <input
                  v-model.trim="manualPriceForm.note"
                  type="text"
                  class="tool-input"
                  placeholder="PChome、momo、門市…"
                  @keydown.enter.prevent="addManualPrice"
                />
              </label>
              <button type="button" class="tool-primary-btn" @click="addManualPrice">
                新增價錢
              </button>
            </div>
            <p v-if="manualPriceError" class="tool-error">{{ manualPriceError }}</p>
          </div>

          <div class="stats-grid">
            <article class="stat-tile">
              <span>最新價錢</span>
              <strong>{{ formatCurrency(manualProductStats.latest) }}</strong>
            </article>
            <article class="stat-tile">
              <span>歷史最高</span>
              <strong>{{ formatCurrency(manualProductStats.high) }}</strong>
            </article>
            <article class="stat-tile">
              <span>歷史最低</span>
              <strong>{{ formatCurrency(manualProductStats.low) }}</strong>
            </article>
            <article class="stat-tile">
              <span>紀錄筆數</span>
              <strong>{{ manualProductStats.count }}</strong>
            </article>
          </div>

          <div class="chart-shell">
            <div class="chart-shell__header">
              <div>
                <p class="panel-kicker">價格走勢圖</p>
                <h4>{{ selectedManualProduct.name }}</h4>
              </div>
              <p class="chart-caption">依日期排序，至少兩筆才會顯示折線</p>
            </div>

            <svg
              v-if="manualChart.points.length > 1"
              class="price-chart"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-label="手動價格走勢"
            >
              <polyline class="chart-area" :points="manualChart.areaPoints" />
              <polyline class="chart-line" :points="manualChart.points" />
              <circle
                v-for="point in manualChart.circles"
                :key="point.key"
                class="chart-dot"
                :cx="point.x"
                :cy="point.y"
                r="1.8"
              />
            </svg>
            <div v-else class="chart-empty">
              {{ manualSortedPrices.length === 0 ? '還沒有價錢紀錄，先新增一筆吧。' : '再新增至少一筆價錢後，這裡會出現走勢圖。' }}
            </div>

            <div v-if="manualSortedPrices.length > 0" class="chart-legend chart-legend--row">
              <div
                v-for="entry in manualSortedPrices"
                :key="entry.id"
                class="history-chip"
              >
                <span>{{ formatHistoryDate(entry.date) }}</span>
                <strong>{{ formatCurrency(entry.price) }}</strong>
                <span v-if="entry.note" class="history-chip__note">{{ entry.note }}</span>
              </div>
            </div>
          </div>

          <div class="manual-block">
            <div class="manual-block__header">
              <div>
                <p class="panel-kicker">價錢紀錄</p>
                <h4>完整列表（新到舊）</h4>
              </div>
            </div>

            <div v-if="manualSortedPricesDesc.length === 0" class="chart-empty chart-empty--small">
              尚無紀錄
            </div>
            <div v-else class="manual-price-table" role="table" aria-label="價錢紀錄列表">
              <div class="manual-price-table__head" role="row">
                <span role="columnheader">日期</span>
                <span role="columnheader">價錢</span>
                <span role="columnheader">店家／備註</span>
                <span role="columnheader">操作</span>
              </div>
              <div
                v-for="entry in manualSortedPricesDesc"
                :key="entry.id"
                class="manual-price-table__row"
                role="row"
              >
                <span role="cell">{{ formatManualDate(entry.date) }}</span>
                <strong role="cell">{{ formatCurrency(entry.price) }}</strong>
                <span role="cell" class="manual-price-table__note">{{ entry.note || '—' }}</span>
                <span role="cell">
                  <button
                    type="button"
                    class="tube-delete-btn"
                    @click="confirmRemoveManualPrice(entry.id)"
                  >
                    刪除
                  </button>
                </span>
              </div>
            </div>
          </div>
        </template>
      </section>

      <section v-else-if="activeTool === 'phone'" class="tool-panel">
        <div class="tool-panel__header">
          <div>
            <p class="panel-kicker">手機比價</p>
            <h3>比對地標網通與傑昇通信</h3>
          </div>
        </div>

        <div class="tool-input-grid">
          <label class="tool-field tool-field--wide">
            <span>型號名稱</span>
            <input
              v-model.trim="phoneCompareForm.keyword"
              type="text"
              class="tool-input"
              :placeholder="phoneComparePlaceholder"
              @keydown.enter.prevent="runPhoneCompare"
            />
          </label>
          <button type="button" class="tool-primary-btn" :disabled="phoneCompareLoading" @click="runPhoneCompare">
            {{ phoneCompareLoading ? '查詢中...' : '查詢比價' }}
          </button>
        </div>

        <p v-if="phoneCompareError" class="tool-error">{{ phoneCompareError }}</p>

        <template v-if="phoneCompareResult">
          <div class="tool-meta">
            <div>
              <span class="tool-meta__label">匹配商品</span>
              <strong>{{ phoneCompareResult.productName }}</strong>
            </div>
            <div>
              <span class="tool-meta__label">品牌</span>
              <strong>{{ phoneCompareResult.brandLabel }}</strong>
            </div>
          </div>

          <div class="store-grid">
            <article v-for="store in phoneCompareResult.stores" :key="store.source" class="store-card">
              <p class="store-card__name">{{ store.source }}</p>
              <strong>{{ store.productName }}</strong>
              <a :href="store.productUrl" target="_blank" rel="noreferrer" class="store-card__link">查看來源</a>
            </article>
          </div>

          <div class="comparison-grid">
            <article
              v-for="item in phoneCompareResult.comparison"
              :key="item.label"
              class="comparison-card"
            >
              <div class="comparison-card__header">
                <h4>{{ item.displayName }}</h4>
                <span class="comparison-card__chip">{{ item.label }}</span>
              </div>

              <div class="comparison-source-list">
                <div
                  v-for="source in sortSources(item.sources)"
                  :key="`${item.label}-${source.source}`"
                  class="comparison-source"
                  :class="{ best: isBestPrice(item.sources, source) }"
                >
                  <div>
                    <span class="comparison-source__label">{{ source.source }}</span>
                    <strong>{{ source.priceLabel }}</strong>
                  </div>
                  <a :href="source.url" target="_blank" rel="noreferrer" class="comparison-source__link">連到頁面</a>
                </div>
              </div>
            </article>
          </div>

          <div class="chart-shell">
            <div class="chart-shell__header">
              <div>
                <p class="panel-kicker">價格統計圖</p>
                <h4>{{ phoneCompareResult.productName }} 歷史紀錄</h4>
              </div>
              <p class="chart-caption">每 7 天記錄一次各容量目前價格</p>
            </div>

            <svg
              v-if="phoneCompareChart.paths.length > 0 && phoneCompareChart.hasAtLeastTwoSnapshots"
              class="price-chart"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-label="手機比價走勢"
            >
              <polyline
                v-for="path in phoneCompareChart.paths"
                :key="path.key"
                class="chart-line chart-line--multi"
                :class="path.className"
                :points="path.points"
              />
            </svg>
            <div v-else class="chart-empty">至少累積兩筆 7 天快照後，這裡會出現容量價格走勢。</div>

            <div v-if="phoneCompareLegend.length > 0" class="chart-legend">
              <div v-for="legend in phoneCompareLegend" :key="legend.key" class="legend-item">
                <span class="legend-swatch" :class="legend.className"></span>
                <span>{{ legend.label }}</span>
              </div>
            </div>
          </div>
        </template>
      </section>

      <section v-else-if="activeTool === 'tube'" class="tool-panel">
        <div class="tool-panel__header">
          <div>
            <p class="panel-kicker">鋒兄tube</p>
            <h3>各頻道最新影片各 10 部</h3>
            <p class="tool-subtitle">目前追蹤 {{ tubeChannelCount }} 個頻道，預設清單 {{ defaultTubeChannelCount }} 個。</p>
          </div>
          <div class="tool-panel__actions">
            <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="showTubeManager = !showTubeManager">
              {{ showTubeManager ? '收起管理' : '頻道管理' }}
            </button>
            <button type="button" class="tool-primary-btn tool-primary-btn--compact" :disabled="tubeLoading" @click="runTubeLookup">
              {{ tubeLoading ? '更新中...' : '重新整理' }}
            </button>
          </div>
        </div>

        <div v-if="showTubeManager" class="tube-manager">
          <div class="tube-manager__form">
            <label class="tool-field">
              <span>頻道別名</span>
              <input
                v-model.trim="tubeChannelForm.label"
                type="text"
                class="tool-input"
                placeholder="例如：cheap"
                @keydown.enter.prevent="addTubeChannel"
              />
            </label>
            <label class="tool-field">
              <span>頻道網址</span>
              <input
                v-model.trim="tubeChannelForm.url"
                type="text"
                class="tool-input"
                placeholder="@cheapaoe 或 https://www.youtube.com/@cheapaoe/videos"
                @keydown.enter.prevent="addTubeChannel"
              />
            </label>
            <button type="button" class="tool-primary-btn" @click="addTubeChannel">新增頻道</button>
            <button type="button" class="tool-secondary-btn" @click="resetTubeChannels">還原預設</button>
          </div>
          <p v-if="tubeChannelFormError" class="tool-error">{{ tubeChannelFormError }}</p>
          <div class="tube-channel-list" aria-label="鋒兄tube 頻道清單">
            <div v-for="channel in tubeUserChannels" :key="channel.id" class="tube-channel-chip">
              <template v-if="editingTubeChannelId === channel.id">
                <label class="tube-channel-edit-field">
                  <span>頻道別名</span>
                  <input v-model.trim="tubeEditForm.label" type="text" class="tool-input" />
                </label>
                <label class="tube-channel-edit-field">
                  <span>頻道網址</span>
                  <input v-model.trim="tubeEditForm.url" type="text" class="tool-input" />
                </label>
                <p v-if="tubeEditFormError" class="tool-error tube-channel-edit-error">{{ tubeEditFormError }}</p>
                <div class="tube-channel-edit-actions">
                  <button type="button" class="tube-save-btn" @click="saveTubeChannelEdit(channel.id)">儲存</button>
                  <button type="button" class="tube-cancel-btn" @click="cancelTubeChannelEdit">取消</button>
                </div>
              </template>
              <template v-else>
                <span>{{ channel.label }}</span>
                <small>{{ channel.url }}</small>
                <div class="tube-channel-chip__actions">
                  <button type="button" class="tube-edit-btn" @click="startTubeChannelEdit(channel)">編輯</button>
                  <button type="button" class="tube-delete-btn" @click="confirmRemoveTubeChannel(channel.id)">刪除</button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <p v-if="tubeError" class="tool-error">{{ tubeError }}</p>
        <p v-else-if="tubeLoading && !tubeResult" class="tool-notice">正在整理鋒兄tube 最新影片。</p>
        <p v-else-if="tubeNewVideos.length > 0" class="tool-notice">
          3 天內共有 {{ tubeNewVideos.length }} 部新影片，首頁會同步提醒使用者。
        </p>
        <p v-else-if="tubeResult" class="tool-notice">目前 3 天內沒有新影片，仍可查看各頻道最新 10 部。</p>

        <div class="tube-channel-grid">
          <article v-for="channel in tubeChannels" :key="channel.id" class="tube-channel-card">
            <div class="tube-channel-card__header">
              <div>
                <p class="store-card__name">{{ channel.handle }}</p>
                <h4 class="tube-channel-title">
                  <span>{{ channel.label }}</span>
                  <a
                    v-if="channel.downfallIndexUpdate?.hasUpdate"
                    :href="channel.downfallIndexUpdate.videoUrl || channel.url"
                    target="_blank"
                    rel="noreferrer"
                    class="tube-update-badge"
                    :title="channel.downfallIndexUpdate.title"
                  >
                    更新
                    <span v-if="channel.downfallIndexUpdate.value !== null">
                      {{ formatDownfallIndex(channel.downfallIndexUpdate.value) }}
                    </span>
                  </a>
                </h4>
              </div>
              <div class="tube-channel-card__actions">
                <a :href="channel.url" target="_blank" rel="noreferrer" class="store-card__link">前往頻道</a>
              </div>
            </div>

            <p v-if="channel.error" class="tool-error">{{ channel.error }}</p>
            <div v-else-if="channel.videos.length === 0" class="chart-empty chart-empty--small">暫無影片資料</div>
            <div v-else class="tube-video-list">
              <a
                v-for="video in channel.videos"
                :key="video.id"
                :href="video.url"
                target="_blank"
                rel="noreferrer"
                class="tube-video-row"
              >
                <img v-if="video.thumbnail" :src="video.thumbnail" :alt="video.title" loading="lazy" />
                <span v-else class="tube-video-row__placeholder">YT</span>
                <span class="tube-video-row__copy">
                  <strong>{{ video.title }}</strong>
                  <span>
                    {{ formatTubeDate(video.published) }}
                    <em v-if="video.isNew">3 天內新片</em>
                  </span>
                </span>
              </a>
            </div>
          </article>
        </div>
      </section>

      <ImageVoiceVideoPanel v-else-if="activeTool === 'image-voice'" />

      <section v-else-if="activeTool === 'finance'" class="tool-panel">
        <div class="tool-panel__header">
          <div>
            <p class="panel-kicker">鋒兄金融</p>
            <h3>金融市場觀察</h3>
          </div>
          <button type="button" class="tool-primary-btn tool-primary-btn--compact" :disabled="financeLoading" @click="runFinanceLookup">
            {{ financeLoading ? '更新中...' : '重新整理' }}
          </button>
        </div>

        <p v-if="financeError" class="tool-error">{{ financeError }}</p>
        <p v-else-if="financeLoading && !financeResult" class="tool-notice">正在整理指數、商品、利率、加密貨幣與台韓股。</p>
        <p v-else-if="financeResult" class="tool-notice">
          資料來源：{{ financeResult.source }}，更新時間 {{ formatTubeDate(financeResult.fetchedAt) }}。
        </p>

        <div class="finance-grid">
          <article
            v-for="item in financeItems"
            :key="item.id"
            class="finance-card"
            :class="{
              'finance-card--high': item.status === 'new-high',
              'finance-card--low': item.status === 'new-low'
            }"
          >
            <div class="finance-card__header">
              <div>
                <p class="store-card__name">{{ item.group }} / {{ item.symbol }}</p>
                <h4>
                  {{ item.name }}
                  <span v-if="item.labelAlias" class="finance-alias">{{ item.labelAlias }}</span>
                </h4>
              </div>
              <span v-if="item.status === 'new-high'" class="finance-status finance-status--high">{{ item.statusLabel || '創新高' }}</span>
              <span v-else-if="item.status === 'new-low'" class="finance-status finance-status--low">創新低</span>
            </div>

            <img
              v-if="item.image"
              class="finance-card__image"
              :src="item.image"
              :alt="`${item.name} image`"
              loading="lazy"
            />
            <strong class="finance-price">{{ item.lastLabel }}</strong>
            <p v-if="item.error" class="tool-error">{{ item.error }}</p>
            <div v-else class="finance-meta-row">
              <span>
                漲跌
                <strong :class="financeChangeClass(item.change)">
                  {{ formatFinanceChange(item.change, item.changePercent) }}
                </strong>
              </span>
              <span>
                {{ item.highLabel || '52週高' }}
                <strong>{{ formatFinanceNumber(item.week52High) }}</strong>
              </span>
              <span>
                {{ item.lowLabel || '52週低' }}
                <strong>{{ formatFinanceNumber(item.week52Low) }}</strong>
              </span>
            </div>

            <div class="finance-history-list">
              <details
                v-for="range in item.historyRanges"
                :key="`${item.id}-${range.key}`"
                class="finance-history"
                :open="range.key === '1y'"
              >
                <summary class="finance-history__header">
                  <span>{{ range.label }}</span>
                  <span class="finance-history__stats">
                    <strong v-if="range.points?.length">{{ range.points.length }} 筆</strong>
                    <strong
                      v-if="range.summary?.label"
                      :class="financeChangeClass(range.summary.change)"
                    >
                      {{ range.summary.label }}
                    </strong>
                  </span>
                </summary>
                <svg
                  v-if="range.chart.points"
                  class="finance-history-chart"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  :aria-label="`${item.name} ${range.label}`"
                >
                  <polyline class="finance-history-area" :points="range.chart.areaPoints" />
                  <polyline class="finance-history-line" :points="range.chart.points" />
                  <circle
                    v-for="point in range.chart.circles"
                    :key="point.key"
                    class="finance-history-dot"
                    :cx="point.x"
                    :cy="point.y"
                    r="1.5"
                  />
                </svg>
                <div v-else class="finance-history-empty">暫無{{ range.label }}資料</div>
              </details>
            </div>

            <div class="finance-link-row">
              <a :href="item.url" target="_blank" rel="noreferrer" class="store-card__link">查看 {{ item.source || 'CNBC' }}</a>
              <a
                v-if="item.youtubeUrl"
                :href="item.youtubeUrl"
                target="_blank"
                rel="noreferrer"
                class="store-card__link store-card__link--youtube"
              >
                查看 YouTube
              </a>
            </div>
          </article>
        </div>
      </section>
    </div>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import ImageVoiceVideoPanel from './ImageVoiceVideoPanel.vue'
import { FENG_TUBE_ACTIVE_TOOL_KEY, FENG_TUBE_CHANNELS } from '../../utils/fengTubeChannels'

const toolTabs = [
  { value: 'biggo', label: '鋒兄比價', description: '網址或關鍵字查 BigGo 價格區間' },
  { value: 'manual', label: '手動紀錄', description: '自行輸入商品與價錢、查看走勢' },
  { value: 'phone', label: '手機比價', description: '地標網通與傑昇通信價格比較' },
  { value: 'tube', label: '鋒兄tube', description: '追蹤指定 YouTube 頻道最新影片' },
  { value: 'finance', label: '鋒兄金融', description: '追蹤 CNBC 市場價格與高低標記' },
  { value: 'image-voice', label: '圖片語音成片', description: '圖片 + 語音 = 影片（預設男聲／單一人物自動選聲）' }
]

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const isValidTool = (value) => toolTabs.some(tab => tab.value === value)

const readInitialTool = () => {
  if (!import.meta.client) return 'biggo'
  const savedTool = localStorage.getItem(FENG_TUBE_ACTIVE_TOOL_KEY)
  return isValidTool(savedTool) ? savedTool : 'biggo'
}

const activeTool = ref(isValidTool(props.modelValue) ? props.modelValue : readInitialTool())

const currentYearSuffix = String(new Date().getFullYear()).slice(-2)
const defaultPhoneKeyword = `Samsung S${currentYearSuffix}`
const phoneComparePlaceholder = `${defaultPhoneKeyword}、Apple iPhone ${currentYearSuffix}、A${currentYearSuffix}`

const biggoForm = ref({ url: '', keyword: '' })
const biggoLoading = ref(false)
const biggoError = ref('')
const biggoResult = ref(null)
const biggoHistory = ref([])

const phoneCompareForm = ref({ keyword: defaultPhoneKeyword })
const phoneCompareLoading = ref(false)
const phoneCompareError = ref('')
const phoneCompareResult = ref(null)
const phoneCompareHistory = ref([])

const manualProducts = ref([])
const selectedManualProductId = ref('')
const manualProductForm = ref({ name: '', note: '' })
const manualProductError = ref('')
const manualPriceForm = ref({ price: '', date: '', note: '' })
const manualPriceError = ref('')

const tubeLoading = ref(false)
const tubeError = ref('')
const tubeResult = ref(null)
const tubeUserChannels = ref(FENG_TUBE_CHANNELS.map(channel => ({ ...channel })))
const tubeChannelForm = ref({ label: '', url: '' })
const tubeChannelFormError = ref('')
const showTubeManager = ref(false)
const editingTubeChannelId = ref('')
const tubeEditForm = ref({ label: '', url: '' })
const tubeEditFormError = ref('')

const financeLoading = ref(false)
const financeError = ref('')
const financeResult = ref(null)

const HISTORY_INTERVAL_DAYS = 7
const BIGGO_HISTORY_KEY = 'fengbro-tools-biggo-history'
const PHONE_COMPARE_HISTORY_KEY = 'fengbro-tools-phone-compare-history'
const MANUAL_PRICE_STORAGE_KEY = 'fengbro-tools-manual-prices'
const MANUAL_SELECTED_PRODUCT_KEY = 'fengbro-tools-manual-selected-product'
const TUBE_CHANNELS_STORAGE_KEY = 'fengbro-tools-tube-channels'
const defaultTubeChannelCount = FENG_TUBE_CHANNELS.length

const createManualId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const todayDateInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeManualPriceEntry = (entry) => {
  const price = Number(entry?.price)
  if (!Number.isFinite(price)) return null
  const date = String(entry?.date || '').trim()
  if (!date) return null
  return {
    id: String(entry?.id || createManualId('price')),
    price,
    date,
    note: String(entry?.note || '').trim(),
    createdAt: String(entry?.createdAt || new Date().toISOString())
  }
}

const normalizeManualProduct = (product) => {
  const name = String(product?.name || '').trim()
  if (!name) return null
  const prices = Array.isArray(product?.prices)
    ? product.prices.map(normalizeManualPriceEntry).filter(Boolean)
    : []
  return {
    id: String(product?.id || createManualId('product')),
    name,
    note: String(product?.note || '').trim(),
    createdAt: String(product?.createdAt || new Date().toISOString()),
    prices
  }
}

const writeManualProducts = () => {
  if (!import.meta.client) return
  localStorage.setItem(MANUAL_PRICE_STORAGE_KEY, JSON.stringify(manualProducts.value))
  if (selectedManualProductId.value) {
    localStorage.setItem(MANUAL_SELECTED_PRODUCT_KEY, selectedManualProductId.value)
  } else {
    localStorage.removeItem(MANUAL_SELECTED_PRODUCT_KEY)
  }
}

const readManualProducts = () => {
  if (!import.meta.client) return
  const parsed = safeJsonParse(localStorage.getItem(MANUAL_PRICE_STORAGE_KEY) || '[]', [])
  const products = Array.isArray(parsed)
    ? parsed.map(normalizeManualProduct).filter(Boolean)
    : []
  manualProducts.value = products

  const savedSelected = localStorage.getItem(MANUAL_SELECTED_PRODUCT_KEY) || ''
  if (savedSelected && products.some(product => product.id === savedSelected)) {
    selectedManualProductId.value = savedSelected
  } else {
    selectedManualProductId.value = products[0]?.id || ''
  }

  if (!manualPriceForm.value.date) {
    manualPriceForm.value.date = todayDateInputValue()
  }
}

const latestManualPrice = (product) => {
  const prices = Array.isArray(product?.prices) ? product.prices : []
  if (prices.length === 0) return null
  const sorted = [...prices].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  })
  return sorted[sorted.length - 1]?.price ?? null
}

const addManualProduct = () => {
  const name = String(manualProductForm.value.name || '').trim()
  if (!name) {
    manualProductError.value = '請輸入商品名稱。'
    return
  }

  const isDuplicate = manualProducts.value.some(
    product => product.name.toLowerCase() === name.toLowerCase()
  )
  if (isDuplicate) {
    manualProductError.value = '已有相同名稱的商品，請改用其他名稱或直接選取。'
    return
  }

  const product = {
    id: createManualId('product'),
    name,
    note: String(manualProductForm.value.note || '').trim(),
    createdAt: new Date().toISOString(),
    prices: []
  }

  manualProducts.value = [product, ...manualProducts.value]
  selectedManualProductId.value = product.id
  manualProductForm.value = { name: '', note: '' }
  manualProductError.value = ''
  writeManualProducts()
}

const removeManualProduct = (productId) => {
  manualProducts.value = manualProducts.value.filter(product => product.id !== productId)
  if (selectedManualProductId.value === productId) {
    selectedManualProductId.value = manualProducts.value[0]?.id || ''
  }
  writeManualProducts()
}

const confirmRemoveManualProduct = (productId) => {
  const product = manualProducts.value.find(item => item.id === productId)
  const label = product?.name || '這個商品'
  if (import.meta.client && !window.confirm(`確定刪除「${label}」及其全部價錢紀錄？`)) return
  removeManualProduct(productId)
}

const addManualPrice = () => {
  if (!selectedManualProductId.value) {
    manualPriceError.value = '請先選擇或新增商品。'
    return
  }

  const rawPrice = String(manualPriceForm.value.price ?? '').trim().replace(/,/g, '')
  const price = Number(rawPrice)
  if (!rawPrice || !Number.isFinite(price) || price < 0) {
    manualPriceError.value = '請輸入有效的價錢（0 或正數）。'
    return
  }

  const date = String(manualPriceForm.value.date || '').trim() || todayDateInputValue()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    manualPriceError.value = '請選擇有效的日期。'
    return
  }

  const entry = {
    id: createManualId('price'),
    price,
    date,
    note: String(manualPriceForm.value.note || '').trim(),
    createdAt: new Date().toISOString()
  }

  manualProducts.value = manualProducts.value.map((product) => {
    if (product.id !== selectedManualProductId.value) return product
    return {
      ...product,
      prices: [...product.prices, entry]
    }
  })

  manualPriceForm.value = {
    price: '',
    date: todayDateInputValue(),
    note: ''
  }
  manualPriceError.value = ''
  writeManualProducts()
}

const removeManualPrice = (priceId) => {
  manualProducts.value = manualProducts.value.map((product) => {
    if (product.id !== selectedManualProductId.value) return product
    return {
      ...product,
      prices: product.prices.filter(entry => entry.id !== priceId)
    }
  })
  writeManualProducts()
}

const confirmRemoveManualPrice = (priceId) => {
  if (import.meta.client && !window.confirm('確定刪除這筆價錢紀錄？')) return
  removeManualPrice(priceId)
}

const formatManualDate = (value) => {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${year}/${month}/${day}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '--'
  if (typeof value === 'string' && !/^\d/.test(value) && !/^\$/.test(value)) return value
  const amount = Number(String(value).replace(/[^\d.-]/g, ''))
  if (Number.isNaN(amount)) return String(value)
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatHistoryDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const formatTubeDate = (value) => {
  if (!value) return '未知日期'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatDownfallIndex = (value) => {
  if (value === null || value === undefined || value === '') return '--'
  const amount = Number(String(value).replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(amount)) return String(value)
  return amount.toFixed(2).padStart(5, '0')
}

const formatFinanceNumber = (value) => {
  if (value === null || value === undefined || value === '') return '--'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: amount >= 100 ? 2 : 4
  }).format(amount)
}

const formatFinanceChange = (change, percent) => {
  const changeLabel = change === null || change === undefined ? '--' : formatFinanceNumber(change)
  const percentLabel = percent === null || percent === undefined ? '' : ` (${formatFinanceNumber(percent)}%)`
  return `${changeLabel}${percentLabel}`
}

const formatFinanceRangeChange = (change, percent) => {
  if (change === null || change === undefined) return ''
  const amount = Number(change)
  if (!Number.isFinite(amount)) return ''
  const sign = amount > 0 ? '+' : ''
  const percentAmount = Number(percent)
  const percentLabel = Number.isFinite(percentAmount)
    ? ` (${percentAmount > 0 ? '+' : ''}${formatFinanceNumber(percentAmount)}%)`
    : ''
  return `${sign}${formatFinanceNumber(amount)}${percentLabel}`
}

const financeChangeClass = (change) => {
  if (Number(change) > 0) return 'finance-change--up'
  if (Number(change) < 0) return 'finance-change--down'
  return ''
}

const buildFinanceRangeSummary = (points) => {
  const values = (points || [])
    .map(point => Number(point?.value))
    .filter(value => Number.isFinite(value))

  if (values.length < 2) {
    return {
      change: null,
      percent: null,
      label: ''
    }
  }

  const first = values[0]
  const last = values[values.length - 1]
  const change = last - first
  const percent = first !== 0 ? (change / Math.abs(first)) * 100 : null

  return {
    change,
    percent,
    label: formatFinanceRangeChange(change, percent)
  }
}

const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase()

const readHistoryStore = (storageKey) => {
  if (!import.meta.client) return {}
  return safeJsonParse(localStorage.getItem(storageKey) || '{}', {})
}

const writeHistoryStore = (storageKey, store) => {
  if (!import.meta.client) return
  localStorage.setItem(storageKey, JSON.stringify(store))
}

const updateHistoryEntries = (storageKey, queryKey, nextEntry) => {
  const store = readHistoryStore(storageKey)
  const currentEntries = Array.isArray(store[queryKey]) ? store[queryKey] : []
  const nextDate = new Date(nextEntry.date)
  const lastEntry = currentEntries[currentEntries.length - 1]

  if (lastEntry?.date) {
    const lastDate = new Date(lastEntry.date)
    const diffDays = (nextDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < HISTORY_INTERVAL_DAYS) {
      currentEntries[currentEntries.length - 1] = nextEntry
    } else {
      currentEntries.push(nextEntry)
    }
  } else {
    currentEntries.push(nextEntry)
  }

  store[queryKey] = currentEntries
  writeHistoryStore(storageKey, store)
  return currentEntries
}

const loadHistoryEntries = (storageKey, queryKey) => {
  const store = readHistoryStore(storageKey)
  return Array.isArray(store[queryKey]) ? store[queryKey] : []
}

const buildSingleSeriesChart = (entries, field) => {
  const values = entries.map(entry => Number(entry[field])).filter(value => Number.isFinite(value))
  if (values.length < 2) return { points: '', areaPoints: '', circles: [] }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const circles = entries
    .map((entry, index) => {
      const value = Number(entry[field])
      if (!Number.isFinite(value)) return null
      const x = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 92 + 4
      const y = 96 - ((value - min) / range) * 72 - 6
      return { key: `${entry.date}-${index}`, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
    })
    .filter(Boolean)

  const points = circles.map(point => `${point.x},${point.y}`).join(' ')
  return {
    points,
    areaPoints: `4,96 ${points} 96,96`,
    circles
  }
}

const seriesPalette = ['chart-series-a', 'chart-series-b', 'chart-series-c', 'chart-series-d', 'chart-series-e', 'chart-series-f']

const seriesClassName = (label) => {
  const seed = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return seriesPalette[seed % seriesPalette.length]
}

const buildMultiSeriesChart = (entries, seriesKeys) => {
  const numericValues = []
  for (const entry of entries) {
    for (const key of seriesKeys) {
      const value = Number(entry.series?.[key])
      if (Number.isFinite(value)) numericValues.push(value)
    }
  }

  if (numericValues.length === 0) return { paths: [], hasAtLeastTwoSnapshots: false }

  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1

  const paths = seriesKeys
    .map((key) => {
      const points = entries
        .map((entry, index) => {
          const value = Number(entry.series?.[key])
          if (!Number.isFinite(value)) return null
          const x = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 92 + 4
          const y = 96 - ((value - min) / range) * 72 - 6
          return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`
        })
        .filter(Boolean)
        .join(' ')

      if (!points) return null
      return { key, points, className: seriesClassName(key) }
    })
    .filter(Boolean)

  return {
    paths,
    hasAtLeastTwoSnapshots: entries.length > 1
  }
}

const biggoChart = computed(() => buildSingleSeriesChart(biggoHistory.value, 'currentPrice'))
const biggoSourceNotice = computed(() => {
  const status = Number(biggoResult.value?.sourceStatus)
  if (!Number.isFinite(status) || status < 400) return ''
  if (status === 429 || status === 403) {
    return `原始商品頁回應 ${status}（限流），若結果不準請改用關鍵字查詢。`
  }
  return `原始商品頁回應 ${status}，目前改用網址關鍵字轉查 BigGo。`
})

const selectedManualProduct = computed(() =>
  manualProducts.value.find(product => product.id === selectedManualProductId.value) || null
)

const manualSortedPrices = computed(() => {
  const prices = selectedManualProduct.value?.prices || []
  return [...prices].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  })
})

const manualSortedPricesDesc = computed(() => [...manualSortedPrices.value].reverse())

const manualProductStats = computed(() => {
  const prices = manualSortedPrices.value.map(entry => Number(entry.price)).filter(Number.isFinite)
  if (prices.length === 0) {
    return { latest: null, high: null, low: null, count: 0 }
  }
  return {
    latest: prices[prices.length - 1],
    high: Math.max(...prices),
    low: Math.min(...prices),
    count: prices.length
  }
})

const manualChart = computed(() => buildSingleSeriesChart(manualSortedPrices.value, 'price'))

const phoneCompareSeriesKeys = computed(() => {
  if (!phoneCompareResult.value) return []
  return phoneCompareResult.value.comparison.flatMap(item =>
    item.sources.map(source => `${item.label}__${source.source}`)
  )
})

const phoneCompareChart = computed(() => buildMultiSeriesChart(phoneCompareHistory.value, phoneCompareSeriesKeys.value))
const phoneCompareLegend = computed(() => {
  if (!phoneCompareResult.value) return []
  return phoneCompareResult.value.comparison.flatMap(item =>
    item.sources.map(source => ({
      key: `${item.label}__${source.source}`,
      label: `${item.label} / ${source.source}`,
      className: seriesClassName(`${item.label}__${source.source}`)
    }))
  )
})

const latestTubeChannelTime = (channel) => {
  const timestamps = (channel?.videos || [])
    .map(video => new Date(video.published).getTime())
    .filter(timestamp => Number.isFinite(timestamp))

  return timestamps.length > 0 ? Math.max(...timestamps) : 0
}

const tubeChannels = computed(() => {
  const channels = tubeResult.value?.channels || []
  return [...channels].sort((left, right) => latestTubeChannelTime(right) - latestTubeChannelTime(left))
})
const tubeNewVideos = computed(() => tubeResult.value?.newVideos || [])
const tubeChannelCount = computed(() => tubeUserChannels.value.length)
const financeItems = computed(() => {
  const items = financeResult.value?.items || []
  return items.map((item) => {
    const historyRanges = Array.isArray(item.historyRanges)
      ? item.historyRanges
      : [{ key: '5y', label: '最近五年走勢', years: 5, points: item.history || [] }]

    return {
      ...item,
      historyRanges: historyRanges.map(range => ({
        ...range,
        points: range.points || [],
        chart: buildSingleSeriesChart(range.points || [], 'value'),
        summary: buildFinanceRangeSummary(range.points || [])
      }))
    }
  })
})

const normalizeTubeChannels = (channels) => {
  if (!Array.isArray(channels)) return []
  return channels
    .map(channel => ({
      id: String(channel?.id || '').trim(),
      label: String(channel?.label || '').trim(),
      handle: String(channel?.handle || '').trim(),
      url: String(channel?.url || '').trim()
    }))
    .filter(channel =>
      channel.id &&
      channel.label &&
      channel.handle &&
      /^https:\/\/www\.youtube\.com\/@[^/]+\/videos$/i.test(channel.url)
    )
}

const writeTubeChannels = () => {
  if (!import.meta.client) return
  localStorage.setItem(TUBE_CHANNELS_STORAGE_KEY, JSON.stringify(tubeUserChannels.value))
}

const readTubeChannels = () => {
  if (!import.meta.client) return
  const savedValue = localStorage.getItem(TUBE_CHANNELS_STORAGE_KEY)
  if (savedValue === null) return

  const parsedChannels = safeJsonParse(savedValue, [])
  if (Array.isArray(parsedChannels)) {
    tubeUserChannels.value = normalizeTubeChannels(parsedChannels)
  }
}

const decodeHandleSegment = (value) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const slugifyTubeId = (value) => {
  const decoded = decodeHandleSegment(value)
  const slug = decoded
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `tube-${Date.now()}`
}

const uniqueTubeId = (baseId) => {
  const existingIds = new Set(tubeUserChannels.value.map(channel => channel.id))
  if (!existingIds.has(baseId)) return baseId

  let index = 2
  while (existingIds.has(`${baseId}-${index}`)) index += 1
  return `${baseId}-${index}`
}

const parseTubeChannelSource = (source) => {
  const trimmedSource = String(source || '').trim()
  if (!trimmedSource) return null

  if (/^https?:\/\//i.test(trimmedSource)) {
    try {
      const url = new URL(trimmedSource)
      const handleSegment = url.pathname.match(/\/@([^/]+)/)?.[1]
      if (!handleSegment || !/youtube\.com$/i.test(url.hostname.replace(/^www\./, ''))) return null
      return {
        handleSegment,
        handle: `@${handleSegment}`,
        url: `https://www.youtube.com/@${handleSegment}/videos`
      }
    } catch {
      return null
    }
  }

  const rawHandle = trimmedSource.replace(/^@/, '')
  if (!rawHandle) return null
  const handleSegment = encodeURIComponent(rawHandle)
  return {
    handleSegment,
    handle: `@${handleSegment}`,
    url: `https://www.youtube.com/@${handleSegment}/videos`
  }
}

const isDuplicateTubeChannel = (parsed, currentChannelId = '') => {
  return tubeUserChannels.value.some(channel =>
    channel.id !== currentChannelId &&
    (
      channel.handle.toLowerCase() === parsed.handle.toLowerCase() ||
      channel.url.toLowerCase() === parsed.url.toLowerCase()
    )
  )
}

const resolveTubeChannelLabel = async (parsed, fallbackLabel) => {
  if (fallbackLabel) return fallbackLabel

  try {
    const response = await $fetch('/api/feng-tools/youtube-channel', {
      query: { url: parsed.url }
    })
    return response?.label || decodeHandleSegment(parsed.handleSegment)
  } catch {
    return decodeHandleSegment(parsed.handleSegment)
  }
}

const addTubeChannel = async () => {
  const parsed = parseTubeChannelSource(tubeChannelForm.value.url)
  if (!parsed) {
    tubeChannelFormError.value = '請輸入有效的 YouTube handle 或頻道網址。'
    return
  }

  if (isDuplicateTubeChannel(parsed)) {
    tubeChannelFormError.value = '這個頻道已經在清單裡。'
    return
  }

  const channelLabel = await resolveTubeChannelLabel(parsed, tubeChannelForm.value.label)
  const channel = {
    id: uniqueTubeId(slugifyTubeId(parsed.handleSegment)),
    label: channelLabel,
    handle: parsed.handle,
    url: parsed.url
  }

  tubeUserChannels.value = [...tubeUserChannels.value, channel]
  tubeChannelForm.value = { label: '', url: '' }
  tubeChannelFormError.value = ''
  writeTubeChannels()
  runTubeLookup()
}

const removeTubeChannel = (channelId) => {
  tubeUserChannels.value = tubeUserChannels.value.filter(channel => channel.id !== channelId)
  writeTubeChannels()

  if (tubeResult.value) {
    tubeResult.value = {
      ...tubeResult.value,
      channels: tubeResult.value.channels.filter(channel => channel.id !== channelId),
      newVideos: tubeResult.value.newVideos.filter(video => video.channelId !== channelId)
    }
  }
}

const confirmRemoveTubeChannel = (channelId) => {
  const channel = tubeUserChannels.value.find(item => item.id === channelId)
  const channelLabel = channel?.label || '這個頻道'
  if (import.meta.client && !window.confirm(`確定刪除「${channelLabel}」？`)) return
  removeTubeChannel(channelId)
}

const startTubeChannelEdit = (channel) => {
  editingTubeChannelId.value = channel.id
  tubeEditForm.value = {
    label: channel.label,
    url: channel.url
  }
  tubeEditFormError.value = ''
}

const cancelTubeChannelEdit = () => {
  editingTubeChannelId.value = ''
  tubeEditForm.value = { label: '', url: '' }
  tubeEditFormError.value = ''
}

const saveTubeChannelEdit = async (channelId) => {
  const parsed = parseTubeChannelSource(tubeEditForm.value.url)
  if (!parsed) {
    tubeEditFormError.value = '請輸入有效的 YouTube handle 或頻道網址。'
    return
  }

  if (isDuplicateTubeChannel(parsed, channelId)) {
    tubeEditFormError.value = '這個頻道已經在清單裡。'
    return
  }

  const channelLabel = await resolveTubeChannelLabel(parsed, tubeEditForm.value.label)
  tubeUserChannels.value = tubeUserChannels.value.map(channel => {
    if (channel.id !== channelId) return channel
    return {
      ...channel,
      label: channelLabel,
      handle: parsed.handle,
      url: parsed.url
    }
  })

  writeTubeChannels()
  cancelTubeChannelEdit()
  runTubeLookup()
}

const resetTubeChannels = () => {
  if (import.meta.client && !window.confirm('確定還原為預設 20 個頻道？目前自訂清單會被覆蓋。')) return
  tubeUserChannels.value = FENG_TUBE_CHANNELS.map(channel => ({ ...channel }))
  tubeChannelFormError.value = ''
  cancelTubeChannelEdit()
  writeTubeChannels()
  runTubeLookup()
}

const sortSources = (sources) => [...sources].sort((a, b) => {
  const left = Number.isFinite(a.numericPrice) ? a.numericPrice : Number.MAX_SAFE_INTEGER
  const right = Number.isFinite(b.numericPrice) ? b.numericPrice : Number.MAX_SAFE_INTEGER
  return left - right
})

const isBestPrice = (sources, source) => {
  const values = sources.map(item => item.numericPrice).filter(value => Number.isFinite(value))
  if (values.length === 0 || !Number.isFinite(source.numericPrice)) return false
  return source.numericPrice === Math.min(...values)
}

const runBiggoLookup = async () => {
  if (!biggoForm.value.url && !biggoForm.value.keyword) {
    biggoError.value = '請先輸入商品網址或搜尋關鍵字。'
    return
  }

  biggoLoading.value = true
  biggoError.value = ''
  biggoResult.value = null

  try {
    const response = await $fetch('/api/feng-tools/biggo', {
      method: 'POST',
      body: {
        url: biggoForm.value.url || undefined,
        keyword: biggoForm.value.keyword || undefined
      }
    })

    biggoResult.value = response
    if (Number.isFinite(Number(response.currentPrice))) {
      const queryKey = normalizeLookupKey(biggoForm.value.url || biggoForm.value.keyword)
      biggoHistory.value = updateHistoryEntries(BIGGO_HISTORY_KEY, queryKey, {
        date: new Date().toISOString(),
        currentPrice: response.currentPrice,
        historicalHigh: response.historicalHigh,
        historicalLow: response.historicalLow
      })
    } else {
      biggoHistory.value = []
    }
  } catch (error) {
    biggoResult.value = null
    const status = Number(error?.statusCode || error?.status || error?.data?.statusCode || 0)
    if (status === 429) {
      biggoError.value = error?.data?.statusMessage || '比價服務暫時忙碌，請稍候再試。'
    } else {
      biggoError.value = error?.data?.statusMessage || error?.message || 'BigGo 查詢失敗。'
    }
  } finally {
    biggoLoading.value = false
  }
}

const runPhoneCompare = async () => {
  if (!phoneCompareForm.value.keyword) {
    phoneCompareError.value = '請先輸入型號名稱。'
    phoneCompareResult.value = null
    phoneCompareHistory.value = []
    return
  }

  phoneCompareLoading.value = true
  phoneCompareError.value = ''
  phoneCompareResult.value = null

  try {
    const response = await $fetch('/api/feng-tools/landtop', {
      method: 'POST',
      body: { keyword: phoneCompareForm.value.keyword }
    })

    phoneCompareResult.value = response
    const queryKey = normalizeLookupKey(phoneCompareForm.value.keyword)
    const snapshotSeries = Object.fromEntries(
      response.comparison.flatMap(item =>
        item.sources.map(source => [`${item.label}__${source.source}`, source.numericPrice ?? null])
      )
    )

    phoneCompareHistory.value = updateHistoryEntries(PHONE_COMPARE_HISTORY_KEY, queryKey, {
      date: new Date().toISOString(),
      series: snapshotSeries
    })
  } catch (error) {
    phoneCompareResult.value = null
    phoneCompareHistory.value = []
    phoneCompareError.value = error?.data?.statusMessage || error?.message || '手機比價查詢失敗。'
  } finally {
    phoneCompareLoading.value = false
  }
}

const runTubeLookup = async () => {
  tubeLoading.value = true
  tubeError.value = ''

  try {
    tubeResult.value = await $fetch('/api/feng-tools/youtube', {
      query: { channels: JSON.stringify(tubeUserChannels.value) }
    })
  } catch (error) {
    tubeError.value = error?.data?.statusMessage || error?.message || '鋒兄tube 更新失敗'
  } finally {
    tubeLoading.value = false
  }
}

const runFinanceLookup = async () => {
  financeLoading.value = true
  financeError.value = ''

  try {
    financeResult.value = await $fetch('/api/feng-tools/finance')
  } catch (error) {
    financeError.value = error?.data?.statusMessage || error?.message || '鋒兄金融更新失敗'
  } finally {
    financeLoading.value = false
  }
}

onMounted(() => {
  readTubeChannels()
  readManualProducts()
  if (activeTool.value === 'tube') runTubeLookup()
  if (activeTool.value === 'finance') runFinanceLookup()
})

watch(() => props.modelValue, (value) => {
  if (isValidTool(value) && value !== activeTool.value) {
    activeTool.value = value
  }
})

watch(activeTool, (value) => {
  if (import.meta.client) {
    localStorage.setItem(FENG_TUBE_ACTIVE_TOOL_KEY, value)
  }

  emit('update:modelValue', value)

  if (value === 'manual') {
    readManualProducts()
    if (!manualPriceForm.value.date) {
      manualPriceForm.value.date = todayDateInputValue()
    }
  }

  if (value === 'tube' && !tubeResult.value && !tubeLoading.value) {
    runTubeLookup()
  }

  if (value === 'finance' && !financeResult.value && !financeLoading.value) {
    runFinanceLookup()
  }
})

watch(selectedManualProductId, (value) => {
  if (!import.meta.client) return
  if (value) {
    localStorage.setItem(MANUAL_SELECTED_PRODUCT_KEY, value)
  } else {
    localStorage.removeItem(MANUAL_SELECTED_PRODUCT_KEY)
  }
})

watch(
  () => [biggoForm.value.url, biggoForm.value.keyword],
  ([url, keyword]) => {
    const key = url || keyword
    biggoHistory.value = key ? loadHistoryEntries(BIGGO_HISTORY_KEY, normalizeLookupKey(key)) : []
  },
  { immediate: true }
)

watch(
  () => phoneCompareForm.value.keyword,
  (value) => {
    phoneCompareHistory.value = value ? loadHistoryEntries(PHONE_COMPARE_HISTORY_KEY, normalizeLookupKey(value)) : []
  },
  { immediate: true }
)
</script>

<style scoped>
.feng-tools-page {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.tools-hero,
.tool-panel {
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
  box-shadow: var(--shadow-soft);
}

.tools-hero {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1.4rem;
}

.tools-kicker,
.panel-kicker {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.tools-hero h2,
.tool-panel h3,
.comparison-card h4,
.chart-shell h4 {
  margin: 0.3rem 0 0;
  font-family: var(--font-display);
}

.tools-hero h2 {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
}

.tools-lead {
  margin: 0.7rem 0 0;
  color: var(--text-secondary);
  line-height: 1.75;
  max-width: 58ch;
}

.tools-segments {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.8rem;
}

.tools-segment {
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--bg-primary);
  padding: 0.85rem 1.05rem;
  text-align: left;
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.tools-segment:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.tools-segment.active {
  border-color: color-mix(in oklab, var(--primary) 42%, var(--border-color));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary) 28%, transparent);
}

.tools-segment__label,
.tools-segment__desc {
  display: block;
}

.tools-segment__label {
  font-weight: 700;
  color: var(--text-primary);
}

.tools-segment__desc {
  margin-top: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.55;
}

.tool-panel {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tool-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.tool-panel__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.7rem;
  align-items: center;
}

.tool-subtitle {
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.tool-input-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: end;
}

.tool-field {
  display: grid;
  gap: 0.45rem;
}

.tool-field span {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.tool-input {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 52px;
  padding: 0.85rem 1rem;
}

.tool-primary-btn {
  min-height: 52px;
  border-radius: 999px;
  border: 0;
  padding: 0.85rem 1.2rem;
  background: linear-gradient(135deg, color-mix(in oklab, var(--primary) 82%, white), color-mix(in oklab, var(--accent) 65%, white));
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.tool-primary-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

.tool-primary-btn--compact {
  min-height: 44px;
  padding-inline: 1rem;
}

.tool-secondary-btn--compact {
  min-height: 44px;
  padding-inline: 1rem;
}

.tool-secondary-btn {
  min-height: 52px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  padding: 0.85rem 1.1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;
}

.tool-error {
  margin: 0;
  color: var(--danger);
}

.tool-notice {
  margin: 0;
  padding: 0.8rem 0.95rem;
  border-radius: 16px;
  border: 1px solid color-mix(in oklab, var(--primary) 22%, var(--border-color));
  background: color-mix(in oklab, var(--primary) 8%, var(--bg-primary));
  color: var(--text-secondary);
  line-height: 1.6;
}

.tool-meta,
.stats-grid,
.store-grid,
.comparison-grid {
  display: grid;
  gap: 0.8rem;
}

.tool-meta,
.store-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.comparison-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.finance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.finance-card {
  display: grid;
  gap: 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: var(--bg-primary);
  padding: 1rem;
}

.finance-card--high {
  border-color: color-mix(in oklab, #ef4444 48%, var(--border-color));
  background: linear-gradient(180deg, color-mix(in oklab, #fee2e2 48%, var(--bg-primary)), var(--bg-primary));
}

.finance-card--low {
  border-color: color-mix(in oklab, #2563eb 48%, var(--border-color));
  background: linear-gradient(180deg, color-mix(in oklab, #dbeafe 48%, var(--bg-primary)), var(--bg-primary));
}

.finance-card__header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: flex-start;
}

.finance-card h4 {
  margin: 0.28rem 0 0;
  font-size: 1rem;
  line-height: 1.35;
}

.finance-alias {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  margin-left: 0.35rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 800;
  vertical-align: middle;
}

.finance-card__image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.finance-price {
  font-family: var(--font-display);
  font-size: clamp(1.55rem, 1.2rem + 1vw, 2.2rem);
}

.finance-status {
  flex: 0 0 auto;
  padding: 0.24rem 0.58rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
}

.finance-status--high {
  background: #fee2e2;
  color: #b91c1c;
}

.finance-status--low {
  background: #dbeafe;
  color: #1d4ed8;
}

.finance-meta-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.finance-meta-row span {
  display: grid;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.finance-meta-row strong {
  color: var(--text-primary);
  font-size: 0.92rem;
}

.finance-change--up {
  color: #16a34a !important;
}

.finance-change--down {
  color: #dc2626 !important;
}

.finance-history-list {
  display: grid;
  gap: 0.55rem;
}

.finance-history {
  display: grid;
  gap: 0.45rem;
  padding: 0.75rem;
  border: 1px solid color-mix(in oklab, var(--border-color) 75%, transparent);
  border-radius: 16px;
  background: color-mix(in oklab, var(--bg-secondary) 72%, transparent);
}

.finance-history__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  list-style: none;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.finance-history__header::-webkit-details-marker {
  display: none;
}

.finance-history__header::after {
  content: '+';
  width: 1.4rem;
  height: 1.4rem;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  color: #2563eb;
  background: color-mix(in oklab, #2563eb 10%, transparent);
}

.finance-history[open] > .finance-history__header::after {
  content: '-';
}

.finance-history__header strong {
  color: var(--text-primary);
  font-size: 0.78rem;
}

.finance-history__stats {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-left: auto;
  text-align: right;
}

.finance-history-chart {
  width: 100%;
  height: 88px;
  margin-top: 0.35rem;
  overflow: visible;
}

.finance-history-area {
  fill: rgba(37, 99, 235, 0.12);
}

.finance-history-line {
  fill: none;
  stroke: #2563eb;
  stroke-width: 2.4;
  vector-effect: non-scaling-stroke;
}

.finance-history-dot {
  fill: #2563eb;
  stroke: white;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.finance-history-empty {
  min-height: 88px;
  margin-top: 0.35rem;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.finance-link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.store-card__link--youtube {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}

.tube-channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.tube-manager {
  display: grid;
  gap: 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-primary) 88%, var(--bg-secondary));
  padding: 1rem;
}

.tube-manager__form {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(260px, 1.2fr) auto auto;
  gap: 0.75rem;
  align-items: end;
}

.tube-channel-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.55rem;
  max-height: 320px;
  overflow: auto;
  padding-right: 0.15rem;
}

.tube-channel-chip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.15rem 0.5rem;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-primary);
  padding: 0.65rem 0.7rem;
}

.tube-channel-chip span,
.tube-channel-chip small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tube-channel-chip span {
  color: var(--text-primary);
  font-weight: 700;
}

.tube-channel-chip small {
  grid-column: 1;
  color: var(--text-secondary);
}

.tube-channel-chip__actions,
.tube-channel-edit-actions {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.tube-channel-chip__actions {
  grid-row: 1 / span 2;
  grid-column: 2;
}

.tube-channel-chip button {
  border-radius: 999px;
  padding: 0.28rem 0.62rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 800;
}

.tube-delete-btn {
  border: 1px solid color-mix(in oklab, var(--danger) 30%, var(--border-color));
  background: color-mix(in oklab, var(--danger) 8%, var(--bg-primary));
  color: var(--danger);
}

.tube-edit-btn,
.tube-save-btn {
  border: 1px solid color-mix(in oklab, var(--primary) 35%, var(--border-color));
  background: color-mix(in oklab, var(--primary) 8%, var(--bg-primary));
  color: var(--primary);
}

.tube-cancel-btn {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.tube-channel-edit-field {
  grid-column: 1 / -1;
  display: grid;
  gap: 0.35rem;
}

.tube-channel-edit-field span {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.tube-channel-edit-actions,
.tube-channel-edit-error {
  grid-column: 1 / -1;
}

.tube-channel-card {
  display: grid;
  gap: 0.9rem;
  border-radius: 22px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  padding: 1rem;
}

.tube-channel-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.tube-channel-card__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.6rem;
  align-items: center;
}

.tube-channel-card h4 {
  margin: 0.25rem 0 0;
  font-size: 1.15rem;
}

.tube-channel-title {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.tube-update-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in oklab, #ef4444 14%, var(--bg-secondary));
  color: #b91c1c;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
  text-decoration: none;
}

.tube-update-badge span {
  color: #7f1d1d;
}

.tube-video-list {
  display: grid;
  gap: 0.75rem;
}

.tube-video-row {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 0.8rem;
  align-items: center;
  min-height: 72px;
  padding: 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  color: var(--text-primary);
  text-decoration: none;
  transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
}

.tube-video-row:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--primary) 38%, var(--border-color));
  box-shadow: var(--shadow-soft);
}

.tube-video-row img,
.tube-video-row__placeholder {
  width: 112px;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  object-fit: cover;
  background: color-mix(in oklab, var(--surface-strong) 12%, var(--bg-secondary));
}

.tube-video-row__placeholder {
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  font-weight: 800;
}

.tube-video-row__copy {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.tube-video-row__copy strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.94rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.tube-video-row__copy span {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.tube-video-row__copy em {
  display: inline-flex;
  margin-left: 0.45rem;
  padding: 0.14rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in oklab, #f59e0b 16%, var(--bg-secondary));
  color: #92400e;
  font-style: normal;
  font-weight: 700;
}

.tool-meta > div,
.stat-tile,
.store-card,
.comparison-card {
  border-radius: 22px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  padding: 1rem;
}

.tool-meta__label,
.comparison-source__label {
  display: block;
  color: var(--text-secondary);
  font-size: 0.82rem;
  margin-bottom: 0.35rem;
}

.stat-tile span {
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.stat-tile strong,
.store-card strong,
.comparison-source strong {
  display: block;
  margin-top: 0.45rem;
  font-size: 1.35rem;
  color: var(--text-primary);
}

.store-card__name {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.store-card__link,
.comparison-source__link {
  color: var(--primary);
  text-decoration: none;
  font-size: 0.86rem;
  font-weight: 600;
}

.comparison-card__header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
  margin-bottom: 0.9rem;
}

.comparison-card__chip {
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent) 15%, var(--bg-secondary));
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.comparison-source-list {
  display: grid;
  gap: 0.7rem;
}

.comparison-source {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  padding: 0.85rem 0.95rem;
}

.comparison-source.best {
  border-color: color-mix(in oklab, #10b981 45%, var(--border-color));
  background: color-mix(in oklab, #10b981 8%, var(--bg-primary));
}

.chart-shell {
  border-radius: 24px;
  padding: 1rem 1rem 1.1rem;
  background: linear-gradient(180deg, color-mix(in oklab, var(--bg-primary) 92%, white), color-mix(in oklab, var(--bg-secondary) 94%, transparent));
  border: 1px solid var(--border-color);
}

.chart-shell__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
}

.chart-caption {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.price-chart {
  width: 100%;
  height: 260px;
  overflow: visible;
  border-radius: 18px;
  background:
    linear-gradient(to top, color-mix(in oklab, var(--border-color) 46%, transparent) 1px, transparent 1px) 0 0 / 100% 25%,
    linear-gradient(to right, color-mix(in oklab, var(--border-color) 26%, transparent) 1px, transparent 1px) 0 0 / 16.66% 100%,
    color-mix(in oklab, var(--bg-secondary) 94%, transparent);
}

.chart-area {
  fill: color-mix(in oklab, var(--primary) 18%, transparent);
}

.chart-line {
  fill: none;
  stroke: color-mix(in oklab, var(--primary) 88%, black);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-line--multi.chart-series-a { stroke: #2563eb; }
.chart-line--multi.chart-series-b { stroke: #db2777; }
.chart-line--multi.chart-series-c { stroke: #059669; }
.chart-line--multi.chart-series-d { stroke: #d97706; }
.chart-line--multi.chart-series-e { stroke: #7c3aed; }
.chart-line--multi.chart-series-f { stroke: #0f766e; }

.chart-dot {
  fill: color-mix(in oklab, var(--primary) 90%, black);
  stroke: white;
  stroke-width: 0.7;
}

.chart-empty {
  min-height: 180px;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  text-align: center;
}

.chart-empty--small {
  min-height: 86px;
}

.chart-legend,
.chart-legend--row {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.history-chip,
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.history-chip strong {
  color: var(--text-primary);
}

.history-chip__note {
  max-width: 12ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
}

.manual-block {
  display: grid;
  gap: 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-primary) 88%, var(--bg-secondary));
  padding: 1rem;
}

.manual-block__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.manual-block__header h4 {
  margin: 0.3rem 0 0;
  font-family: var(--font-display);
}

.manual-product-form {
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
}

.manual-price-form {
  grid-template-columns: minmax(120px, 0.9fr) minmax(140px, 0.9fr) minmax(0, 1.2fr) auto;
}

.manual-product-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.manual-product-chip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.15rem 0.55rem;
  align-items: center;
  min-width: min(100%, 220px);
  max-width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-primary);
  padding: 0.7rem 0.8rem;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}

.manual-product-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.manual-product-chip.active {
  border-color: color-mix(in oklab, var(--primary) 45%, var(--border-color));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary) 28%, transparent);
}

.manual-product-chip__name {
  grid-column: 1;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-product-chip small {
  grid-column: 1;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.manual-product-chip__delete {
  grid-row: 1 / span 2;
  grid-column: 2;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--danger) 30%, var(--border-color));
  background: color-mix(in oklab, var(--danger) 8%, var(--bg-primary));
  color: var(--danger);
  padding: 0.28rem 0.62rem;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.manual-price-table {
  display: grid;
  gap: 0.45rem;
}

.manual-price-table__head,
.manual-price-table__row {
  display: grid;
  grid-template-columns: minmax(100px, 0.9fr) minmax(100px, 0.9fr) minmax(0, 1.4fr) auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.7rem 0.85rem;
  border-radius: 14px;
}

.manual-price-table__head {
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
  background: color-mix(in oklab, var(--bg-secondary) 80%, transparent);
  border: 1px solid var(--border-color);
}

.manual-price-table__row {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.manual-price-table__row strong {
  color: var(--text-primary);
  font-size: 1.05rem;
}

.manual-price-table__note {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manual-price-table__row .tube-delete-btn {
  border-radius: 999px;
  padding: 0.28rem 0.62rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 800;
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-swatch.chart-series-a { background: #2563eb; }
.legend-swatch.chart-series-b { background: #db2777; }
.legend-swatch.chart-series-c { background: #059669; }
.legend-swatch.chart-series-d { background: #d97706; }
.legend-swatch.chart-series-e { background: #7c3aed; }
.legend-swatch.chart-series-f { background: #0f766e; }

@media (max-width: 960px) {
  .tool-input-grid,
  .tube-channel-list,
  .tube-manager__form,
  .manual-product-form,
  .manual-price-form,
  .manual-price-table__head,
  .manual-price-table__row {
    grid-template-columns: 1fr;
  }

  .tool-primary-btn,
  .tool-secondary-btn {
    width: 100%;
  }

  .chart-shell__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .manual-price-table__head {
    display: none;
  }

  .manual-price-table__row {
    gap: 0.35rem;
  }

  .manual-price-table__row span[role='cell']:first-child::before {
    content: '日期 · ';
    color: var(--text-secondary);
    font-weight: 600;
  }
}

@media (max-width: 640px) {
  .tools-hero,
  .tool-panel {
    border-radius: 24px;
    padding: 1rem;
  }

  .price-chart {
    height: 220px;
  }

  .comparison-source {
    flex-direction: column;
    align-items: flex-start;
  }

  .tube-channel-grid {
    grid-template-columns: 1fr;
  }

  .tool-panel__header,
  .tool-panel__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .tube-channel-card__header,
  .tube-channel-card__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .tube-channel-chip,
  .tube-channel-chip__actions {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .tube-channel-chip__actions {
    justify-content: flex-start;
  }

  .finance-meta-row {
    grid-template-columns: 1fr;
  }

  .tube-video-row {
    grid-template-columns: 88px minmax(0, 1fr);
  }

  .tube-video-row img,
  .tube-video-row__placeholder {
    width: 88px;
  }
}
</style>
