import { buildFinanceResponse, shouldSkipFinanceHistory } from "../../utils/financeQuotes";

// 舊版呼叫方式（query.custom = JSON 清單）。現在前端走 finance.post.ts；
// 沒帶清單時回傳空報價 —— 已沒有寫死的預設標的。
export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Record<string, unknown>;
  let list: unknown = [];
  if (typeof query.custom === "string") {
    try {
      list = JSON.parse(query.custom);
    } catch {
      list = [];
    }
  }
  return buildFinanceResponse(list, { skipHistory: shouldSkipFinanceHistory(query.skipHistory ?? query.quoteOnly) });
});
