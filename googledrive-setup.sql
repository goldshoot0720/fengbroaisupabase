-- Supabase SQL Editor:
-- Google 雲端硬碟連接設定（鋒兄設定 → 選單備份／還原 → Google 雲端硬碟），可重複執行。
--
-- 只存 Google 的「瀏覽器端」憑證：OAuth Client ID 與 Browser API Key。
-- 這兩個值本來就會出現在前端，真正的防護是 Google Cloud Console 上的
-- 「已授權的 JavaScript 來源」與 API 金鑰的 HTTP 參照網址限制；這張表只是讓
-- 同一組設定能跨裝置共用，不必每台機器重貼。
--
-- 存取控制沿用「通知密碼」（resendsettings.password_hash）：
--   GET  /api/settings/google-drive  回遮蔽值，不需密碼
--   POST /api/settings/google-drive  驗證通知密碼後回明文
--   PUT  /api/settings/google-drive  驗證通知密碼後儲存
-- 備份檔會上傳到使用者雲端硬碟的 OAuth／fengbroaisupabase 資料夾
-- （scope 只要 drive.file，看不到其他既有檔案）。

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.googledrivesettings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rowkey VARCHAR(50) UNIQUE NOT NULL,
  client_id VARCHAR(300),
  api_key VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.googledrivesettings (rowkey)
SELECT 'main'
WHERE NOT EXISTS (SELECT 1 FROM public.googledrivesettings WHERE rowkey = 'main');

NOTIFY pgrst, 'reload schema';
