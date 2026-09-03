-- 鋒兄重灌（reinstall）
-- 對應 Appwrite collection 的 12 個欄位；序號與查看密碼為畫面遮罩，不是加密保管庫。
-- 新帳號也可在「鋒兄設定」複製 UUID 版 SQL。既有表可重跑本檔補齊訂閱欄位。

CREATE TABLE IF NOT EXISTS public.reinstall (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  system VARCHAR(10) DEFAULT 'win',
  softwaretype VARCHAR(20) DEFAULT 'free',
  licensetype VARCHAR(20) DEFAULT 'none',
  serial VARCHAR(500),
  viewpassword VARCHAR(100),
  subscriptionsoftware BOOLEAN DEFAULT false,
  subscriptionperiod VARCHAR(20),
  subscriptionprice INTEGER DEFAULT 0,
  subscriptioncurrency VARCHAR(10) DEFAULT 'TWD',
  site TEXT,
  note VARCHAR(3337),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reinstall
  ADD COLUMN IF NOT EXISTS subscriptionsoftware BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscriptionperiod VARCHAR(20),
  ADD COLUMN IF NOT EXISTS subscriptionprice INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscriptioncurrency VARCHAR(10) DEFAULT 'TWD';

CREATE INDEX IF NOT EXISTS idx_reinstall_name ON public.reinstall(name);
CREATE INDEX IF NOT EXISTS idx_reinstall_system ON public.reinstall(system);

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reinstall'
ORDER BY ordinal_position;
