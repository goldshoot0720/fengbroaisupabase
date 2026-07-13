-- Supabase SQL Editor:
-- Create the Web Push subscription table used by the PWA notification flow.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id bigserial PRIMARY KEY,
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

CREATE POLICY "anon can insert push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

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
