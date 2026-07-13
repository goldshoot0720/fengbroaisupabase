-- 修復 subscription 表結構 - 添加缺少的欄位

-- 1. 添加 renew 欄位（續訂狀態）
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS renew BOOLEAN DEFAULT true;

-- 2. 添加 currency 欄位（幣種）
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

-- 3. 更新現有資料的預設值
UPDATE public.subscription
SET 
  renew = true,
  currency = 'TWD'
WHERE renew IS NULL OR currency IS NULL;

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

-- 5. 查看更新後的資料
SELECT * FROM public.subscription ORDER BY created_at DESC;
