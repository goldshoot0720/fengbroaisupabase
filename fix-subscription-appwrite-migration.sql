-- Appwrite 遷移到 Supabase - 添加缺少的欄位
-- Appwrite 'continue' → Supabase 'renew'

-- 1. 添加 renew 欄位（對應 Appwrite 的 continue）
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS renew BOOLEAN DEFAULT true;

-- 2. 添加 currency 欄位
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD';

-- 3. 添加 updated_at 欄位（可選，對應 Appwrite 的 $updatedAt）
ALTER TABLE public.subscription
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 4. 更新現有資料的預設值
UPDATE public.subscription
SET 
  renew = COALESCE(renew, true),
  currency = COALESCE(currency, 'TWD'),
  updated_at = COALESCE(updated_at, created_at);

-- 5. 驗證更新後的表結構
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscription' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
