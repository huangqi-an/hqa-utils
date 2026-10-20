import type { QueryParamValue } from "./buildUrl.js";

/**
 * 对 URL 的查询参数做增删改查，返回新的 URL 字符串
 *
 * 只改动 query 部分，路径与 #hash 保持不变：
 * - patch 值为 null / undefined 时删除该参数（同名多个值一并删除）
 * - 其余值 String() 后设置（覆盖同名参数）
 * - 兼容相对路径、绝对 URL 与带 hash 的 URL；无参数的 URL 按需补 ?
 * @param url 原 URL（相对或绝对均可）
 * @param patch 参数变更表
 * @returns 更新后的新 URL 字符串
 * @example
 * updateSearchParams("/list?tab=all&page=1", { page: 2 });  // "/list?tab=all&page=2"
 * updateSearchParams("/list?tab=all&page=1", { page: null }); // "/list?tab=all"
 * updateSearchParams("/p", { q: "a&b" });                   // "/p?q=a%26b"
 * updateSearchParams("/p#top", { q: 1 });                   // "/p?q=1#top"
 */
export function updateSearchParams(
  url: string,
  patch: Record<string, QueryParamValue>,
): string {
  const hashIndex = url.indexOf("#");
  const searchEnd = hashIndex === -1 ? url.length : hashIndex;
  const qIndex = url.indexOf("?");

  let before: string;
  let search: string;
  if (qIndex === -1 || qIndex > searchEnd) {
    // 无 query（? 不存在，或 ? 出现在 # 之后的非法位置）
    before = url.slice(0, searchEnd);
    search = "";
  } else {
    before = url.slice(0, qIndex);
    search = url.slice(qIndex + 1, searchEnd);
  }
  const after = url.slice(searchEnd);

  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return before + (query ? `?${query}` : "") + after;
}
