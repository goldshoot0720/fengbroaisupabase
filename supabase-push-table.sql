-- 在 Supabase SQL Editor 執行此腳本
-- 建立 Web Push 訂閱儲存表

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          bigserial PRIMARY KEY,
  endpoint    text UNIQUE NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 開放匿名寫入（讓前端可以儲存訂閱）
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert" ON push_subscriptions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can upsert own endpoint" ON push_subscriptions
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 只有 service_role 可以讀取（Netlify cron function 使用）
CREATE POLICY "service role can select" ON push_subscriptions
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service role can delete" ON push_subscriptions
  FOR DELETE TO service_role USING (true);
