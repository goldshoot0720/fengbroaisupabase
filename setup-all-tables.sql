-- =====================================================
-- 鋒兄系統 - 完整資料表初始化腳本
-- 用途：新 Supabase 帳號建立所有產品資料表
-- 執行方式：在 Supabase SQL Editor 中貼上並執行
--
-- 欄位以 鋒兄設定 tables[] 為準。此腳本用 BIGSERIAL 以相容舊庫；
-- 設定頁複製的 SQL 用 UUID（gen_random_uuid）。IF NOT EXISTS 不會改已存在的表。
-- Web Push 表見 supabase-push-table.sql（含 RLS）。
-- =====================================================

-- =====================================================
-- 1. IMAGE 表（圖庫）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.image (
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
);

CREATE INDEX IF NOT EXISTS idx_image_name ON public.image(name);
CREATE INDEX IF NOT EXISTS idx_image_category ON public.image(category);
CREATE INDEX IF NOT EXISTS idx_image_created_at ON public.image(created_at);
CREATE INDEX IF NOT EXISTS idx_image_hash ON public.image(hash);

-- image 表 RLS：個人站允許 anon 讀寫
ALTER TABLE public.image ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on image" ON public.image;
CREATE POLICY "Allow all operations on image" ON public.image
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. VIDEO 表（影片庫）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.video (
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
);

CREATE INDEX IF NOT EXISTS idx_video_name ON public.video(name);
CREATE INDEX IF NOT EXISTS idx_video_category ON public.video(category);
CREATE INDEX IF NOT EXISTS idx_video_created_at ON public.video(created_at);
CREATE INDEX IF NOT EXISTS idx_video_hash ON public.video(hash);

-- =====================================================
-- 3. MUSIC 表（音樂庫）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.music (
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
);

CREATE INDEX IF NOT EXISTS idx_music_name ON public.music(name);
CREATE INDEX IF NOT EXISTS idx_music_category ON public.music(category);
CREATE INDEX IF NOT EXISTS idx_music_created_at ON public.music(created_at);
CREATE INDEX IF NOT EXISTS idx_music_hash ON public.music(hash);

-- =====================================================
-- 4. PODCAST 表（播客庫）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.podcast (
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
);

CREATE INDEX IF NOT EXISTS idx_podcast_name ON public.podcast(name);
CREATE INDEX IF NOT EXISTS idx_podcast_category ON public.podcast(category);
CREATE INDEX IF NOT EXISTS idx_podcast_created_at ON public.podcast(created_at);
CREATE INDEX IF NOT EXISTS idx_podcast_hash ON public.podcast(hash);

-- =====================================================
-- 5. SUBSCRIPTION 表（訂閱管理）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  site TEXT,
  account TEXT,
  price INTEGER,
  nextdate DATE,
  note TEXT,
  iscontinue BOOLEAN DEFAULT true,  -- 續訂狀態（避開 SQL 保留字）
  currency TEXT DEFAULT 'TWD',       -- 幣種（預設台幣）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_name ON public.subscription(name);
CREATE INDEX IF NOT EXISTS idx_subscription_nextdate ON public.subscription(nextdate);
CREATE INDEX IF NOT EXISTS idx_subscription_created_at ON public.subscription(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_iscontinue ON public.subscription(iscontinue);

-- =====================================================
-- 6. FOOD 表（食品管理）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.food (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  amount INTEGER,
  price INTEGER,
  shop VARCHAR(100),
  todate DATE,
  photo TEXT,
  photohash VARCHAR(256),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_name ON public.food(name);
CREATE INDEX IF NOT EXISTS idx_food_todate ON public.food(todate);
CREATE INDEX IF NOT EXISTS idx_food_created_at ON public.food(created_at);
CREATE INDEX IF NOT EXISTS idx_food_shop ON public.food(shop);

ALTER TABLE public.food
ADD COLUMN IF NOT EXISTS photohash VARCHAR(256);

-- =====================================================
-- 7. ARTICLE 表（筆記）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.article (
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
);

CREATE INDEX IF NOT EXISTS idx_article_title ON public.article(title);
CREATE INDEX IF NOT EXISTS idx_article_category ON public.article(category);
CREATE INDEX IF NOT EXISTS idx_article_newdate ON public.article(newdate);

-- =====================================================
-- 8. BANK 表（銀行 / 電子票證）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bank (
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
);

CREATE INDEX IF NOT EXISTS idx_bank_name ON public.bank(name);

-- =====================================================
-- 9. COMMONACCOUNT 表（常用帳號）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commonaccount (
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
);

CREATE INDEX IF NOT EXISTS idx_commonaccount_name ON public.commonaccount(name);

-- =====================================================
-- 10. COMMONDOCUMENT 表（文件）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commondocument (
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
);

CREATE INDEX IF NOT EXISTS idx_commondocument_name ON public.commondocument(name);
CREATE INDEX IF NOT EXISTS idx_commondocument_category ON public.commondocument(category);
CREATE INDEX IF NOT EXISTS idx_commondocument_hash ON public.commondocument(hash);

-- =====================================================
-- 11. ROUTINE 表（例行）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.routine (
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
);

CREATE INDEX IF NOT EXISTS idx_routine_name ON public.routine(name);

-- =====================================================
-- 12. TRIALPURCHASE 表（試用／首購）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.trialpurchase (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  eventdate DATE,
  firstpurchaseprice INTEGER DEFAULT 0,
  regularprice INTEGER DEFAULT 0,
  account VARCHAR(200),
  note VARCHAR(3337),
  trialstatus VARCHAR(20) DEFAULT 'untried',
  purchasestatus VARCHAR(30) DEFAULT 'not_purchased',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trialpurchase_name ON public.trialpurchase(name);
CREATE INDEX IF NOT EXISTS idx_trialpurchase_eventdate ON public.trialpurchase(eventdate);

-- =====================================================
-- 13. QUOTA 表（鋒兄額度）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quota (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  servicetype VARCHAR(20) DEFAULT 'general',
  account VARCHAR(200),
  quotaremaining INTEGER DEFAULT 0,
  quotaratio INTEGER DEFAULT 0,
  quotaexpiry DATE,
  ratio5h INTEGER DEFAULT 0,
  expiry5h VARCHAR(10),
  ratioweek INTEGER DEFAULT 0,
  expiryweek VARCHAR(10),
  ratiomonth INTEGER DEFAULT 0,
  expirymonth VARCHAR(10),
  note VARCHAR(3337),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quota_name ON public.quota(name);
CREATE INDEX IF NOT EXISTS idx_quota_servicetype ON public.quota(servicetype);

-- =====================================================
-- 14. REINSTALL 表（重灌軟體）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reinstall (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  system VARCHAR(10) DEFAULT 'win',
  softwaretype VARCHAR(20) DEFAULT 'free',
  licensetype VARCHAR(20) DEFAULT 'none',
  serial VARCHAR(500),
  viewpassword VARCHAR(100),
  subscriptionsoftware BOOLEAN DEFAULT false,
  subscriptionperiod VARCHAR(20),
  subscriptionprice INTEGER DEFAULT 0,
  subscriptioncurrency VARCHAR(10) DEFAULT 'TWD',
  site TEXT,
  note VARCHAR(3337),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reinstall_name ON public.reinstall(name);
CREATE INDEX IF NOT EXISTS idx_reinstall_system ON public.reinstall(system);

-- =====================================================
-- 15. PUSH_SUBSCRIPTIONS（Web Push；RLS 見 supabase-push-table.sql）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 16. SITEVISIT 表（進站人次／連續進站天數）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sitevisit (
  id BIGSERIAL PRIMARY KEY,
  rowkey VARCHAR(50) UNIQUE NOT NULL,
  count INTEGER DEFAULT 0,
  lastvisitat TIMESTAMPTZ,
  currentstreak INTEGER DEFAULT 0,
  lastvisitdate VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.sitevisit (rowkey, count)
SELECT 'site-visit', 0
WHERE NOT EXISTS (SELECT 1 FROM public.sitevisit WHERE rowkey = 'site-visit');

-- =====================================================
-- 17. MENUUSAGE 表（選單使用統計）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.menuusage (
  id BIGSERIAL PRIMARY KEY,
  moduleid VARCHAR(50) UNIQUE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menuusage_count ON public.menuusage(count DESC);

-- =====================================================
-- 18. SHOPPINGLIST 表（鋒兄購物清單）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shoppinglist (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  planneddate DATE,
  price INTEGER DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'TWD',
  quantity INTEGER DEFAULT 1,
  shop VARCHAR(100),
  pickupmethod VARCHAR(100),
  account VARCHAR(200),
  note VARCHAR(3337),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shoppinglist_name ON public.shoppinglist(name);
CREATE INDEX IF NOT EXISTS idx_shoppinglist_planneddate ON public.shoppinglist(planneddate);

-- =====================================================
-- 19. TOOLLISTSYNC 表（鋒兄工具個人清單雲端同步）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.toollistsync (
  id BIGSERIAL PRIMARY KEY,
  sync_key VARCHAR(80) UNIQUE NOT NULL,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_toollistsync_sync_key ON public.toollistsync(sync_key);

-- =====================================================
-- 20. RESENDSETTINGS 表（Resend 通知設定，密碼鎖保護）
-- =====================================================
CREATE TABLE IF NOT EXISTS public.resendsettings (
  id BIGSERIAL PRIMARY KEY,
  rowkey VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(300),
  from_email VARCHAR(300),
  slots_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.resendsettings (rowkey)
SELECT 'main'
WHERE NOT EXISTS (SELECT 1 FROM public.resendsettings WHERE rowkey = 'main');

-- =====================================================
-- 驗證：查看所有建立的表結構
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'article', 'bank', 'commonaccount', 'commondocument', 'food',
    'image', 'menuusage', 'music', 'podcast', 'push_subscriptions', 'quota', 'reinstall', 'resendsettings', 'routine',
    'shoppinglist', 'sitevisit', 'subscription', 'toollistsync', 'trialpurchase', 'video'
  )
ORDER BY table_name, ordinal_position;
