-- =====================================================
-- 鋒兄系統 - 資料表結構檢查與修復腳本
-- 用途：檢查現有表結構並修復不一致的欄位
-- =====================================================

-- =====================================================
-- 檢查目前所有表的欄位結構
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

-- =====================================================
-- SUBSCRIPTION 表修復
-- =====================================================

-- 檢查是否有舊的欄位名稱（renew 或 "continue"）
DO $$
BEGIN
    -- 如果有 "continue" 欄位（舊的保留字欄位），遷移到 iscontinue
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription' AND column_name = 'continue'
    ) THEN
        -- 新增 iscontinue 欄位（如果不存在）
        ALTER TABLE public.subscription 
        ADD COLUMN IF NOT EXISTS iscontinue BOOLEAN DEFAULT true;
        
        -- 複製資料
        UPDATE public.subscription 
        SET iscontinue = "continue" 
        WHERE iscontinue IS NULL;
        
        -- 刪除舊欄位
        ALTER TABLE public.subscription DROP COLUMN IF EXISTS "continue";
        
        RAISE NOTICE '已遷移 "continue" 欄位至 iscontinue';
    END IF;
END $$;

-- 如果有 renew 欄位，遷移到 iscontinue
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription' AND column_name = 'renew'
    ) THEN
        -- 新增 iscontinue 欄位（如果不存在）
        ALTER TABLE public.subscription 
        ADD COLUMN IF NOT EXISTS iscontinue BOOLEAN DEFAULT true;
        
        -- 複製資料
        UPDATE public.subscription 
        SET iscontinue = renew 
        WHERE iscontinue IS NULL;
        
        -- 刪除舊欄位
        ALTER TABLE public.subscription DROP COLUMN IF EXISTS renew;
        
        RAISE NOTICE '已遷移 renew 欄位至 iscontinue';
    END IF;
END $$;

-- 確保 iscontinue 欄位存在
ALTER TABLE public.subscription 
ADD COLUMN IF NOT EXISTS iscontinue BOOLEAN DEFAULT true;

-- 確保 currency 欄位存在
ALTER TABLE public.subscription 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

-- 確保 updated_at 欄位存在
ALTER TABLE public.subscription 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 更新現有資料的預設值
UPDATE public.subscription 
SET 
    iscontinue = COALESCE(iscontinue, true),
    currency = COALESCE(currency, 'TWD'),
    updated_at = COALESCE(updated_at, created_at)
WHERE iscontinue IS NULL OR currency IS NULL OR updated_at IS NULL;

-- 建立索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_subscription_name ON public.subscription(name);
CREATE INDEX IF NOT EXISTS idx_subscription_nextdate ON public.subscription(nextdate);
CREATE INDEX IF NOT EXISTS idx_subscription_created_at ON public.subscription(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_iscontinue ON public.subscription(iscontinue);

-- =====================================================
-- 其他表確保 updated_at 欄位存在
-- =====================================================

-- IMAGE 表
ALTER TABLE public.image 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- MUSIC 表
ALTER TABLE public.music 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PODCAST 表
ALTER TABLE public.podcast 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- FOOD 表
ALTER TABLE public.food 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- VIDEO 表（created_at 在最前面，如果沒有 updated_at 就加上）
ALTER TABLE public.video 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 最終驗證
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('subscription')
ORDER BY ordinal_position;
