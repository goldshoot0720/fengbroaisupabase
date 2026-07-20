import {
  buildYahooQuoteSourceUrl,
  isTaiwanYahooQuoteTarget,
  parseFinanceQuoteInput,
  parseTaiwanYahooQuotePageTitle,
} from "../../../../utils/fengbroFinanceCustom";

const FETCH_BROWSER_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
};

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";

function pickText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function resolveTaiwanYahooPageName(symbol: string, sourceUrl?: string) {
  const pageUrl =
    sourceUrl && /tw\.stock\.yahoo\.com/i.test(sourceUrl)
      ? sourceUrl
      : buildYahooQuoteSourceUrl(symbol, { marketHint: "tw" });

  const response = await fetch(pageUrl, {
    headers: FETCH_BROWSER_HEADERS,
    redirect: "follow",
  });
  if (!response.ok) return null;

  const html = await response.text();
  const title = (html.match(/<title[^>]*>([^<]+)/i) || [])[1] || "";
  const fromTitle = parseTaiwanYahooQuotePageTitle(title);
  if (fromTitle?.name) return fromTitle.name;

  const symbolNameMatch = html.match(/"symbolName"\s*:\s*"([^"]{1,40})"/);
  if (symbolNameMatch?.[1]?.trim()) return symbolNameMatch[1].trim();

  return null;
}

async function resolveYahooChartName(symbol: string, preferTw: boolean) {
  const params = new URLSearchParams({
    range: "1d",
    interval: "1d",
    lang: preferTw ? "zh-TW" : "en-US",
    region: preferTw ? "TW" : "US",
  });

  const response = await fetch(
    `${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(symbol)}?${params.toString()}`,
    {
      headers: {
        ...FETCH_BROWSER_HEADERS,
        accept: "application/json,text/plain,*/*",
      },
    }
  );
  if (!response.ok) return null;

  const payload = await response.json();
  const meta = (payload?.chart?.result?.[0]?.meta || {}) as Record<string, unknown>;
  return pickText(meta, ["shortName", "longName", "symbol"]) || null;
}

/**
 * Resolve a friendly default 代稱 for a quote URL or symbol.
 * Taiwan Yahoo pages yield Chinese short names (e.g. 2059.TW → 川湖).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const urlParam = String(query.url || "").trim();
  const symbolParam = String(query.symbol || "").trim();
  const providerParam = String(query.provider || "").trim().toLowerCase();

  const rawInput = urlParam || symbolParam;
  if (!rawInput) {
    throw createError({ statusCode: 400, statusMessage: "Missing url or symbol" });
  }

  const parsed = parseFinanceQuoteInput(rawInput);
  const symbol = (parsed?.symbol || symbolParam).trim().toUpperCase();
  if (!symbol || symbol.length > 32) {
    throw createError({ statusCode: 400, statusMessage: "Invalid symbol" });
  }

  const provider =
    parsed?.provider ||
    (providerParam === "yahoo" || providerParam === "cnbc" ? providerParam : "yahoo");
  const sourceUrl = parsed?.sourceUrl;
  const marketHint = parsed?.marketHint;
  const preferTw = isTaiwanYahooQuoteTarget(symbol, { sourceUrl, marketHint });

  let name: string | null = null;
  let resolvedFrom: "taiwan-yahoo-page" | "yahoo-chart" | "symbol" = "symbol";

  if (provider === "yahoo" && preferTw) {
    try {
      name = await resolveTaiwanYahooPageName(symbol, sourceUrl);
      if (name) resolvedFrom = "taiwan-yahoo-page";
    } catch {
      // fall through
    }
  }

  if (!name && provider === "yahoo") {
    try {
      name = await resolveYahooChartName(symbol, preferTw);
      if (name) resolvedFrom = "yahoo-chart";
    } catch {
      // fall through
    }
  }

  if (!name) {
    name = symbol;
    resolvedFrom = "symbol";
  }

  name = name.replace(/\s+/g, " ").trim().slice(0, 80);

  return {
    name,
    symbol,
    provider,
    sourceUrl:
      sourceUrl ||
      (provider === "yahoo" ? buildYahooQuoteSourceUrl(symbol, { marketHint }) : undefined),
    resolvedFrom,
  };
});
