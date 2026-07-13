-- 修復 subscription 表缺少 renew 欄位的問題

-- 1. 添加 renew 欄位（如果還不存在）
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS renew BOOLEAN DEFAULT true;

-- 2. 更新現有資料的預設值
UPDATE public.subscription
SET renew = true
WHERE renew IS NULL;

-- 3. 驗證欄位已添加
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscription' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 查看更新後的資料
SELECT * FROM public.subscription ORDER BY created_at DESC;
