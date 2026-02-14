-- 食品管理表格設定
-- 對應資料庫結構

-- 確認表格結構
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'food' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_food_name ON public.food(name);
CREATE INDEX IF NOT EXISTS idx_food_todate ON public.food(todate);
CREATE INDEX IF NOT EXISTS idx_food_created_at ON public.food(created_at);
CREATE INDEX IF NOT EXISTS idx_food_shop ON public.food(shop);

-- 插入一些測試資料（可選）
INSERT INTO public.food (name, amount, price, shop, todate, photo) VALUES
('牛奶', 2, 85, '全聯', '2025-01-20', null),
('麵包', 1, 45, '7-11', '2025-01-18', null),
('雞蛋', 12, 120, '家樂福', '2025-02-01', null),
('蘋果', 5, 150, '水果攤', '2025-01-25', null)
ON CONFLICT DO NOTHING;

-- 查看資料
SELECT * FROM public.food ORDER BY created_at DESC;