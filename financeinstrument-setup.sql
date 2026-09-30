-- 鋒兄金融標的：public.financeinstrument（每檔一列；對應 Appwrite financeinstrument2）
-- 整段可重複執行：建表、補欄位，搬 toollistsync 的舊自訂標的，
-- 再把原本寫在程式裡的 34 檔預設標的搬進來（都只搬一次）。
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.financeinstrument (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  provider VARCHAR(10) NOT NULL DEFAULT 'cnbc',
  region VARCHAR(20) NOT NULL DEFAULT 'other',
  imageurls JSONB NOT NULL DEFAULT '[]'::jsonb,
  sortorder INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, symbol)
);

-- provider：cnbc / yahoo / multpl（Shiller PE）/ mis（櫃買指數）/ taifex（夜盤台指期）
ALTER TABLE public.financeinstrument
  ADD COLUMN IF NOT EXISTS slug VARCHAR(48),
  ADD COLUMN IF NOT EXISTS sourceurl TEXT,
  ADD COLUMN IF NOT EXISTS historysymbol VARCHAR(32),
  ADD COLUMN IF NOT EXISTS alertthreshold NUMERIC,
  ADD COLUMN IF NOT EXISTS locallabel VARCHAR(120),
  ADD COLUMN IF NOT EXISTS periodlabel VARCHAR(40),
  ADD COLUMN IF NOT EXISTS referencelevels JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS youtubeurl TEXT,
  ADD COLUMN IF NOT EXISTS youtubelabel VARCHAR(80),
  ADD COLUMN IF NOT EXISTS youtubelinks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bilibiliurl TEXT,
  ADD COLUMN IF NOT EXISTS relatedlinks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subtitle VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_financeinstrument_sortorder ON public.financeinstrument(sortorder);

-- 下面會讀 toollistsync；還沒建過的帳號先建一張空表（與鋒兄設定的定義相同）。
CREATE TABLE IF NOT EXISTS public.toollistsync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_key VARCHAR(80) UNIQUE NOT NULL,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 先搬 toollistsync 裡的舊自訂標的（finance-custom-instruments）。
-- 只在 financeinstrument 完全是空的時候搬：用過上一版頁面的帳號已經搬過了，這段會略過。
WITH legacy AS (
  SELECT CASE jsonb_typeof(payload) WHEN 'string' THEN (payload #>> '{}')::jsonb ELSE payload END AS items
  FROM public.toollistsync
  WHERE sync_key = 'finance-custom-instruments'
  LIMIT 1
)
INSERT INTO public.financeinstrument (name, symbol, provider, region, imageurls, sortorder)
SELECT
  left(COALESCE(NULLIF(btrim(item->>'name'), ''), upper(btrim(item->>'symbol'))), 80),
  upper(btrim(item->>'symbol')),
  CASE WHEN item->>'provider' = 'yahoo' THEN 'yahoo' ELSE 'cnbc' END,
  CASE
    WHEN item->>'group' IN ('korea', 'japan', 'taiwan', 'us', 'other') THEN item->>'group'
    WHEN item->>'group' IN ('tw', 'tw-stocks') THEN 'taiwan'
    WHEN item->>'group' = 'us-stocks' THEN 'us'
    WHEN item->>'group' = 'asia-stocks' THEN 'japan'
    ELSE 'other'
  END,
  CASE
    WHEN jsonb_typeof(item->'imageUrls') = 'array' THEN item->'imageUrls'
    WHEN COALESCE(item->>'imageUrl', '') <> '' THEN jsonb_build_array(item->>'imageUrl')
    ELSE '[]'::jsonb
  END,
  (t.ord - 1)::int
FROM legacy,
  jsonb_array_elements(CASE WHEN jsonb_typeof(legacy.items) = 'array' THEN legacy.items ELSE '[]'::jsonb END)
    WITH ORDINALITY AS t(item, ord)
WHERE jsonb_typeof(item) = 'object'
  AND COALESCE(btrim(item->>'symbol'), '') <> ''
  AND length(btrim(item->>'symbol')) <= 32
  AND NOT EXISTS (SELECT 1 FROM public.financeinstrument)
ON CONFLICT (provider, symbol) DO NOTHING;

-- 遷移原本的預設標的（表裡已有 slug 列＝搬過了，就整段略過）。
-- 自訂標的排序往後移，讓預設標的維持在各地區前面。
UPDATE public.financeinstrument
SET sortorder = sortorder + 100
WHERE slug IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.financeinstrument WHERE slug IS NOT NULL);

-- 尊重「預設追蹤清單」裡已刪掉的標的：toollistsync 的 finance-default-instrument-ids
-- 有存清單就只搬清單內的；沒存或是空清單就全搬。
WITH picked AS (
  SELECT CASE jsonb_typeof(payload) WHEN 'string' THEN (payload #>> '{}')::jsonb ELSE payload END AS ids
  FROM public.toollistsync
  WHERE sync_key = 'finance-default-instrument-ids'
  LIMIT 1
),
seed (slug, name, symbol, provider, region, sortorder, imageurls, sourceurl, historysymbol, alertthreshold, locallabel, periodlabel, referencelevels, youtubeurl, youtubelabel, youtubelinks, bilibiliurl, relatedlinks, featured, subtitle) AS (
  VALUES
  ('kospi'::text, 'KOSPI Index'::text, '.KS11'::text, 'cnbc'::text, 'korea'::text, 0, '["/finance/kospi-202607201244-pink.png","/finance/kospi-202607201244-hoodie.png","/finance/kospi-202607141413.png","/finance/kospi-202607141405.png","/finance/kospi-202607141219.png","/finance/kospi-202607121235.png","/finance/kospi-cats.jpg","/finance/kospi-index.png"]'::jsonb, 'https://www.cnbc.com/quotes/.KS11?qsearchterm=kospi'::text, '^KS11'::text, 12682::numeric, '코스피'::text, '2026~2027'::text, '[{"value":6472,"label":"韓國市場融資平均水平線約為6472點 · 絕對不能破"}]'::jsonb, 'https://www.youtube.com/results?search_query=SK+Hynix+stock&sp=CAMSBAgCEAE%253D'::text, NULL::text, '[]'::jsonb, 'https://search.bilibili.com/all?keyword=%E9%9F%93%E5%9C%8B%E8%82%A1%E5%B8%82&from_source=web_search&spm_id_from=333.1007&search_source=5&pubtime_begin_s=1782489600&pubtime_end_s=1783094399'::text, '[]'::jsonb, TRUE, '韓國綜合指數 코스피 · 6000點以上不再製作AI圖片與AI影片'::text),
  ('samsung-electronics'::text, '三星電子'::text, '005930.KS'::text, 'yahoo'::text, 'korea'::text, 1, '[]'::jsonb, 'https://finance.yahoo.com/quote/005930.KS'::text, NULL::text, 1110000::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('sk-hynix'::text, 'SK 海力士'::text, '000660.KS'::text, 'yahoo'::text, 'korea'::text, 2, '[]'::jsonb, 'https://finance.yahoo.com/quote/000660.KS'::text, NULL::text, 11110000::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('sk-hynix-adr'::text, 'SK hynix Inc. ADR'::text, 'SKHY'::text, 'yahoo'::text, 'korea'::text, 3, '[]'::jsonb, 'https://finance.yahoo.com/quote/SKHY'::text, NULL::text, NULL::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('kodex-sk-hynix-leverage'::text, 'SAMSUNG KODEX SK Hynix Single Stock Leverage'::text, '0193T0.KS'::text, 'yahoo'::text, 'korea'::text, 4, '[]'::jsonb, 'https://finance.yahoo.com/quote/0193T0.KS'::text, NULL::text, NULL::numeric, 'KRX: 0193T0'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('koru'::text, 'Direxion Daily MSCI South Korea Bull 3X ETF'::text, 'KORU'::text, 'cnbc'::text, 'korea'::text, 5, '[]'::jsonb, 'https://www.cnbc.com/quotes/KORU'::text, 'KORU'::text, NULL::numeric, 'NYSEARCA: KORU'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('nikkei-225'::text, 'Nikkei 225 Index'::text, '.N225'::text, 'cnbc'::text, 'japan'::text, 6, '["/finance/nikkei-225-featured.jpg"]'::jsonb, 'https://www.cnbc.com/quotes/.N225'::text, '^N225'::text, 110000::numeric, '日経平均株価'::text, NULL::text, '[]'::jsonb, 'https://www.youtube.com/results?search_query=%E5%A4%A7%E6%9A%B4%E8%90%BD'::text, '日経平均株価 大暴落'::text, '[{"label":"日経平均株価 インフレ","url":"https://www.youtube.com/results?search_query=%E6%97%A5%E7%B5%8C%E5%B9%B3%E5%9D%87%E6%A0%AA%E4%BE%A1%20%E3%82%A4%E3%83%B3%E3%83%95%E3%83%AC"},{"label":"朝倉慶 文藝春秋","url":"https://www.youtube.com/@Bungeishunju/search?query=%E6%9C%9D%E5%80%89%E6%85%B6"},{"label":"朝倉慶 ASK1","url":"https://www.youtube.com/@info_ask1/search?query=%E6%9C%9D%E5%80%89%E6%85%B6"},{"label":"朝倉慶 楽待","url":"https://www.youtube.com/@rakumachi/search?query=%E6%9C%9D%E5%80%89%E6%85%B6"},{"label":"朝倉慶 外為どっとコム","url":"https://www.youtube.com/@gaitame_com/search?query=%E6%9C%9D%E5%80%89%E6%85%B6"}]'::jsonb, NULL::text, '[]'::jsonb, TRUE, '日經平均指數 日経平均株価'::text),
  ('kioxia'::text, 'キオクシア 鎧俠'::text, '285A.T'::text, 'yahoo'::text, 'japan'::text, 7, '[]'::jsonb, 'https://finance.yahoo.com/quote/285A.T'::text, NULL::text, NULL::numeric, 'TYO: 285A'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('taiex'::text, '加權指數'::text, '^TWII'::text, 'yahoo'::text, 'taiwan'::text, 8, '["/finance/taiex-cats.png"]'::jsonb, 'https://tw.stock.yahoo.com/quote/%5ETWII'::text, NULL::text, 126820::numeric, '週一至五 09:00–13:30'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[{"label":"盤中閒聊","url":"https://www.ptt.cc/bbs/Stock/search?q=%E7%9B%A4%E4%B8%AD%E9%96%92%E8%81%8A"},{"label":"盤後閒聊","url":"https://www.ptt.cc/bbs/Stock/search?q=%E7%9B%A4%E5%BE%8C%E9%96%92%E8%81%8A"},{"label":"證交所","url":"https://www.twse.com.tw/"}]'::jsonb, FALSE, NULL::text),
  ('otc'::text, '上櫃指數'::text, 'otc_o00.tw'::text, 'mis'::text, 'taiwan'::text, 9, '[]'::jsonb, 'https://www.tpex.org.tw/'::text, NULL::text, 666::numeric, '櫃買指數 · 週一至五 09:00–13:30'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[{"label":"盤中閒聊","url":"https://www.ptt.cc/bbs/Stock/search?q=%E7%9B%A4%E4%B8%AD%E9%96%92%E8%81%8A"},{"label":"盤後閒聊","url":"https://www.ptt.cc/bbs/Stock/search?q=%E7%9B%A4%E5%BE%8C%E9%96%92%E8%81%8A"},{"label":"櫃買中心","url":"https://www.tpex.org.tw/"},{"label":"MIS 即時","url":"https://mis.twse.com.tw/stock/index?lang=zhHant"}]'::jsonb, FALSE, NULL::text),
  ('txf-night'::text, '夜盤台指期'::text, 'TXF'::text, 'taifex'::text, 'taiwan'::text, 10, '[]'::jsonb, 'https://mis.taifex.com.tw/futures/RealtimeMarket/Futures'::text, NULL::text, NULL::numeric, '台指期近月 · 夜盤 15:00–次日05:00'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[{"label":"TAIFEX 即時行情","url":"https://mis.taifex.com.tw/futures/RealtimeMarket/Futures"},{"label":"期交所","url":"https://www.taifex.com.tw/"},{"label":"夜盤閒聊","url":"https://www.ptt.cc/bbs/Stock/search?q=%E5%A4%9C%E7%9B%A4"}]'::jsonb, FALSE, NULL::text),
  ('tsmc'::text, '台積電'::text, '2330.TW'::text, 'yahoo'::text, 'taiwan'::text, 11, '["/finance/tsmc-featured.jpg"]'::jsonb, 'https://tw.stock.yahoo.com/quote/2330.TW'::text, NULL::text, 3333::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('0050'::text, '元大台灣50'::text, '0050.TW'::text, 'yahoo'::text, 'taiwan'::text, 12, '[]'::jsonb, 'https://tw.stock.yahoo.com/quote/0050.TW'::text, NULL::text, NULL::numeric, '0050 · 台灣50'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('0056'::text, '元大高股息'::text, '0056.TW'::text, 'yahoo'::text, 'taiwan'::text, 13, '[]'::jsonb, 'https://tw.stock.yahoo.com/quote/0056.TW'::text, NULL::text, NULL::numeric, '0056 · 高股息'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('00878'::text, '國泰永續高股息'::text, '00878.TW'::text, 'yahoo'::text, 'taiwan'::text, 14, '[]'::jsonb, 'https://tw.stock.yahoo.com/quote/00878.TW'::text, NULL::text, NULL::numeric, '00878 · 永續高股息'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('00631l'::text, '元大台灣50正2'::text, '00631L.TW'::text, 'yahoo'::text, 'taiwan'::text, 15, '[]'::jsonb, 'https://tw.stock.yahoo.com/quote/00631L.TW'::text, NULL::text, NULL::numeric, '00631L · 2X 台灣50'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('tsm'::text, '台積電 ADR'::text, 'TSM'::text, 'yahoo'::text, 'taiwan'::text, 16, '["/finance/tsmc-featured.jpg"]'::jsonb, 'https://www.investing.com/equities/taiwan-semicond.manufacturing-co'::text, 'TSM'::text, NULL::numeric, 'NYSE: TSM · Pre/After Market'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('tsmx'::text, 'Direxion Daily TSM Bull 2X ETF'::text, 'TSMX'::text, 'cnbc'::text, 'taiwan'::text, 17, '[]'::jsonb, 'https://www.cnbc.com/quotes/TSMX'::text, 'TSMX'::text, NULL::numeric, 'NASDAQ: TSMX · 2X TSM'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('dow'::text, 'Dow Jones Industrial Average'::text, '.DJI'::text, 'cnbc'::text, 'us'::text, 18, '[]'::jsonb, 'https://www.cnbc.com/quotes/.DJI'::text, '^DJI'::text, 66666::numeric, 'Roaring ''20s'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('sp500'::text, 'S&P 500 Index'::text, '.SPX'::text, 'cnbc'::text, 'us'::text, 19, '[]'::jsonb, 'https://www.cnbc.com/quotes/.SPX'::text, '^GSPC'::text, 11111::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('nasdaq'::text, 'NASDAQ Composite'::text, '.IXIC'::text, 'cnbc'::text, 'us'::text, 20, '[]'::jsonb, 'https://www.cnbc.com/quotes/.IXIC'::text, '^IXIC'::text, 33333::numeric, '科技泡沫'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('phlx-semiconductor'::text, '費城半導體指數'::text, '.SOX'::text, 'cnbc'::text, 'us'::text, 21, '["/finance/sox-cats.jpg"]'::jsonb, 'https://www.cnbc.com/quotes/.SOX'::text, '^SOX'::text, NULL::numeric, '半導體泡沫'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, 'https://search.bilibili.com/all?keyword=%E5%8D%8A%E5%B0%8E%E9%AB%94&from_source=web_search&spm_id_from=333.788&search_source=5&pubtime_begin_s=1782489600&pubtime_end_s=1783094399'::text, '[]'::jsonb, TRUE, 'Philadelphia Semiconductor · SOX'::text),
  ('soxl'::text, 'Direxion Daily Semiconductor Bull 3X ETF'::text, 'SOXL'::text, 'cnbc'::text, 'us'::text, 22, '[]'::jsonb, 'https://www.cnbc.com/quotes/SOXL'::text, 'SOXL'::text, NULL::numeric, 'NYSEARCA: SOXL'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('snxx'::text, 'Tradr 2X Long Sndk Daily ETF'::text, 'SNXX'::text, 'yahoo'::text, 'us'::text, 23, '[]'::jsonb, 'https://finance.yahoo.com/quote/SNXX'::text, 'SNXX'::text, NULL::numeric, 'Cboe: SNXX · 2X SNDK'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('nvidia'::text, 'NVIDIA Corp'::text, 'NVDA'::text, 'cnbc'::text, 'us'::text, 24, '[]'::jsonb, 'https://www.cnbc.com/quotes/NVDA'::text, 'NVDA'::text, NULL::numeric, '重零開始'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('micron'::text, '美光科技'::text, 'MU'::text, 'cnbc'::text, 'us'::text, 25, '[]'::jsonb, 'https://www.cnbc.com/quotes/MU'::text, NULL::text, NULL::numeric, 'AI泡沫'::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('shiller-pe'::text, 'Shiller PE Ratio'::text, 'CAPE'::text, 'multpl'::text, 'other'::text, 26, '[]'::jsonb, 'https://www.multpl.com/shiller-pe'::text, NULL::text, 45::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('usd-twd'::text, '美元對台幣匯率'::text, 'USDTWD=X'::text, 'yahoo'::text, 'other'::text, 27, '[]'::jsonb, 'https://finance.yahoo.com/quote/USDTWD=X'::text, NULL::text, 37::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('usd-jpy'::text, '美元對日元匯率'::text, 'USDJPY=X'::text, 'yahoo'::text, 'other'::text, 28, '[]'::jsonb, 'https://finance.yahoo.com/quote/USDJPY=X'::text, NULL::text, 222::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, 'https://search.bilibili.com/all?keyword=%E6%97%A5%E5%85%83%E8%B4%AC%E5%80%BC&from_source=websuggest_search&spm_id_from=333.1007&search_source=5&pubtime_begin_s=1782489600&pubtime_end_s=1783094399'::text, '[]'::jsonb, FALSE, NULL::text),
  ('brent'::text, 'ICE Brent Crude'::text, '@LCO.1'::text, 'cnbc'::text, 'other'::text, 29, '[]'::jsonb, 'https://www.cnbc.com/quotes/@LCO.1'::text, 'BZ=F'::text, 222::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('gold'::text, 'Gold COMEX'::text, '@GC.1'::text, 'cnbc'::text, 'other'::text, 30, '["/finance/gold-featured.jpg"]'::jsonb, 'https://www.cnbc.com/quotes/@GC.1'::text, 'GC=F'::text, 6666::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('us30y'::text, 'U.S. 30 Year Treasury'::text, 'US.30'::text, 'cnbc'::text, 'other'::text, 31, '[]'::jsonb, 'https://www.cnbc.com/quotes/US.30'::text, '^TYX'::text, 6.66::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('bitcoin'::text, 'Bitcoin/USD Coin Metrics'::text, 'BTC.CM='::text, 'cnbc'::text, 'other'::text, 32, '["/finance/bitcoin-cats.jpg"]'::jsonb, 'https://www.cnbc.com/quotes/BTC.CM='::text, 'BTC-USD'::text, 111111::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text),
  ('ether'::text, 'Ether/USD Coin Metrics'::text, 'ETH.CM='::text, 'cnbc'::text, 'other'::text, 33, '[]'::jsonb, 'https://www.cnbc.com/quotes/ETH.CM='::text, 'ETH-USD'::text, 2222::numeric, NULL::text, NULL::text, '[]'::jsonb, NULL::text, NULL::text, '[]'::jsonb, NULL::text, '[]'::jsonb, FALSE, NULL::text)
)
INSERT INTO public.financeinstrument (slug, name, symbol, provider, region, sortorder, imageurls, sourceurl, historysymbol, alertthreshold, locallabel, periodlabel, referencelevels, youtubeurl, youtubelabel, youtubelinks, bilibiliurl, relatedlinks, featured, subtitle)
SELECT slug, name, symbol, provider, region, sortorder, imageurls, sourceurl, historysymbol, alertthreshold, locallabel, periodlabel, referencelevels, youtubeurl, youtubelabel, youtubelinks, bilibiliurl, relatedlinks, featured, subtitle
FROM seed
WHERE NOT EXISTS (SELECT 1 FROM public.financeinstrument WHERE slug IS NOT NULL)
  AND (
    NOT EXISTS (SELECT 1 FROM picked WHERE jsonb_typeof(ids) = 'array' AND jsonb_array_length(ids) > 0)
    OR EXISTS (SELECT 1 FROM picked WHERE jsonb_typeof(ids) = 'array' AND ids ? seed.slug)
  )
ON CONFLICT (provider, symbol) DO UPDATE SET
  slug = EXCLUDED.slug,
  sortorder = EXCLUDED.sortorder,
  imageurls = CASE
    WHEN jsonb_array_length(public.financeinstrument.imageurls) = 0 THEN EXCLUDED.imageurls
    ELSE public.financeinstrument.imageurls
  END,
  sourceurl = EXCLUDED.sourceurl,
  historysymbol = EXCLUDED.historysymbol,
  alertthreshold = EXCLUDED.alertthreshold,
  locallabel = EXCLUDED.locallabel,
  periodlabel = EXCLUDED.periodlabel,
  referencelevels = EXCLUDED.referencelevels,
  youtubeurl = EXCLUDED.youtubeurl,
  youtubelabel = EXCLUDED.youtubelabel,
  youtubelinks = EXCLUDED.youtubelinks,
  bilibiliurl = EXCLUDED.bilibiliurl,
  relatedlinks = EXCLUDED.relatedlinks,
  featured = EXCLUDED.featured,
  subtitle = EXCLUDED.subtitle,
  updated_at = NOW();
