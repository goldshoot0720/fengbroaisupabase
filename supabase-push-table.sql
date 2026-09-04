-- Supabase SQL Editor:
-- 建立 Web Push 資料表與裝置註冊功能，可重複執行。
-- 瀏覽器只呼叫 register_push_subscription；推播金鑰僅供排程 service_role 讀取。

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "anon can update push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service role can select push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service role can delete push subscriptions" ON public.push_subscriptions;

CREATE POLICY "service role can select push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "service role can delete push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  TO service_role
  USING (true);

-- 資料表檢查只讀 id；沒有 anon SELECT policy，因此不會回傳其他裝置資料。
GRANT SELECT (id) ON public.push_subscriptions TO anon, authenticated;
GRANT SELECT, DELETE ON public.push_subscriptions TO service_role;

-- 避免直接 upsert 所需的 SELECT policy 暴露其他裝置的推播資訊。
CREATE OR REPLACE FUNCTION public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR length(p_endpoint) > 4096
    OR p_p256dh IS NULL OR length(p_p256dh) NOT BETWEEN 1 AND 1024
    OR p_auth IS NULL OR length(p_auth) NOT BETWEEN 1 AND 1024 THEN
    RAISE EXCEPTION 'Invalid push subscription' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_subscriptions (endpoint, p256dh, auth, updated_at)
  VALUES (p_endpoint, p_p256dh, p_auth, now())
  ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
