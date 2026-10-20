import { isBrowser } from "../client/env.js";
import { updateSearchParams } from "./updateSearchParams.js";
import type { QueryParamValue } from "./buildUrl.js";

export interface ReplaceQueryStateOptions {
  /** 写入历史的方式："replace" 覆盖当前记录（默认），"push" 新增一条 */
  method?: "replace" | "push";
}

/**
 * 直接更新当前页面 URL 的查询参数
 *
 * 基于 location.href 做参数增删改查后写入 history（默认 replaceState 覆盖当前记录，
 * 不产生新历史条目；传 method: "push" 则新增）。页面不会重新加载。
 * 非浏览器环境为空操作（SSR 安全）。
 * @param patch 参数变更：值为 null / undefined 时删除该参数，其余 String() 后设置
 * @param options.method 写入历史的方式，默认 "replace"
 * @example
 * // 当前 /list?tab=all&page=1
 * replaceQueryState({ page: 2 });        // → /list?tab=all&page=2
 * replaceQueryState({ page: null });     // → /list?tab=all（删除 page）
 * replaceQueryState({ sort: "price" }, { method: "push" }); // 留一条历史，可后退
 */
export function replaceQueryState(
  patch: Record<string, QueryParamValue>,
  options: ReplaceQueryStateOptions = {},
): void {
  if (!isBrowser()) return;
  const next = updateSearchParams(window.location.href, patch);
  if (options.method === "push") {
    window.history.pushState(null, "", next);
  } else {
    window.history.replaceState(null, "", next);
  }
}
