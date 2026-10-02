-- 鋒兄 Udemy（udemy）
-- 對應 Appwrite collection `udemy` 的 10 個欄位；PostgreSQL 欄位為小寫。
-- 一筆代表一門課程與觀看進度；程式語言／框架／技術名稱可填多個值（以「,」或「、」分隔）。
-- 新帳號也可在「鋒兄設定」複製同一份 SQL。重跑本檔不會刪除既有資料。

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.udemy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  instructor VARCHAR(200),
  language VARCHAR(200),
  framework VARCHAR(200),
  technology VARCHAR(200),
  watchedlectures INTEGER DEFAULT 0,
  totallectures INTEGER DEFAULT 0,
  courseupdatedat DATE,
  totalhours NUMERIC(8, 2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_udemy_name ON public.udemy(name);
CREATE INDEX IF NOT EXISTS idx_udemy_instructor ON public.udemy(instructor);

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'udemy'
ORDER BY ordinal_position;
