-- 修復 subscription 表所有缺少的欄位

-- 1. 添加 iscontinue 欄位
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS iscontinue BOOLEAN DEFAULT true;

-- 2. 添加 currency 欄位
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

-- 3. 更新現有資料的預設值
UPDATE public.subscription
SET 
  iscontinue = COALESCE(iscontinue, true),
  currency = COALESCE(currency, 'TWD')
WHERE iscontinue IS NULL OR currency IS NULL;

-- 4. 驗證更新後的表結構
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscription' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
