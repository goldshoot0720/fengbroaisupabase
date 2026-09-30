import { buildFinanceResponse, shouldSkipFinanceHistory } from "../../utils/financeQuotes";

// 鋒兄金融報價。body.instruments 是 public.financeinstrument 的資料列（前端形狀），
// 清單可能很長（圖片、連結），所以用 POST body 而不是 query string。
export default defineEventHandler(async (event) => {
  const body = ((await readBody(event)) || {}) as Record<string, unknown>;
  return buildFinanceResponse(body.instruments, { skipHistory: shouldSkipFinanceHistory(body.skipHistory) });
});
