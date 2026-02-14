-- 簡化版 subscription 表格設定
-- 適用於現有表格結構（無 user_id，RLS 關閉）

-- 確認表格結構
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscription' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_subscription_name ON public.subscription(name);
CREATE INDEX IF NOT EXISTS idx_subscription_nextdate ON public.subscription(nextdate);
CREATE INDEX IF NOT EXISTS idx_subscription_created_at ON public.subscription(created_at);

-- 插入一些測試資料（可選）
INSERT INTO public.subscription (name, site, account, price, nextdate, note) VALUES
('Netflix', 'https://netflix.com', 'user@example.com', 390, '2025-01-15', '標準方案'),
('Spotify', 'https://spotify.com', 'user@example.com', 149, '2025-01-20', '個人方案'),
('Adobe Creative Cloud', 'https://adobe.com', 'user@example.com', 1680, '2025-02-01', '完整版')
ON CONFLICT DO NOTHING;

-- 查看資料
SELECT * FROM public.subscription ORDER BY created_at DESC;