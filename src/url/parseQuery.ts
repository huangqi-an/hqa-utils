/** 解析结果：单值为 string，重复出现的 key 为 string[]（按出现顺序） */
export type ParsedQuery = Record<string, string | string[]>;

function safeDecode(part: string): string {
  // 先将裸 + 还原为空格，再解码百分号编码（保证 %2B 解码后的 + 不被误转）
  const spaced = part.replace(/\+/g, " ");
  try {
    return decodeURIComponent(spaced);
  } catch {
    return part;
  }
}

/**
 * 宽松解析查询字符串为对象
 *
 * 输入兼容裸 query（"a=1"）、带 ? 前缀（"?a=1"）与完整 URL（自动截取 ? 到 # 之间的部分）。
 * 解析规则与 URLSearchParams 一致：裸 + 视为空格、百分号解码；在此基础上扩展——
 * 无值 key 解析为空字符串（"?a&b=1" → { a: "", b: "1" }），重复 key 合并为数组。
 * 非法的百分号编码不抛错，保留原样返回。
 * @param input 查询字符串、带 ? 前缀的 query 或完整 URL
 * @returns 解析结果；空输入返回空对象
 * @example
 * parseQuery("?a=1&b=hello+world"); // { a: "1", b: "hello world" }
 * parseQuery("a=1&a=2&flag");       // { a: ["1", "2"], flag: "" }
 * parseQuery("https://x.com/p?a=1#h"); // { a: "1" }
 */
export function parseQuery(input: string): ParsedQuery {
  const result: ParsedQuery = {};
  // 输入形态判断：带 ? 截取其后；含 :// 的 URL 无 query 返回空；其余视为裸 query
  const qIndex = input.indexOf("?");
  let withHash: string;
  if (qIndex !== -1) {
    withHash = input.slice(qIndex + 1);
  } else if (input.includes("://")) {
    return result;
  } else {
    withHash = input;
  }
  const hashIndex = withHash.indexOf("#");
  const search = hashIndex === -1 ? withHash : withHash.slice(0, hashIndex);
  if (!search) return result;

  for (const pair of search.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = safeDecode(eq === -1 ? pair : pair.slice(0, eq));
    const value = safeDecode(eq === -1 ? "" : pair.slice(eq + 1));

    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }
  return result;
}
