/**
 * CSV export / import for 鋒兄金融 instruments (public.financeinstrument).
 *
 * The first 9 columns match Appwrite fengbroFinanceCsv, so CSVs move between projects:
 * name,symbol,provider,group,imageUrls,youtubeUrl,bilibiliUrl,relatedLinks,featured
 * The rest carry fields the former built-in list used (Appwrite ignores unknown columns):
 * subtitle,localLabel,periodLabel,alertThreshold,referenceLevels,youtubeLabel,youtubeLinks,
 * sourceUrl,historySymbol,slug
 *
 * Multi-value cells use `;`:
 * - imageUrls: url1;url2
 * - relatedLinks / youtubeLinks: 標籤|url;標籤|url  (a bare url is also accepted)
 * - referenceLevels: 6472|融資平均水平線;7000|標籤
 * media-proxy URLs are unwrapped so API keys are not written to CSV.
 */

import {
  migrateFinanceGroup,
  normalizeCustomFinanceInstrument,
  normalizeFinanceImageUrls,
  normalizeFinanceProvider,
  type CustomFinanceInstrument,
  type FinanceLink,
  type FinanceReferenceLevel,
} from "./fengbroFinanceCustom.ts";

export const FINANCE_CUSTOM_CSV_HEADERS = [
  "name",
  "symbol",
  "provider",
  "group",
  "imageUrls",
  "youtubeUrl",
  "bilibiliUrl",
  "relatedLinks",
  "featured",
  "subtitle",
  "localLabel",
  "periodLabel",
  "alertThreshold",
  "referenceLevels",
  "youtubeLabel",
  "youtubeLinks",
  "sourceUrl",
  "historySymbol",
  "slug",
] as const;

export type FinanceCustomCsvHeader = (typeof FINANCE_CUSTOM_CSV_HEADERS)[number];

const HEADER_ALIASES: Record<string, FinanceCustomCsvHeader> = {
  name: "name",
  代稱: "name",
  名稱: "name",
  symbol: "symbol",
  代號: "symbol",
  ticker: "symbol",
  provider: "provider",
  來源: "provider",
  group: "group",
  分類: "group",
  region: "group",
  imageurls: "imageUrls",
  image_urls: "imageUrls",
  images: "imageUrls",
  圖片: "imageUrls",
  圖片網址: "imageUrls",
  youtubeurl: "youtubeUrl",
  youtube: "youtubeUrl",
  bilibiliurl: "bilibiliUrl",
  bilibili: "bilibiliUrl",
  relatedlinks: "relatedLinks",
  related_links: "relatedLinks",
  links: "relatedLinks",
  自訂網址: "relatedLinks",
  連結: "relatedLinks",
  featured: "featured",
  精選: "featured",
  精選焦點: "featured",
  subtitle: "subtitle",
  locallabel: "localLabel",
  periodlabel: "periodLabel",
  alertthreshold: "alertThreshold",
  警示價: "alertThreshold",
  referencelevels: "referenceLevels",
  參考線: "referenceLevels",
  youtubelabel: "youtubeLabel",
  youtubelinks: "youtubeLinks",
  sourceurl: "sourceUrl",
  historysymbol: "historySymbol",
  slug: "slug",
};

/** Most instruments the list keeps (was 30 before the built-in 34 moved into the table). */
export const MAX_FINANCE_INSTRUMENTS = 80;

export function escapeFinanceCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  // Quote when field has multi-value sep, Storage query chars, commas, quotes, newlines.
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes(";") ||
    stringValue.includes("?") ||
    stringValue.includes("&")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/** Join image URLs for CSV (Supabase public / site-relative / https). */
export function imageUrlsToCsvCell(instrument: CustomFinanceInstrument): string {
  const urls = normalizeFinanceImageUrls(
    instrument.imageUrls?.length
      ? instrument.imageUrls
      : instrument.imageUrl
        ? [instrument.imageUrl]
        : []
  );
  return urls.join(";");
}

const linksToCsvCell = (links: FinanceLink[] | undefined) =>
  (links || []).map((link) => `${link.label.replace(/[|;]/g, " ")}|${link.url}`).join(";");

const levelsToCsvCell = (levels: FinanceReferenceLevel[] | undefined) =>
  (levels || []).map((level) => `${level.value}|${level.label.replace(/[|;]/g, " ")}`).join(";");

function parseLinksCell(value: string): FinanceLink[] {
  const links: FinanceLink[] = [];
  for (const part of value.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.+?)\s*[|｜]\s*(https?:\/\/\S+)$/i);
    links.push(match ? { label: match[1].trim(), url: match[2].trim() } : { label: "", url: trimmed });
  }
  return links;
}

function parseLevelsCell(value: string): FinanceReferenceLevel[] {
  const levels: FinanceReferenceLevel[] = [];
  for (const part of value.split(";")) {
    const [rawValue, ...labelParts] = part.split(/[|｜]/);
    const number = Number(String(rawValue || "").replace(/[,\s]/g, ""));
    if (!rawValue?.trim() || !Number.isFinite(number)) continue;
    levels.push({ value: number, label: labelParts.join("|").trim() });
  }
  return levels;
}

function parseFeaturedFlag(value: string): boolean {
  return /^(1|true|yes|y|是|精選)$/i.test(value.trim());
}

export function toFinanceCustomCsvRow(instrument: CustomFinanceInstrument): string {
  return [
    instrument.name,
    instrument.symbol,
    instrument.provider,
    instrument.group,
    imageUrlsToCsvCell(instrument),
    instrument.youtubeUrl,
    instrument.bilibiliUrl,
    linksToCsvCell(instrument.relatedLinks),
    instrument.featured ? "1" : "0",
    instrument.subtitle,
    instrument.localLabel,
    instrument.periodLabel,
    instrument.alertThreshold,
    levelsToCsvCell(instrument.referenceLevels),
    instrument.youtubeLabel,
    linksToCsvCell(instrument.youtubeLinks),
    instrument.sourceUrl,
    instrument.historySymbol,
    instrument.slug,
  ]
    .map(escapeFinanceCsvValue)
    .join(",");
}

export function buildFinanceCustomCsv(instruments: CustomFinanceInstrument[]): string {
  const rows = [FINANCE_CUSTOM_CSV_HEADERS.join(",")];
  for (const instrument of instruments) {
    rows.push(toFinanceCustomCsvRow(instrument));
  }
  return rows.join("\n");
}

function parseFullCsv(text: string): string[][] {
  const rows: string[][] = [];
  const cleanText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
    } else if (char === "\n") {
      currentRow.push(currentField);
      if (currentRow.length > 0 && currentRow.some((field) => field.trim())) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim())) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeaderKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function mapHeader(raw: string): FinanceCustomCsvHeader | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  for (const header of FINANCE_CUSTOM_CSV_HEADERS) {
    if (header.toLowerCase() === lower) return header;
  }
  const alias = HEADER_ALIASES[normalizeHeaderKey(trimmed)] ?? HEADER_ALIASES[trimmed];
  return alias ?? null;
}

/**
 * Merge imported instruments into existing list (upsert by provider|symbol).
 * Keeps existing order; appends new keys; enforces max 30.
 */
export function mergeFinanceCustomInstruments(
  existing: CustomFinanceInstrument[],
  incoming: CustomFinanceInstrument[]
): CustomFinanceInstrument[] {
  const map = new Map<string, CustomFinanceInstrument>();
  const order: string[] = [];

  for (const item of existing) {
    const key = `${item.provider}|${item.symbol}`;
    if (!map.has(key)) order.push(key);
    map.set(key, item);
  }
  for (const item of incoming) {
    const key = `${item.provider}|${item.symbol}`;
    if (!map.has(key)) order.push(key);
    map.set(key, item);
  }

  return order
    .map((key) => map.get(key)!)
    .filter(Boolean)
    .slice(0, MAX_FINANCE_INSTRUMENTS);
}

export function parseFinanceCustomCsv(text: string): {
  data: CustomFinanceInstrument[];
  errors: string[];
} {
  const errors: string[] = [];
  const data: CustomFinanceInstrument[] = [];
  const rows = parseFullCsv(text);

  if (rows.length < 2) {
    errors.push("CSV 檔案至少需要表頭和一行資料");
    return { data, errors };
  }

  const headerCells = rows[0];
  const columnIndex: Partial<Record<FinanceCustomCsvHeader, number>> = {};
  for (let i = 0; i < headerCells.length; i++) {
    const mapped = mapHeader(headerCells[i] || "");
    if (mapped && columnIndex[mapped] == null) {
      columnIndex[mapped] = i;
    }
  }

  if (columnIndex.symbol == null) {
    errors.push('表頭缺少必要欄位 "symbol"（代號）');
    return { data, errors };
  }

  const seenKeys = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const lineNumber = i + 1;
    const cell = (header: FinanceCustomCsvHeader) => {
      const idx = columnIndex[header];
      if (idx == null) return "";
      return (values[idx] ?? "").trim();
    };

    const symbol = cell("symbol");
    if (!symbol) {
      errors.push(`第 ${lineNumber} 行: symbol 不能為空`);
      continue;
    }

    const providerRaw = (cell("provider") || "yahoo").toLowerCase();
    // 空白或不認得的來源沿用舊行為當 Yahoo；cnbc / multpl / mis / taifex 照填。
    const provider = normalizeFinanceProvider(providerRaw) === providerRaw ? providerRaw : "yahoo";
    const group = migrateFinanceGroup(cell("group") || "other");

    const normalized = normalizeCustomFinanceInstrument({
      name: cell("name") || symbol,
      symbol,
      provider: normalizeFinanceProvider(provider),
      group,
      imageUrls: normalizeFinanceImageUrls(cell("imageUrls")),
      youtubeUrl: cell("youtubeUrl"),
      bilibiliUrl: cell("bilibiliUrl"),
      relatedLinks: parseLinksCell(cell("relatedLinks")),
      featured: parseFeaturedFlag(cell("featured")),
      subtitle: cell("subtitle"),
      localLabel: cell("localLabel"),
      periodLabel: cell("periodLabel"),
      alertThreshold: cell("alertThreshold") === "" ? undefined : Number(cell("alertThreshold").replace(/,/g, "")),
      referenceLevels: parseLevelsCell(cell("referenceLevels")),
      youtubeLabel: cell("youtubeLabel"),
      youtubeLinks: parseLinksCell(cell("youtubeLinks")),
      sourceUrl: cell("sourceUrl"),
      historySymbol: cell("historySymbol"),
      slug: cell("slug"),
    });

    if (!normalized) {
      errors.push(`第 ${lineNumber} 行: 無法解析標的（請檢查 symbol / provider）`);
      continue;
    }

    const key = `${normalized.provider}|${normalized.symbol}`;
    if (seenKeys.has(key)) {
      errors.push(`第 ${lineNumber} 行: 重複的 ${normalized.provider}:${normalized.symbol}，已略過`);
      continue;
    }
    seenKeys.add(key);
    data.push(normalized);

    if (data.length >= MAX_FINANCE_INSTRUMENTS) {
      if (i < rows.length - 1) {
        errors.push(`已達上限 ${MAX_FINANCE_INSTRUMENTS} 筆，其餘列略過`);
      }
      break;
    }
  }

  return { data, errors };
}
