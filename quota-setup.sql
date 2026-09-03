-- 鋒兄額度（quota）
-- 對應 Appwrite collection「quota」的 13 個欄位；PostgreSQL 欄位為小寫。
-- 新帳號也可在「鋒兄設定」複製 UUID 版 SQL。
-- serviceType: general（一般）／ ai（AI 服務）
-- AI 服務可另記 5 小時（expiry5h: 24 小時制 HH:mm，例如 14:30）、
-- 一週（expiryweek: 西元年-月-日）、一月（expirymonth: 西元年-月-日）的比例與到期。

CREATE TABLE IF NOT EXISTS public.quota (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  servicetype VARCHAR(20) DEFAULT 'general',
  account VARCHAR(200),
  quotaremaining INTEGER DEFAULT 0,
  quotaratio INTEGER DEFAULT 0,
  quotaexpiry DATE,
  ratio5h INTEGER DEFAULT 0,
  expiry5h VARCHAR(10),
  ratioweek INTEGER DEFAULT 0,
  expiryweek VARCHAR(10),
  ratiomonth INTEGER DEFAULT 0,
  expirymonth VARCHAR(10),
  note VARCHAR(3337),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quota_name ON public.quota(name);
CREATE INDEX IF NOT EXISTS idx_quota_servicetype ON public.quota(servicetype);

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quota'
ORDER BY ordinal_position;
