/** 可参与构建的参数值；null / undefined 表示忽略该参数 */
export type QueryParamValue = string | number | boolean | null | undefined;

/**
 * 构建带查询参数的 URL：path + 序列化后的 query
 *
 * 参数值统一 String() 后经 URLSearchParams 编码（空格 → +、特殊字符 → 百分号编码）；
 * 值为 null / undefined 的条目被忽略。path 已自带 query 时用 & 追加。
 * @param path 路径（可已包含 query）
 * @param params 参数对象，默认为空
 * @returns 拼接后的 URL 字符串
 * @example
 * buildUrl("/search", { q: "hello world", page: 2 }); // "/search?q=hello+world&page=2"
 * buildUrl("/list?tab=all", { page: 1 });             // "/list?tab=all&page=1"
 * buildUrl("/p", { empty: null });                    // "/p"
 */
export function buildUrl(
  path: string,
  params: Record<string, QueryParamValue> = {},
): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    usp.set(key, String(value));
  }
  const query = usp.toString();
  if (!query) return path;
  return path + (path.includes("?") ? "&" : "?") + query;
}
