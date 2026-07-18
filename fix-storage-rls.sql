-- =====================================================
-- 修復：批次上傳失敗 new row violates row-level security policy
-- 原因：Storage bucket 已建立，但 storage.objects 沒有允許 anon 上傳的政策
-- 用法：
--   1. 把下方 YOUR_BUCKET 改成實際 bucket 名（通常等於帳號名，如 goldshoot0720）
--   2. 在 Supabase Dashboard → SQL Editor 整段執行
-- =====================================================

-- ★ 改成你的 bucket 名稱
-- 預設與 Netlify 環境變數 SUPABASE_BUCKET（或 NUXT_PUBLIC_SUPABASE_BUCKET）相同
DO $$
DECLARE
  bkt text := 'YOUR_BUCKET'; -- ← 改成 Netlify SUPABASE_BUCKET 的值
BEGIN
  IF bkt = 'YOUR_BUCKET' OR bkt IS NULL OR bkt = '' THEN
    RAISE EXCEPTION '請先把 bkt 改成實際的 bucket 名稱（Netlify SUPABASE_BUCKET）';
  END IF;

  -- 1. 確保 bucket 存在且為 public
  INSERT INTO storage.buckets (id, name, public)
  VALUES (bkt, bkt, true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  -- 2. 移除同名舊政策（避免政策名稱衝突或綁錯 bucket）
  EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Allow public upload on ' || bkt);
  EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Allow public read on ' || bkt);
  EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Allow public update on ' || bkt);
  EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Allow public delete on ' || bkt);

  -- 相容舊版通用名稱（若只對單一 bucket 生效）
  DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;

  -- 3. 建立允許 anon / authenticated 完整存取此 bucket 的政策
  EXECUTE format(
    'CREATE POLICY %I ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = %L)',
    'Allow public upload on ' || bkt, bkt
  );
  EXECUTE format(
    'CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L)',
    'Allow public read on ' || bkt, bkt
  );
  EXECUTE format(
    'CREATE POLICY %I ON storage.objects FOR UPDATE TO public USING (bucket_id = %L) WITH CHECK (bucket_id = %L)',
    'Allow public update on ' || bkt, bkt, bkt
  );
  EXECUTE format(
    'CREATE POLICY %I ON storage.objects FOR DELETE TO public USING (bucket_id = %L)',
    'Allow public delete on ' || bkt, bkt
  );
END $$;

-- 4.（可選）image 資料表若 RLS 已開但無政策，INSERT 也會失敗
-- 個人站建議：允許公開讀寫（與本專案現有 setup 一致）
ALTER TABLE IF EXISTS public.image ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on image" ON public.image;
CREATE POLICY "Allow all operations on image" ON public.image
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- 驗證：應看到 4 筆 storage 政策 + image 政策
SELECT policyname, cmd, roles
FROM pg_policies
WHERE (schemaname = 'storage' AND tablename = 'objects')
   OR (schemaname = 'public' AND tablename = 'image')
ORDER BY schemaname, tablename, policyname;
