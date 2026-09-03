-- 鋒兄試用／首購（trialpurchase）
-- 對應 Appwrite collection 的 8 個欄位；PostgreSQL 欄位為小寫。
-- 新帳號也可在「鋒兄設定」複製 UUID 版 SQL。

CREATE TABLE IF NOT EXISTS public.trialpurchase (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  eventdate DATE,
  firstpurchaseprice INTEGER DEFAULT 0,
  regularprice INTEGER DEFAULT 0,
  account VARCHAR(200),
  note VARCHAR(3337),
  trialstatus VARCHAR(20) DEFAULT 'untried',
  purchasestatus VARCHAR(30) DEFAULT 'not_purchased',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trialpurchase_name ON public.trialpurchase(name);
CREATE INDEX IF NOT EXISTS idx_trialpurchase_eventdate ON public.trialpurchase(eventdate);

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'trialpurchase'
ORDER BY ordinal_position;
