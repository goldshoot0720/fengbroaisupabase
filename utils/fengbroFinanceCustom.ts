/**
 * Helpers for 鋒兄金融 instruments (all stored in public.financeinstrument):
 * parse Yahoo / CNBC quote URLs (or bare tickers), guess a display group, and
 * normalize the instrument shape shared by the page, CSV backup and the quote API.
 *
 * Groups are region-based: 韓國 / 日本 / 台灣 / 美國 / 其他.
 */

/** Providers a user can add from a URL / ticker. */
export type FinanceCustomProvider = "cnbc" | "yahoo";
/** Every quote provider the finance API understands (multpl / mis / taifex come from migrated rows). */
export type FinanceProvider = FinanceCustomProvider | "multpl" | "mis" | "taifex";

export const FINANCE_PROVIDERS: FinanceProvider[] = ["cnbc", "yahoo", "multpl", "mis", "taifex"];

export type FinanceLink = { label: string; url: string };
export type FinanceReferenceLevel = { value: number; label: string };

/** Region groups for 鋒兄金融 display & custom instruments. */
export type FinanceCustomGroup = "korea" | "japan" | "taiwan" | "us" | "other";

export type CustomFinanceInstrument = {
  name: string;
  symbol: string;
  provider: FinanceProvider;
  group: FinanceCustomGroup;
  /** Primary card image (first of imageUrls). Absolute Supabase public URL or site path. */
  imageUrl?: string;
  /** Up to MAX_CUSTOM_IMAGE_URLS card images (carousel). */
  imageUrls?: string[];
  /** Stable quote id kept from the former built-in list (e.g. "kospi"). */
  slug?: string;
  /** Quote page link; derived from provider + symbol when empty. */
  sourceUrl?: string;
  /** Yahoo chart symbol for 1y/3y history when it differs from `symbol` (e.g. .KS11 → ^KS11). */
  historySymbol?: string;
  alertThreshold?: number;
  localLabel?: string;
  periodLabel?: string;
  referenceLevels?: FinanceReferenceLevel[];
  youtubeUrl?: string;
  youtubeLabel?: string;
  youtubeLinks?: FinanceLink[];
  bilibiliUrl?: string;
  relatedLinks?: FinanceLink[];
  /** Shown in the 精選焦點 row. */
  featured?: boolean;
  /** Small caption on the 精選焦點 card. */
  subtitle?: string;
};

export type CustomFinanceDraft = {
  /** 代稱（顯示名稱）；空白時用代號 */
  name: string;
  /** 報價網址或代號 */
  urlOrSymbol: string;
  provider: FinanceProvider;
  group: FinanceCustomGroup;
  /** One image URL per line (optional). Supabase Storage public URL or `/path`. */
  imageUrlsText: string;
  featured: boolean;
};

/** Max images per custom instrument (carousel). */
export const MAX_CUSTOM_IMAGE_URLS = 9;

export const FINANCE_CUSTOM_GROUPS: FinanceCustomGroup[] = [
  "korea",
  "japan",
  "taiwan",
  "us",
  "other",
];

export const FINANCE_GROUP_LABELS: Record<FinanceCustomGroup, string> = {
  korea: "韓國",
  japan: "日本",
  taiwan: "台灣",
  us: "美國",
  other: "其他",
};

/** Legacy asset-type groups → region groups (localStorage / old API payloads). */
const LEGACY_FINANCE_GROUP_MAP: Record<string, FinanceCustomGroup> = {
  asia: "other",
  "asia-stocks": "japan",
  korea: "korea",
  tw: "taiwan",
  "tw-stocks": "taiwan",
  us: "us",
  "us-stocks": "us",
  fx: "other",
  rates: "other",
  commodities: "other",
  crypto: "other",
  valuation: "other",
  japan: "japan",
  taiwan: "taiwan",
  other: "other",
};

export function migrateFinanceGroup(group: unknown): FinanceCustomGroup {
  if (typeof group !== "string" || !group.trim()) return "other";
  const key = group.trim();
  if ((FINANCE_CUSTOM_GROUPS as string[]).includes(key)) {
    return key as FinanceCustomGroup;
  }
  return LEGACY_FINANCE_GROUP_MAP[key] ?? "other";
}

export type ParsedFinanceQuoteInput = {
  symbol: string;
  provider: FinanceCustomProvider;
  /** True when the original input looked like a URL (provider taken from host). */
  fromUrl: boolean;
  sourceUrl?: string;
  /**
   * Host-based market hint when the URL itself implies a market
   * (e.g. tw.stock.yahoo.com → Taiwan Yahoo 奇摩股市).
   */
  marketHint?: "tw";
};

const BARE_SYMBOL_RE = /^[A-Z0-9.^@=_\-+%]{1,32}$/i;

/** Yahoo 奇摩股市 (Taiwan Yahoo Finance) host. */
const TAIWAN_YAHOO_STOCK_HOST = "tw.stock.yahoo.com";

function ensureHttps(input: string) {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

function hostnameFromInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/")) {
      return new URL(ensureHttps(trimmed)).hostname.replace(/^www\./i, "").toLowerCase();
    }
  } catch {
    // fall through
  }
  return trimmed.replace(/^www\./i, "").toLowerCase();
}

/**
 * True when the URL/host is Taiwan Yahoo 奇摩股市 (tw.stock.yahoo.com).
 * Used for 台股來源自動辨識.
 */
export function isTaiwanYahooStockSource(input?: string | null): boolean {
  if (!input) return false;
  const host = hostnameFromInput(input);
  if (host === TAIWAN_YAHOO_STOCK_HOST) return true;
  // Bare hostname fragments / partial paste
  return /(^|\.)tw\.stock\.yahoo\.com$/i.test(host) || /tw\.stock\.yahoo\.com/i.test(input);
}

/** True if the string looks like a finance quote page URL (not a bare ticker). */
export function isFinanceQuoteUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return /^(www\.)?(cnbc\.com|finance\.yahoo\.com|tw\.stock\.yahoo\.com)\b/i.test(trimmed);
}

function extractYahooSymbol(pathname: string) {
  const match = pathname.match(/\/quote\/([^/?#]+)/i);
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]).trim().toUpperCase();
  } catch {
    return match[1].trim().toUpperCase();
  }
}

function extractCnbcSymbol(pathname: string, searchParams: URLSearchParams) {
  const pathMatch = pathname.match(/\/quotes?\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    try {
      return decodeURIComponent(pathMatch[1]).trim().toUpperCase();
    } catch {
      return pathMatch[1].trim().toUpperCase();
    }
  }
  const fromQuery =
    searchParams.get("symbol") ||
    searchParams.get("q") ||
    searchParams.get("qsearchterm") ||
    "";
  return fromQuery.trim().toUpperCase();
}

/**
 * Parse a Yahoo / CNBC quote URL or a bare ticker into symbol + provider.
 * Bare symbols default provider to yahoo unless they look like CNBC-style indices (leading `.`).
 */
export function parseFinanceQuoteInput(input: string): ParsedFinanceQuoteInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isFinanceQuoteUrl(trimmed)) {
    try {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();

      const isTaiwanYahoo = host === TAIWAN_YAHOO_STOCK_HOST;
      const isYahoo =
        host === "finance.yahoo.com" ||
        isTaiwanYahoo ||
        (host.endsWith(".yahoo.com") && /\/quote\//i.test(url.pathname));
      if (isYahoo) {
        const symbol = extractYahooSymbol(url.pathname);
        if (!symbol || symbol.length > 32) return null;
        return {
          symbol,
          provider: "yahoo",
          fromUrl: true,
          sourceUrl: url.toString(),
          // Yahoo 奇摩股市 → 台股來源自動辨識
          ...(isTaiwanYahoo ? { marketHint: "tw" as const } : {}),
        };
      }

      const isCnbc = host === "cnbc.com" || host.endsWith(".cnbc.com");
      if (isCnbc) {
        const symbol = extractCnbcSymbol(url.pathname, url.searchParams);
        if (!symbol || symbol.length > 32) return null;
        return {
          symbol,
          provider: "cnbc",
          fromUrl: true,
          sourceUrl: url.toString(),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  // Bare symbol / ticker
  const symbol = trimmed.toUpperCase().replace(/\s+/g, "");
  if (!BARE_SYMBOL_RE.test(symbol)) return null;

  return {
    symbol,
    // CNBC index codes often start with `.` (e.g. .SOX, .SPX); Yahoo uses `^` for many indices.
    provider: symbol.startsWith(".") ? "cnbc" : "yahoo",
    fromUrl: false,
  };
}

/** Stable key for a custom instrument (provider + symbol). */
export function getCustomFinanceInstrumentKey(
  instrument: Pick<CustomFinanceInstrument, "provider" | "symbol">
) {
  return `${instrument.provider}|${instrument.symbol.trim().toUpperCase()}`;
}

export type GuessFinanceGroupOptions = {
  /** Quote page URL; tw.stock.yahoo.com forces Taiwan market groups. */
  sourceUrl?: string;
  /** From parseFinanceQuoteInput when host is Yahoo 奇摩股市. */
  marketHint?: "tw";
};

/**
 * Best-effort region group guess from ticker shape and optional source host
 * (user can still override in the form).
 *
 * Taiwan Yahoo 奇摩股市 (`tw.stock.yahoo.com`) → 台灣.
 */
export function guessFinanceGroup(
  symbol: string,
  options?: GuessFinanceGroupOptions
): FinanceCustomGroup {
  const s = symbol.trim().toUpperCase();
  const fromTaiwanYahoo =
    options?.marketHint === "tw" || isTaiwanYahooStockSource(options?.sourceUrl);

  if (!s) {
    return fromTaiwanYahoo ? "taiwan" : "us";
  }

  // Korea
  if (s === ".KS11" || s === "^KS11" || s === "KORU") return "korea";
  if (/\.KS$/i.test(s) || /\.KQ$/i.test(s)) return "korea";

  // Japan
  if (s === ".N225" || s === "^N225") return "japan";
  if (/\.T$/i.test(s)) return "japan";

  // Taiwan
  if (s === "^TWII" || s === ".TWII" || s === "^TWOII" || s === ".TWOII") return "taiwan";
  if (/\.TW$/i.test(s) || /\.TWO$/i.test(s)) return "taiwan";
  if (s === "TSM" || s === "TSMX") return "taiwan";
  if (fromTaiwanYahoo) return "taiwan";

  // Global / other (FX, crypto, commodities, rates, valuation)
  if (/=X$/i.test(s)) return "other";
  if (/BTC|ETH|CRYPTO|CAPE/i.test(s)) return "other";
  if (s.startsWith("@") || /=(F)$/i.test(s) || s.endsWith("=F")) return "other";
  if (s === "US.30" || s === "^TYX") return "other";

  // US indices & equities
  if (s.startsWith(".") || s.startsWith("^")) return "us";
  return "us";
}

/** Display name for finance quote source (Yahoo 奇摩 vs global Yahoo, etc.). */
export function getFinanceProviderDisplayName(input: {
  provider?: string;
  sourceUrl?: string;
  marketHint?: "tw";
}): string {
  if (input.marketHint === "tw" || isTaiwanYahooStockSource(input.sourceUrl)) {
    return "Yahoo 奇摩";
  }
  if (input.provider === "yahoo") return "Yahoo";
  if (input.provider === "cnbc") return "CNBC";
  return (input.provider || "Unknown").toUpperCase();
}

export type YahooQuoteSourceUrlOptions = {
  /** Custom instrument group (taiwan → 奇摩 for TW-listed). */
  group?: string;
  /** Original paste URL; tw.stock.yahoo.com forces 奇摩. */
  sourceUrl?: string;
  marketHint?: "tw";
};

/**
 * True when a Yahoo quote should open on Yahoo 奇摩股市 (tw.stock.yahoo.com)
 * rather than global finance.yahoo.com.
 *
 * Rules: marketHint/source host, taiwan/legacy TW groups, .TW/.TWO suffixes, major TW indices.
 * US-listed Taiwan ADRs (TSM) stay on global Yahoo.
 */
export function isTaiwanYahooQuoteTarget(
  symbol: string,
  options?: YahooQuoteSourceUrlOptions
): boolean {
  if (options?.marketHint === "tw" || isTaiwanYahooStockSource(options?.sourceUrl)) {
    return true;
  }

  const s = symbol.trim().toUpperCase();
  if (!s) return false;
  // US-listed ADR / leveraged products — not 奇摩
  if (s === "TSM" || s === "TSMX") return false;

  const group = options?.group;
  if (
    group === "taiwan" ||
    group === "tw" ||
    group === "tw-stocks"
  ) {
    // taiwan group + TW listing suffix / index → 奇摩
    if (/\.TWO?$/i.test(s) || s.startsWith("^") || s.startsWith(".")) return true;
  }

  // TWSE (.TW) and TPEx / 櫃買 (.TWO)
  if (/\.TWO?$/i.test(s)) return true;
  if (s === "^TWII" || s === ".TWII" || s === "^TWOII" || s === ".TWOII") return true;
  return false;
}

/**
 * Public quote-page URL for a Yahoo symbol.
 * Taiwan stocks/indices stay on tw.stock.yahoo.com (not finance.yahoo.com).
 */
export function buildYahooQuoteSourceUrl(
  symbol: string,
  options?: YahooQuoteSourceUrlOptions
): string {
  const encoded = encodeURIComponent(symbol.trim());
  if (isTaiwanYahooQuoteTarget(symbol, options)) {
    return `https://tw.stock.yahoo.com/quote/${encoded}`;
  }
  return `https://finance.yahoo.com/quote/${encoded}`;
}

/**
 * Parse Yahoo 奇摩股市 HTML `<title>` into short display name.
 * e.g. "川湖(2059.TW) 走勢圖 - Yahoo股市" → { name: "川湖", symbol: "2059.TW" }
 *      "加權指數(^TWII) 走勢圖 - Yahoo股市" → { name: "加權指數", symbol: "^TWII" }
 */
export function parseTaiwanYahooQuotePageTitle(
  title: string
): { name: string; symbol: string } | null {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^(.+?)\(([^)]+)\)/);
  if (!match?.[1] || !match[2]) return null;

  const name = match[1].trim();
  let symbol = match[2].trim();
  try {
    symbol = decodeURIComponent(symbol);
  } catch {
    // keep raw
  }
  symbol = symbol.toUpperCase();

  if (!name || !symbol || name.length > 40 || symbol.length > 32) return null;
  // Ignore generic shell titles
  if (/^yahoo/i.test(name) || /走勢圖/.test(name)) return null;

  return { name, symbol };
}

/** Public quote-page URL for a CNBC symbol. */
export function buildCnbcQuoteSourceUrl(symbol: string): string {
  return `https://www.cnbc.com/quotes/${encodeURIComponent(symbol.trim())}`;
}

/** Supabase Storage / external image URLs may be long (signed tokens). */
const MAX_FINANCE_IMAGE_URL_LEN = 1200;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Unwrap `/api/media-proxy?url=…` (absolute or site-relative) back to the inner media URL.
 * Keeps Storage public URLs portable in localStorage / CSV (no embedded query secrets).
 */
export function unwrapFinanceMediaProxyUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes("media-proxy")) return trimmed;
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (!parsed.pathname.includes("/api/media-proxy") && !parsed.pathname.includes("media-proxy")) {
      return trimmed;
    }
    const inner = parsed.searchParams.get("url");
    if (inner?.trim()) return inner.trim();
  } catch {
    // fall through to regex
  }
  const match = trimmed.match(/[?&]url=([^&]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return trimmed;
}

/**
 * Split a multi-image cell / textarea into raw URL candidates.
 * Prefer `;` and newlines (CSV multi-value). Avoid naive comma-split that could
 * mangle rare URLs; only split on comma when the next token starts a new http(s) URL.
 */
export function splitFinanceImageUrlList(input: string): string[] {
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];

  if (/[;\n]/.test(text)) {
    return text
      .split(/[;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  // Single token, or comma-separated full URLs (legacy paste)
  if (/,/.test(text) && /https?:\/\//i.test(text)) {
    return text
      .split(/,\s*(?=https?:\/\/)/i)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [text];
}

/**
 * Accept absolute http(s) URLs (e.g. Supabase Storage public), media-proxy wraps,
 * or site-relative paths starting with `/` (e.g. `/finance/kospi-cats.jpg`).
 */
function normalizeFinanceImageUrl(value: string): string | null {
  let trimmed = value.trim();
  if (!trimmed) return null;

  trimmed = unwrapFinanceMediaProxyUrl(trimmed);

  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && trimmed.length > 1) {
    // Site-relative asset path (max reasonable length)
    return trimmed.length <= 500 ? trimmed : trimmed.slice(0, 500);
  }

  // Protocol-relative //host/…
  if (trimmed.startsWith("//")) {
    trimmed = `https:${trimmed}`;
  }

  // Only treat as absolute URL when it already has a scheme (avoid "foo" → https://foo)
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (!isHttpUrl(trimmed)) return null;
  try {
    const host = new URL(trimmed).hostname;
    // Require a real-looking host (supabase.co, localhost, etc.)
    if (!host || (!host.includes(".") && host !== "localhost")) return null;
  } catch {
    return null;
  }
  return trimmed.length <= MAX_FINANCE_IMAGE_URL_LEN
    ? trimmed
    : trimmed.slice(0, MAX_FINANCE_IMAGE_URL_LEN);
}

/**
 * Parse draft textarea / stored list / CSV cell into clean image URLs.
 * Supports Supabase Storage public URLs, media-proxy unwrap, and local `/finance/...` paths.
 */
export function normalizeFinanceImageUrls(input: unknown): string[] {
  const rawList: string[] = [];

  if (typeof input === "string") {
    rawList.push(...splitFinanceImageUrlList(input));
  } else if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === "string" && item.trim()) {
        if (/[;\n]/.test(item) || (/https?:\/\//i.test(item) && item.includes(","))) {
          rawList.push(...splitFinanceImageUrlList(item));
        } else {
          rawList.push(item.trim());
        }
      }
    }
  }

  const urls: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawList) {
    const url = normalizeFinanceImageUrl(raw);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= MAX_CUSTOM_IMAGE_URLS) break;
  }
  return urls;
}

/** Load an existing custom instrument into the add/edit draft form. */
export function draftFromCustomFinanceInstrument(
  instrument: CustomFinanceInstrument
): CustomFinanceDraft {
  // multpl / mis / taifex have no pasteable quote URL: edit by symbol and keep the provider.
  const urlOrSymbol =
    instrument.provider === "yahoo"
      ? buildYahooQuoteSourceUrl(instrument.symbol, { group: instrument.group })
      : instrument.provider === "cnbc"
        ? buildCnbcQuoteSourceUrl(instrument.symbol)
        : instrument.symbol;

  const imageUrls = normalizeFinanceImageUrls(
    instrument.imageUrls?.length
      ? instrument.imageUrls
      : instrument.imageUrl
        ? [instrument.imageUrl]
        : []
  );

  return {
    name: instrument.name,
    urlOrSymbol,
    provider: instrument.provider,
    group: migrateFinanceGroup(instrument.group),
    imageUrlsText: imageUrls.join("\n"),
    featured: Boolean(instrument.featured),
  };
}

export function normalizeFinanceProvider(value: unknown): FinanceProvider {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (FINANCE_PROVIDERS as string[]).includes(text) ? (text as FinanceProvider) : "cnbc";
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text.slice(0, max) : undefined;
}

function cleanHttpUrl(value: unknown): string | undefined {
  const text = cleanText(value, 1000);
  if (!text || !/^https?:\/\//i.test(text)) return undefined;
  try {
    new URL(text);
    return text;
  } catch {
    return undefined;
  }
}

function cleanNumber(value: unknown): number | undefined {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : undefined;
}

export function normalizeFinanceLinks(value: unknown, max = 12): FinanceLink[] {
  if (!Array.isArray(value)) return [];
  const links: FinanceLink[] = [];
  for (const item of value) {
    const url = cleanHttpUrl((item as FinanceLink)?.url);
    if (!url) continue;
    links.push({ label: cleanText((item as FinanceLink)?.label, 80) || new URL(url).hostname, url });
    if (links.length >= max) break;
  }
  return links;
}

export function normalizeFinanceReferenceLevels(value: unknown, max = 6): FinanceReferenceLevel[] {
  if (!Array.isArray(value)) return [];
  const levels: FinanceReferenceLevel[] = [];
  for (const item of value) {
    const level = cleanNumber((item as FinanceReferenceLevel)?.value);
    if (level == null) continue;
    levels.push({ value: level, label: cleanText((item as FinanceReferenceLevel)?.label, 120) || String(level) });
    if (levels.length >= max) break;
  }
  return levels;
}

/** Optional fields carried over from the former built-in list; omitted when empty. */
function normalizeFinanceExtras(input: Partial<CustomFinanceInstrument>) {
  const extras: Partial<CustomFinanceInstrument> = {};
  const slug = cleanText(input.slug, 48);
  if (slug) extras.slug = slug;
  const sourceUrl = cleanHttpUrl(input.sourceUrl);
  if (sourceUrl) extras.sourceUrl = sourceUrl;
  const historySymbol = cleanText(input.historySymbol, 32);
  if (historySymbol) extras.historySymbol = historySymbol;
  const alertThreshold = cleanNumber(input.alertThreshold);
  if (alertThreshold != null) extras.alertThreshold = alertThreshold;
  const localLabel = cleanText(input.localLabel, 120);
  if (localLabel) extras.localLabel = localLabel;
  const periodLabel = cleanText(input.periodLabel, 40);
  if (periodLabel) extras.periodLabel = periodLabel;
  const referenceLevels = normalizeFinanceReferenceLevels(input.referenceLevels);
  if (referenceLevels.length) extras.referenceLevels = referenceLevels;
  const youtubeUrl = cleanHttpUrl(input.youtubeUrl);
  if (youtubeUrl) extras.youtubeUrl = youtubeUrl;
  const youtubeLabel = cleanText(input.youtubeLabel, 80);
  if (youtubeLabel) extras.youtubeLabel = youtubeLabel;
  const youtubeLinks = normalizeFinanceLinks(input.youtubeLinks);
  if (youtubeLinks.length) extras.youtubeLinks = youtubeLinks;
  const bilibiliUrl = cleanHttpUrl(input.bilibiliUrl);
  if (bilibiliUrl) extras.bilibiliUrl = bilibiliUrl;
  const relatedLinks = normalizeFinanceLinks(input.relatedLinks);
  if (relatedLinks.length) extras.relatedLinks = relatedLinks;
  if (input.featured === true) extras.featured = true;
  const subtitle = cleanText(input.subtitle, 120);
  if (subtitle) extras.subtitle = subtitle;
  return extras;
}

export function normalizeCustomFinanceInstrument(
  input: Partial<CustomFinanceInstrument> & { imageUrlsText?: string }
): CustomFinanceInstrument | null {
  const provider = normalizeFinanceProvider(input.provider);
  const rawSymbol = typeof input.symbol === "string" ? input.symbol.trim() : "";
  // CNBC / Yahoo tickers are case-insensitive; MIS codes like otc_o00.tw are not.
  const symbol = provider === "cnbc" || provider === "yahoo" ? rawSymbol.toUpperCase() : rawSymbol;
  if (!symbol || symbol.length > 32) return null;

  const name =
    typeof input.name === "string" && input.name.trim()
      ? input.name.trim().slice(0, 80)
      : symbol;
  const group = migrateFinanceGroup(input.group);

  const imageUrls = normalizeFinanceImageUrls(
    input.imageUrls?.length
      ? input.imageUrls
      : input.imageUrl
        ? [input.imageUrl]
        : input.imageUrlsText
  );

  return {
    name,
    symbol,
    provider,
    group,
    ...(imageUrls[0] ? { imageUrl: imageUrls[0] } : {}),
    ...(imageUrls.length > 0 ? { imageUrls } : {}),
    ...normalizeFinanceExtras(input),
  };
}

/**
 * Build a custom instrument from the add form (代稱 + 網址/代號 + optional overrides).
 */
export function buildCustomFinanceInstrumentFromDraft(
  draft: CustomFinanceDraft
): CustomFinanceInstrument | null {
  const parsed = parseFinanceQuoteInput(draft.urlOrSymbol);
  if (!parsed) return null;

  const provider = parsed.fromUrl
    ? parsed.provider
    : draft.provider === "yahoo"
      ? "yahoo"
      : "cnbc";

  const group = FINANCE_CUSTOM_GROUPS.includes(draft.group)
    ? draft.group
    : guessFinanceGroup(parsed.symbol, {
        sourceUrl: parsed.sourceUrl,
        marketHint: parsed.marketHint,
      });

  return normalizeCustomFinanceInstrument({
    name: draft.name,
    symbol: parsed.symbol,
    provider,
    group,
    imageUrls: normalizeFinanceImageUrls(draft.imageUrlsText),
    featured: draft.featured === true,
  });
}

/**
 * Apply the add/edit form to an instrument. The form only covers name, symbol/provider,
 * group, images and featured; every other field (alert, reference levels, YouTube /
 * Bilibili, related links…) is kept from `existing`. When the symbol or provider
 * changes, the old slug / quote page / history symbol no longer apply and are dropped.
 */
export function applyFinanceDraft(
  draft: CustomFinanceDraft,
  existing?: CustomFinanceInstrument | null
): CustomFinanceInstrument | null {
  // multpl / mis / taifex have no pasteable quote URL: keep their source while the symbol is unchanged.
  const keepQuoteSource =
    existing != null &&
    existing.provider !== "cnbc" &&
    existing.provider !== "yahoo" &&
    draft.urlOrSymbol.trim() === existing.symbol;
  const edited = keepQuoteSource
    ? normalizeCustomFinanceInstrument({
        name: draft.name,
        symbol: existing.symbol,
        provider: existing.provider,
        group: draft.group,
        imageUrls: normalizeFinanceImageUrls(draft.imageUrlsText),
        featured: draft.featured === true,
      })
    : buildCustomFinanceInstrumentFromDraft(draft);
  if (!edited || !existing) return edited;

  const sameQuote = getCustomFinanceInstrumentKey(edited) === getCustomFinanceInstrumentKey(existing);
  const {
    imageUrl: _imageUrl,
    imageUrls: _imageUrls,
    featured: _featured,
    slug,
    sourceUrl,
    historySymbol,
    ...extras
  } = existing;
  return normalizeCustomFinanceInstrument({
    ...extras,
    ...(sameQuote ? { slug, sourceUrl, historySymbol } : {}),
    ...edited,
    imageUrls: edited.imageUrls || [],
    featured: edited.featured === true,
  });
}

export function createEmptyCustomFinanceDraft(
  overrides?: Partial<CustomFinanceDraft>
): CustomFinanceDraft {
  return {
    name: "",
    urlOrSymbol: "",
    provider: "cnbc",
    group: "us",
    imageUrlsText: "",
    featured: false,
    ...overrides,
  };
}
