-- =====================================================
-- 鋒兄系統 - 完整資料表初始化腳本
-- 用途：新 Supabase 帳號建立所有必要資料表
-- 執行方式：在 Supabase SQL Editor 中貼上並執行
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_name ON public.food(name);
CREATE INDEX IF NOT EXISTS idx_food_todate ON public.food(todate);
CREATE INDEX IF NOT EXISTS idx_food_created_at ON public.food(created_at);
CREATE INDEX IF NOT EXISTS idx_food_shop ON public.food(shop);

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
  AND table_name IN ('image', 'video', 'music', 'podcast', 'subscription', 'food')
ORDER BY table_name, ordinal_position;
