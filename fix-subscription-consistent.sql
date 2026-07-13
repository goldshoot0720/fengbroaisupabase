-- 方案 A：欄位名稱完全與 Appwrite 保持一致
-- 注意：continue 是 SQL 保留字，需用雙引號

-- 1. 添加 "continue" 欄位（使用雙引號）
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS "continue" BOOLEAN DEFAULT true;

-- 2. 添加 currency 欄位
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

-- 3. 更新現有資料
UPDATE public.subscription
SET 
  "continue" = COALESCE("continue", true),
  currency = COALESCE(currency, 'TWD')
WHERE "continue" IS NULL OR currency IS NULL;

-- 4. 驗證結構
SELECT * FROM information_schema.columns 
WHERE table_name = 'subscription' 
ORDER BY ordinal_position;
