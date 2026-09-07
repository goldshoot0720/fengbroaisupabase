-- Supabase SQL Editor:
-- 建立 Resend 到期信「已寄送」紀錄表，可重複執行。
-- 瀏覽器開啟網站時，以及 netlify/functions/resend-expiry-cron-*.js 排程（Asia/Taipei
-- 05:27 / 11:27 / 17:27）都共用同一張表：同一筆訂閱／食品同一個到期日只會寄一次。
-- marker 格式見 utils/notificationHelpers.js 的 expiryMarkerFor()，例如
-- "subscription:123:2026-09-10" 或 "food:45:2026-09-18"。

CREATE TABLE IF NOT EXISTS public.resend_notify_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marker text UNIQUE NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resend_notify_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read resend notify log" ON public.resend_notify_log;
DROP POLICY IF EXISTS "anon can insert resend notify log" ON public.resend_notify_log;
DROP POLICY IF EXISTS "service role can manage resend notify log" ON public.resend_notify_log;

-- marker 只是「類型:項目 id:到期日」，不含任何機密內容，anon 讀寫皆可。
CREATE POLICY "anon can read resend notify log"
  ON public.resend_notify_log
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon can insert resend notify log"
  ON public.resend_notify_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "service role can manage resend notify log"
  ON public.resend_notify_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.resend_notify_log TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resend_notify_log TO service_role;

NOTIFY pgrst, 'reload schema';
