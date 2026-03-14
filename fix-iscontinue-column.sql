-- 添加 iscontinue 欄位（避開 SQL 保留字 continue）

-- 1. 添加 iscontinue 欄位
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS iscontinue BOOLEAN DEFAULT true;

-- 2. 添加 currency 欄位
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

-- 3. 更新現有資料
UPDATE public.subscription
SET 
  iscontinue = COALESCE(iscontinue, true),
  currency = COALESCE(currency, 'TWD')
WHERE iscontinue IS NULL OR currency IS NULL;

-- 4. 驗證結構
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'subscription' 
ORDER BY ordinal_position;
