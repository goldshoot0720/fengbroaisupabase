-- 鋒兄工具／手機比價歷史快照（landtop_history）
-- 持久化「地標網通＋傑昇通信」比價查詢的每週快照，取代原本僅存在瀏覽器
-- localStorage 的做法：換裝置、換瀏覽器或清快取都不會遺失歷史走勢。
-- 對應 Appwrite 版 landtophistory（9 欄位）的角色，欄位依本專案的
-- 「單一關鍵字→多來源、多容量比價」資料結構調整。
-- 新帳號也可在「鋒兄設定」複製 UUID 版 SQL。

CREATE TABLE IF NOT EXISTS public.landtop_history (
  id BIGSERIAL PRIMARY KEY,
  keyword_key VARCHAR(200) NOT NULL,
  keyword VARCHAR(200) NOT NULL,
  brand_label VARCHAR(50),
  product_name VARCHAR(200),
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  series JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landtop_history_keyword_key ON public.landtop_history(keyword_key);
CREATE INDEX IF NOT EXISTS idx_landtop_history_snapshot_date ON public.landtop_history(snapshot_date);

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'landtop_history'
ORDER BY ordinal_position;
