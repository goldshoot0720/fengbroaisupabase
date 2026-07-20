/**
 * Default 鋒兄金融 instrument summaries for client watchlist UI.
 * Full quote definitions live in server/api/feng-tools/finance.get.ts
 * (synced from fengbroaiappwrite).
 */

import type { FinanceCustomGroup } from "./fengbroFinanceCustom";

export type DefaultFinanceInstrumentSummary = {
  id: string;
  name: string;
  symbol: string;
  provider: "cnbc" | "yahoo" | "multpl" | "mis" | "taifex";
  group: FinanceCustomGroup;
};

/** Region-ordered default watchlist (KR → JP → TW → US → Other). */
export const FENG_FINANCE_DEFAULT_INSTRUMENTS: DefaultFinanceInstrumentSummary[] = [
  // Korea
  { id: "kospi", name: "KOSPI Index", symbol: ".KS11", provider: "cnbc", group: "korea" },
  { id: "samsung-electronics", name: "三星電子", symbol: "005930.KS", provider: "yahoo", group: "korea" },
  { id: "sk-hynix", name: "SK 海力士", symbol: "000660.KS", provider: "yahoo", group: "korea" },
  { id: "sk-hynix-adr", name: "SK hynix Inc. ADR", symbol: "SKHY", provider: "yahoo", group: "korea" },
  {
    id: "kodex-sk-hynix-leverage",
    name: "SAMSUNG KODEX SK Hynix Single Stock Leverage",
    symbol: "0193T0.KS",
    provider: "yahoo",
    group: "korea",
  },
  {
    id: "koru",
    name: "Direxion Daily MSCI South Korea Bull 3X ETF",
    symbol: "KORU",
    provider: "cnbc",
    group: "korea",
  },
  // Japan
  { id: "nikkei-225", name: "Nikkei 225 Index", symbol: ".N225", provider: "cnbc", group: "japan" },
  { id: "kioxia", name: "キオクシア 鎧俠", symbol: "285A.T", provider: "yahoo", group: "japan" },
  // Taiwan
  { id: "taiex", name: "加權指數", symbol: "^TWII", provider: "yahoo", group: "taiwan" },
  { id: "otc", name: "上櫃指數", symbol: "otc_o00.tw", provider: "mis", group: "taiwan" },
  { id: "txf-night", name: "夜盤台指期", symbol: "TXF", provider: "taifex", group: "taiwan" },
  { id: "tsmc", name: "台積電", symbol: "2330.TW", provider: "yahoo", group: "taiwan" },
  { id: "0050", name: "元大台灣50", symbol: "0050.TW", provider: "yahoo", group: "taiwan" },
  { id: "0056", name: "元大高股息", symbol: "0056.TW", provider: "yahoo", group: "taiwan" },
  { id: "00878", name: "國泰永續高股息", symbol: "00878.TW", provider: "yahoo", group: "taiwan" },
  { id: "00631l", name: "元大台灣50正2", symbol: "00631L.TW", provider: "yahoo", group: "taiwan" },
  { id: "tsm", name: "台積電 ADR", symbol: "TSM", provider: "yahoo", group: "taiwan" },
  {
    id: "tsmx",
    name: "Direxion Daily TSM Bull 2X ETF",
    symbol: "TSMX",
    provider: "cnbc",
    group: "taiwan",
  },
  // US
  { id: "dow", name: "Dow Jones Industrial Average", symbol: ".DJI", provider: "cnbc", group: "us" },
  { id: "sp500", name: "S&P 500 Index", symbol: ".SPX", provider: "cnbc", group: "us" },
  { id: "nasdaq", name: "NASDAQ Composite", symbol: ".IXIC", provider: "cnbc", group: "us" },
  { id: "phlx-semiconductor", name: "費城半導體指數", symbol: ".SOX", provider: "cnbc", group: "us" },
  {
    id: "soxl",
    name: "Direxion Daily Semiconductor Bull 3X ETF",
    symbol: "SOXL",
    provider: "cnbc",
    group: "us",
  },
  { id: "snxx", name: "Tradr 2X Long Sndk Daily ETF", symbol: "SNXX", provider: "yahoo", group: "us" },
  { id: "nvidia", name: "NVIDIA Corp", symbol: "NVDA", provider: "cnbc", group: "us" },
  { id: "micron", name: "美光科技", symbol: "MU", provider: "cnbc", group: "us" },
  // Other
  { id: "shiller-pe", name: "Shiller PE Ratio", symbol: "CAPE", provider: "multpl", group: "other" },
  { id: "usd-twd", name: "美元對台幣匯率", symbol: "USDTWD=X", provider: "yahoo", group: "other" },
  { id: "usd-jpy", name: "美元對日元匯率", symbol: "USDJPY=X", provider: "yahoo", group: "other" },
  { id: "brent", name: "ICE Brent Crude", symbol: "@LCO.1", provider: "cnbc", group: "other" },
  { id: "gold", name: "Gold COMEX", symbol: "@GC.1", provider: "cnbc", group: "other" },
  { id: "us30y", name: "U.S. 30 Year Treasury", symbol: "US.30", provider: "cnbc", group: "other" },
  { id: "bitcoin", name: "Bitcoin/USD Coin Metrics", symbol: "BTC.CM=", provider: "cnbc", group: "other" },
  { id: "ether", name: "Ether/USD Coin Metrics", symbol: "ETH.CM=", provider: "cnbc", group: "other" },
];

/** @deprecated Prefer FENG_FINANCE_DEFAULT_INSTRUMENTS — kept for any legacy imports. */
export const FENG_FINANCE_INSTRUMENTS = FENG_FINANCE_DEFAULT_INSTRUMENTS;
