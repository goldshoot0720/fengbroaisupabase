<template>
  <PageContainer>
    <div class="settings-page">
      <div class="settings-content">
        <!-- 已儲存帳號列表 -->
        <section v-if="accounts.length > 0" class="settings-section accounts-section">
          <div class="section-header">
            <h2 class="section-title">🔒 已儲存帳號</h2>
          </div>
          <div class="section-body">
            <div class="accounts-list">
              <div 
                v-for="acc in accounts" 
                :key="acc.id" 
                class="account-card"
                :class="{ active: acc.id === activeAccountId }"
              >
                <div class="account-card-main">
                  <span class="account-badge" v-if="acc.id === activeAccountId">當前</span>
                  <span class="account-title">supabase-{{ acc.friendlyName || 'unnamed' }}</span>
                  <span class="account-url">{{ acc.supabaseUrl ? acc.supabaseUrl.replace('https://', '').replace('.supabase.co', '') : '未設定' }}</span>
                  <span v-if="acc.bucket" class="account-bucket">📦 {{ acc.bucket }}</span>
                </div>
                <div class="account-card-actions">
                  <button 
                    v-if="acc.id !== activeAccountId"
                    class="btn-sm btn-switch" 
                    @click="handleSwitchAccount(acc.id)"
                  >切換</button>
                  <button class="btn-sm btn-edit" @click="loadAccountToForm(acc)">編輯</button>
                  <button class="btn-sm btn-delete" @click="handleDeleteAccount(acc.id)">刪除</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 新增/編輯帳號表單 -->
        <section class="settings-section">
          <div class="section-header">
            <h2 class="section-title">{{ editingAccountId ? '✨ 編輯帳號' : '✨ 新增帳號' }}</h2>
          </div>
          <div class="section-body">
            <div class="form-row">
              <label for="friendlyName">友善使用者名稱</label>
              <div class="form-field">
                <input
                  id="friendlyName"
                  v-model="friendlyName"
                  type="text"
                  class="form-input"
                  placeholder="請輸入您的名稱"
                >
                <span class="form-hint">此名稱將顯示於系統介面中</span>
              </div>
            </div>
            <div class="form-row">
              <label for="supabaseUrl">SUPABASE_URL</label>
              <div class="form-field">
                <input
                  id="supabaseUrl"
                  v-model="supabaseUrl"
                  type="text"
                  class="form-input"
                  placeholder="https://xxxxx.supabase.co"
                >
                <span class="form-hint">Supabase 專案的 API URL</span>
              </div>
            </div>
            <div class="form-row">
              <label for="supabaseAnonKey">SUPABASE_ANON_KEY</label>
              <div class="form-field">
                <textarea
                  id="supabaseAnonKey"
                  v-model="supabaseAnonKey"
                  class="form-textarea"
                  rows="3"
                  placeholder="請輸入 Supabase Anon Key"
                ></textarea>
                <span class="form-hint">Supabase 專案的匿名公開金鑰</span>
              </div>
            </div>
            <div class="form-row">
              <label for="bucketName">SUPABASE_BUCKET</label>
              <div class="form-field">
                <input
                  id="bucketName"
                  v-model="bucketName"
                  type="text"
                  class="form-input"
                  placeholder="uploads"
                >
                <span class="form-hint">Storage Bucket 名稱（預設 uploads）</span>
              </div>
            </div>
          </div>
        </section>

        <div class="form-actions">
          <button class="btn-primary" @click="handleSave">
            <span class="icon">💾</span> {{ editingAccountId ? '更新並切換' : '儲存並切換' }}
          </button>
          <button v-if="editingAccountId" class="btn-secondary" @click="cancelEdit">
            取消編輯
          </button>
          <button class="btn-secondary" @click="handleClear">
            <span class="icon">🗑️</span> 清除所有
          </button>
        </div>

        <!-- 資料表狀態 -->
        <section class="settings-section table-status-section">
          <div class="section-header">
            <h2 class="section-title">🗄️ 資料表狀態</h2>
          </div>
          <div class="section-body">
            <div class="table-status-list">
              <div v-for="t in tables" :key="t.name" class="table-status-item">
                <div class="table-info">
                  <span class="table-icon">{{ t.icon }}</span>
                  <span class="table-name">{{ t.label }}</span>
                  <span class="table-db-name">({{ t.name }})</span>
                </div>
                <div class="table-state">
                  <span v-if="t.checking" class="status-badge checking">檢查中...</span>
                  <span v-else-if="t.exists" class="status-badge exists">✅ 已建立</span>
                  <template v-else>
                    <span class="status-badge missing">❌ 未建立</span>
                    <button class="btn-create-table" @click="showCreateSql(t)">
                      手動建立
                    </button>
                  </template>
                </div>
              </div>
            </div>
            <!-- Storage Bucket 狀態 -->
            <div class="table-status-item" style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
              <div class="table-info">
                <span class="table-icon">📦</span>
                <span class="table-name">Storage Bucket</span>
                <span class="table-db-name">({{ currentBucketName }})</span>
              </div>
              <div class="table-state">
                <span v-if="bucketChecking" class="status-badge checking">檢查中...</span>
                <span v-else-if="bucketExists" class="status-badge exists">✅ 已建立</span>
                <template v-else>
                  <span class="status-badge missing">❌ 未建立</span>
                  <button class="btn-create-table" @click="showBucketHelp = true">建立說明</button>
                </template>
              </div>
            </div>

            <button class="btn-check" @click="checkAllTables" :disabled="isChecking">
              <span class="icon">🔄</span> {{ isChecking ? '檢查中...' : '重新檢查' }}
            </button>
            <p v-if="connectionStatus" class="connection-status">{{ connectionStatus }}</p>
          </div>
        </section>

        <!-- SQL Modal -->
        <div v-if="showSqlModal" class="modal-overlay" @click.self="showSqlModal = false">
          <div class="modal-content">
            <div class="modal-header">
              <h3>建立「{{ currentTable?.label }}」資料表</h3>
              <button class="btn-close" @click="showSqlModal = false">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-hint">請到 Supabase Dashboard → SQL Editor 執行以下 SQL：</p>
              <pre class="sql-code">{{ currentTable?.sql }}</pre>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showSqlModal = false">關閉</button>
              <button class="btn-primary" @click="copySql">
                <span class="icon">📋</span> 複製 SQL
              </button>
            </div>
          </div>
        </div>

        <!-- Bucket Help Modal -->
        <div v-if="showBucketHelp" class="modal-overlay" @click.self="showBucketHelp = false">
          <div class="modal-content">
            <div class="modal-header">
              <h3>建立 Storage Bucket「{{ currentBucketName }}」</h3>
              <button class="btn-close" @click="showBucketHelp = false">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-hint">請到 Supabase Dashboard 建立 Storage Bucket：</p>
              <ol style="padding-left: 1.5rem; line-height: 2; color: var(--text-primary);">
                <li>進入 Supabase Dashboard → <strong>Storage</strong></li>
                <li>點擊 <strong>New bucket</strong></li>
                <li>Name 輸入：<code style="background: var(--bg-tertiary); padding: 0.1rem 0.4rem; border-radius: 3px;">{{ currentBucketName }}</code></li>
                <li>勾選 <strong>Public bucket</strong>（公開存取）</li>
                <li>點擊 <strong>Create bucket</strong></li>
              </ol>
              <p class="modal-hint" style="margin-top: 1rem;">在 SQL Editor 執行以下指令（建立 Bucket + RLS 政策）：</p>
              <pre class="sql-code">-- 1. 建立 Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('{{ currentBucketName }}', '{{ currentBucketName }}', true);

-- 2. 設定存取政策（允許上傳、讀取、更新、刪除）
CREATE POLICY "Allow public upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = '{{ currentBucketName }}');
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = '{{ currentBucketName }}');
CREATE POLICY "Allow public update" ON storage.objects
  FOR UPDATE USING (bucket_id = '{{ currentBucketName }}');
CREATE POLICY "Allow public delete" ON storage.objects
  FOR DELETE USING (bucket_id = '{{ currentBucketName }}');</pre>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showBucketHelp = false">關閉</button>
              <button class="btn-primary" @click="copyBucketSql">
                <span class="icon">📋</span> 複製 SQL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import { useSettings } from '../../composables/useSettings'

const {
  accounts,
  activeAccountId,
  friendlyName,
  supabaseUrl,
  supabaseAnonKey,
  bucket: bucketName,
  loadSettings,
  saveSettings,
  clearSettings,
  addAccount,
  updateAccount,
  deleteAccount,
  switchAccount
} = useSettings()

// 編輯狀態
const editingAccountId = ref(null)

// 載入帳號到表單進行編輯
const loadAccountToForm = (acc) => {
  editingAccountId.value = acc.id
  friendlyName.value = acc.friendlyName
  supabaseUrl.value = acc.supabaseUrl
  supabaseAnonKey.value = acc.supabaseAnonKey
  bucketName.value = acc.bucket || ''
}

// 取消編輯
const cancelEdit = () => {
  editingAccountId.value = null
  friendlyName.value = ''
  supabaseUrl.value = ''
  supabaseAnonKey.value = ''
  bucketName.value = ''
}

// 切換帳號
const handleSwitchAccount = (id) => {
  switchAccount(id)
  alert('已切換帳號，即將重新載入...')
  window.location.reload()
}

// 刪除帳號
const handleDeleteAccount = (id) => {
  const acc = accounts.value.find(a => a.id === id)
  if (confirm(`確定要刪除帳號 "${acc?.friendlyName || 'unnamed'}" 嗎？`)) {
    deleteAccount(id)
    if (id === editingAccountId.value) {
      cancelEdit()
    }
  }
}

// 資料表狀態
const showSqlModal = ref(false)
const currentTable = ref(null)
const isChecking = ref(false)
const connectionStatus = ref('') // 連線狀態訊息

// Bucket 狀態
const bucketExists = ref(false)
const bucketChecking = ref(false)
const showBucketHelp = ref(false)
const currentBucketName = computed(() => bucketName.value || useRuntimeConfig().public.supabaseBucket || 'uploads')

const tables = reactive([
  {
    name: 'article',
    label: '文章管理',
    icon: '📰',
    checking: false,
    exists: false,
    sql: `CREATE TABLE article (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  content TEXT,
  category VARCHAR(100),
  ref VARCHAR(100),
  newdate TIMESTAMPTZ,
  url1 TEXT,
  url2 TEXT,
  url3 TEXT,
  file1 VARCHAR(150),
  file1name VARCHAR(100),
  file1type VARCHAR(20),
  file2 VARCHAR(150),
  file2name VARCHAR(100),
  file2type VARCHAR(20),
  file3 VARCHAR(150),
  file3name VARCHAR(100),
  file3type VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'bank',
    label: '銀行帳戶',
    icon: '🏦',
    checking: false,
    exists: false,
    sql: `CREATE TABLE bank (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  deposit INTEGER DEFAULT 0,
  site TEXT,
  address VARCHAR(100),
  withdrawals INTEGER DEFAULT 0,
  transfer INTEGER DEFAULT 0,
  activity TEXT,
  card VARCHAR(100),
  account VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'commonaccount',
    label: '常用帳號',
    icon: '🔑',
    checking: false,
    exists: false,
    sql: `CREATE TABLE commonaccount (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  site01 VARCHAR(100), site02 VARCHAR(100), site03 VARCHAR(100), site04 VARCHAR(100), site05 VARCHAR(100),
  site06 VARCHAR(100), site07 VARCHAR(100), site08 VARCHAR(100), site09 VARCHAR(100), site10 VARCHAR(100),
  site11 VARCHAR(100), site12 VARCHAR(100), site13 VARCHAR(100), site14 VARCHAR(100), site15 VARCHAR(100),
  site16 VARCHAR(100), site17 VARCHAR(100), site18 VARCHAR(100), site19 VARCHAR(100), site20 VARCHAR(100),
  site21 VARCHAR(100), site22 VARCHAR(100), site23 VARCHAR(100), site24 VARCHAR(100), site25 VARCHAR(100),
  site26 VARCHAR(100), site27 VARCHAR(100), site28 VARCHAR(100), site29 VARCHAR(100), site30 VARCHAR(100),
  site31 VARCHAR(100), site32 VARCHAR(100), site33 VARCHAR(100), site34 VARCHAR(100), site35 VARCHAR(100),
  site36 VARCHAR(100), site37 VARCHAR(100),
  note01 VARCHAR(100), note02 VARCHAR(100), note03 VARCHAR(100), note04 VARCHAR(100), note05 VARCHAR(100),
  note06 VARCHAR(100), note07 VARCHAR(100), note08 VARCHAR(100), note09 VARCHAR(100), note10 VARCHAR(100),
  note11 VARCHAR(100), note12 VARCHAR(100), note13 VARCHAR(100), note14 VARCHAR(100), note15 VARCHAR(100),
  note16 VARCHAR(100), note17 VARCHAR(100), note18 VARCHAR(100), note19 VARCHAR(100), note20 VARCHAR(100),
  note21 VARCHAR(100), note22 VARCHAR(100), note23 VARCHAR(100), note24 VARCHAR(100), note25 VARCHAR(100),
  note26 VARCHAR(100), note27 VARCHAR(100), note28 VARCHAR(100), note29 VARCHAR(100), note30 VARCHAR(100),
  note31 VARCHAR(100), note32 VARCHAR(100), note33 VARCHAR(100), note34 VARCHAR(100), note35 VARCHAR(100),
  note36 VARCHAR(100), note37 VARCHAR(100),
  photohash VARCHAR(256),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'commondocument',
    label: '通用文件',
    icon: '📄',
    checking: false,
    exists: false,
    sql: `CREATE TABLE commondocument (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  file VARCHAR(150),
  note VARCHAR(100),
  ref VARCHAR(100),
  category VARCHAR(100),
  hash VARCHAR(300),
  cover VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'food',
    label: '食物庫存',
    icon: '🍔',
    checking: false,
    exists: false,
    sql: `CREATE TABLE food (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  amount INTEGER DEFAULT 0,
  price INTEGER DEFAULT 0,
  shop VARCHAR(100),
  todate DATE,
  photo TEXT,
  photohash VARCHAR(256),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'image',
    label: '圖片管理',
    icon: '🖼️',
    checking: false,
    exists: false,
    sql: `CREATE TABLE image (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  file VARCHAR(150),
  filetype VARCHAR(20),
  note VARCHAR(100),
  ref VARCHAR(100),
  category VARCHAR(100),
  hash VARCHAR(300),
  cover VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'music',
    label: '音樂管理',
    icon: '🎵',
    checking: false,
    exists: false,
    sql: `CREATE TABLE music (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  file VARCHAR(150),
  filetype VARCHAR(20),
  lyrics TEXT,
  note VARCHAR(100),
  ref VARCHAR(100),
  category VARCHAR(100),
  hash VARCHAR(300),
  language VARCHAR(100),
  cover VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'podcast',
    label: '播客管理',
    icon: '🎧',
    checking: false,
    exists: false,
    sql: `CREATE TABLE podcast (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  file VARCHAR(150),
  filetype VARCHAR(20),
  note VARCHAR(20),
  ref VARCHAR(100),
  category VARCHAR(100),
  hash VARCHAR(300),
  cover VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'routine',
    label: '例行事項',
    icon: '🔁',
    checking: false,
    exists: false,
    sql: `CREATE TABLE routine (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  note VARCHAR(100),
  lastdate1 TIMESTAMPTZ,
  lastdate2 TIMESTAMPTZ,
  lastdate3 TIMESTAMPTZ,
  link TEXT,
  photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'subscription',
    label: '訂閱管理',
    icon: '💳',
    checking: false,
    exists: false,
    sql: `CREATE TABLE subscription (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  site TEXT,
  account TEXT,
  price INTEGER,
  nextdate DATE,
  note TEXT,
  iscontinue BOOLEAN DEFAULT true,
  currency TEXT DEFAULT 'TWD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'video',
    label: '影片管理',
    icon: '🎬',
    checking: false,
    exists: false,
    sql: `CREATE TABLE video (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT UNIQUE,
  file TEXT,
  filetype VARCHAR(20),
  note TEXT,
  ref TEXT,
  category TEXT,
  hash TEXT,
  cover TEXT
);`
  }
])

const checkTable = async (table, url, key) => {
  table.checking = true
  try {
    // 直接使用 fetch 調用 REST API 以獲取真實的 HTTP 狀態碼
    const response = await fetch(
      `${url}/rest/v1/${table.name}?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log(`Table ${table.name}: HTTP ${response.status}`)
    
    // HTTP 200 = 表格存在, 404 或其他 = 不存在
    if (response.status === 200) {
      table.exists = true
    } else {
      // 檢查錯誤訊息
      const errorData = await response.json().catch(() => ({}))
      console.log(`Table ${table.name} error:`, response.status, errorData)
      table.exists = false
    }
  } catch (e) {
    console.error(`Table ${table.name} exception:`, e)
    table.exists = false
  } finally {
    table.checking = false
  }
}

const checkAllTables = async () => {
  isChecking.value = true
  connectionStatus.value = ''
  
  // 優先使用 localStorage 設定，否則使用 .env 環境變數
  const config = useRuntimeConfig()
  const url = supabaseUrl.value || config.public.supabaseUrl
  const key = supabaseAnonKey.value || config.public.supabaseAnonKey
  
  if (!url || !key) {
    connectionStatus.value = '⚠️ 請設定 Supabase URL 和 Anon Key（或檢查 .env 檔案）'
    tables.forEach(t => t.exists = false)
    isChecking.value = false
    return
  }
  
  try {
    connectionStatus.value = '🔄 檢查中...'
    
    // 逐一檢查表格
    for (const table of tables) {
      await checkTable(table, url, key)
    }
    
    // 檢查 Storage Bucket（透過列出檔案來偵測，避免 anon key 無權讀取 buckets 表）
    bucketChecking.value = true
    const bkt = bucketName.value || useRuntimeConfig().public.supabaseBucket || 'uploads'
    try {
      const bucketRes = await fetch(
        `${url}/storage/v1/object/list/${bkt}`,
        {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prefix: '', limit: 1 })
        }
      )
      // 200 = bucket 存在且有權限，400 = bucket 不存在
      bucketExists.value = bucketRes.status === 200
    } catch {
      bucketExists.value = false
    }
    bucketChecking.value = false

    const existCount = tables.filter(t => t.exists).length
    connectionStatus.value = `✅ 已連線 - ${existCount}/${tables.length} 表格已建立${bucketExists.value ? '，Storage ✅' : '，Storage ❌'}`
  } catch (e) {
    console.error('Connection error:', e)
    connectionStatus.value = `❌ 連線失敗: ${e.message}`
    tables.forEach(t => t.exists = false)
  }
  
  isChecking.value = false
}

// 程式化建立資料表
const createTable = async (table) => {
  table.checking = true
  try {
    // 使用 rpc 執行 SQL（需要在 Supabase 建立 exec_sql 函數）
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql_query: table.sql
    })
    
    if (rpcError) {
      // 如果 rpc 不存在，顯示手動建立的 SQL
      console.warn('RPC exec_sql not available:', rpcError.message)
      showCreateSql(table)
      return
    }
    
    // 重新檢查表格是否建立成功
    await checkTable(table)
    if (table.exists) {
      alert(`✅ 資料表「${table.label}」建立成功！`)
    } else {
      showCreateSql(table)
    }
  } catch (e) {
    console.error('Create table error:', e)
    showCreateSql(table)
  } finally {
    table.checking = false
  }
}

const showCreateSql = (table) => {
  currentTable.value = table
  showSqlModal.value = true
}

const copySql = async () => {
  if (!currentTable.value?.sql) return
  try {
    await navigator.clipboard.writeText(currentTable.value.sql)
    alert('SQL 已複製到剪貼簿！')
  } catch {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = currentTable.value.sql
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('SQL 已複製到剪貼簿！')
  }
}

const copyBucketSql = async () => {
  const bkt = currentBucketName.value
  const sql = `-- 1. 建立 Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('${bkt}', '${bkt}', true);

-- 2. 設定存取政策
CREATE POLICY "Allow public upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = '${bkt}');
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = '${bkt}');
CREATE POLICY "Allow public update" ON storage.objects
  FOR UPDATE USING (bucket_id = '${bkt}');
CREATE POLICY "Allow public delete" ON storage.objects
  FOR DELETE USING (bucket_id = '${bkt}');`
  try {
    await navigator.clipboard.writeText(sql)
    alert('SQL 已複製到剪貼簿！')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = sql
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('SQL 已複製到剪貼簿！')
  }
}

onMounted(() => {
  loadSettings()
  checkAllTables()
})

const handleSave = () => {
  if (editingAccountId.value) {
    // 更新現有帳號
    updateAccount(editingAccountId.value, {
      friendlyName: friendlyName.value,
      supabaseUrl: supabaseUrl.value,
      supabaseAnonKey: supabaseAnonKey.value,
      bucket: bucketName.value || 'uploads'
    })
    // 切換到該帳號
    switchAccount(editingAccountId.value)
    alert('帳號已更新並切換，即將重新載入...')
    window.location.reload()
  } else {
    // 新增帳號
    const result = saveSettings()
    if (result.success) {
      alert('帳號已儲存並切換，即將重新載入...')
      window.location.reload()
    } else {
      alert('儲存失敗: ' + result.error)
    }
  }
}

const handleClear = () => {
  if (confirm('確定要清除所有設定嗎？')) {
    clearSettings()
    alert('設定已清除！')
  }
}

useHead({
  title: '鋒兄設定 - 鋒兄AI Appwrite'
})
</script>

<style scoped>
.settings-page {
  animation: fadeIn 0.3s ease-in;
}

/* ===== 內容區 ===== */
.settings-content {
  max-width: 900px;
  margin: 0 auto;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow);
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.section-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.section-title {
  font-size: var(--font-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-badge {
  font-size: var(--font-xs);
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full, 999px);
}

.section-desc {
  font-size: var(--font-sm);
  color: var(--text-muted);
}

.section-body {
  padding: 2rem;
}

/* ===== 帳號列表 ===== */
.accounts-section {
  margin-bottom: 1.5rem;
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.account-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.account-card.active {
  border-color: var(--primary);
  background: rgba(102, 126, 234, 0.05);
}

.account-card-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.account-badge {
  font-size: 0.7rem;
  font-weight: 600;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.account-title {
  font-weight: 600;
  color: var(--text-primary);
}

.account-url {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}

.account-bucket {
  font-size: 0.75rem;
  color: var(--primary);
  background: var(--primary-light, rgba(102, 126, 234, 0.1));
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.account-card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn-switch {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-switch:hover {
  opacity: 0.9;
}

.btn-edit {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-edit:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 表單：電腦版 label 與 input 左右排列 */
.form-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1.5rem;
  align-items: start;
  margin-bottom: 1.8rem;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-row label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--font-md);
  padding-top: 0.85rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--font-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-textarea {
  resize: vertical;
  font-family: 'Courier New', monospace;
  line-height: 1.5;
}

.form-hint {
  font-size: var(--font-xs);
  color: var(--text-muted);
}

/* 按鈕 */
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.85rem 2rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--font-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all var(--transition-bounce);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--primary);
  border: 1px solid var(--primary);
  padding: 0.85rem 2rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--font-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all var(--transition-bounce);
}

.btn-secondary:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
}

/* ===== 資料表狀態 ===== */
.table-status-section {
  margin-top: 1.5rem;
}

.table-status-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.table-status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.table-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.table-icon {
  font-size: 1.25rem;
}

.table-name {
  font-weight: 600;
  color: var(--text-primary);
}

.table-db-name {
  font-size: var(--font-xs);
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}

.table-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  font-size: var(--font-sm);
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full, 999px);
}

.status-badge.checking {
  color: #b8860b;
  background: rgba(184, 134, 11, 0.1);
}

.status-badge.exists {
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.1);
}

.status-badge.missing {
  color: #c62828;
  background: rgba(198, 40, 40, 0.1);
}

.btn-create-table {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-bounce);
}

.btn-create-table:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.btn-show-sql {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-show-sql:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary);
}

.btn-check {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.6rem 1.5rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all var(--transition-fast);
}

.btn-check:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--primary);
}

.btn-check:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  color: var(--text-primary);
}

/* ===== SQL Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.btn-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-hint {
  font-size: var(--font-sm);
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.sql-code {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 1rem;
  font-family: 'Courier New', monospace;
  font-size: var(--font-sm);
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
  margin: 0;
}

.auto-create-hint {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px dashed var(--border-color);
}

.auto-create-hint h4 {
  font-size: var(--font-md);
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.auto-create-hint p {
  font-size: var(--font-sm);
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.auto-create-hint .sql-code {
  font-size: var(--font-xs);
  padding: 0.75rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 手機版 ===== */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .form-row label {
    padding-top: 0;
    font-size: var(--font-sm);
  }

  .section-header {
    padding: 1.2rem 1.5rem;
  }

  .section-body {
    padding: 1.5rem;
  }

  .form-actions {
    justify-content: stretch;
  }

  .btn-primary, .btn-secondary {
    flex: 1;
    justify-content: center;
    padding: 0.8rem 1rem;
  }

  .table-status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .modal-content {
    max-height: 90vh;
  }
}

@media (max-width: 480px) {
  .section-header {
    padding: 1rem 1.2rem;
  }

  .section-title {
    font-size: var(--font-lg);
  }

  .section-body {
    padding: 1.2rem;
  }

  .form-input, .form-textarea {
    padding: 0.7rem 0.75rem;
    font-size: var(--font-sm);
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-primary, .btn-secondary {
    width: 100%;
  }
}
</style>
