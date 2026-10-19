/**
 * 触发浏览器下载文件。
 *
 * 接收 Blob 或字符串内容（如导出的 CSV / JSON 文本），通过 objectURL +
 * `a[download]` 程序化点击触发下载，随后释放 objectURL。前端导出报表、
 * 下载文件流等场景的封装。SSR / Node 环境返回 `false`，不抛错。
 *
 * 注意：如需下载远程 URL，直接用 `a[href][download]` 即可，无需本函数。
 *
 * @param data 文件内容：Blob 或文本字符串
 * @param filename 下载保存的文件名
 * @param mime 字符串内容转 Blob 时使用的 MIME 类型，默认 `text/plain`
 * @returns 是否成功触发
 *
 * @example
 * ```ts
 * downloadFile(JSON.stringify(data), "report.json", "application/json");
 * downloadFile(csvText, "订单列表.csv", "text/csv");
 * ```
 */
export function downloadFile(data: Blob | string, filename: string, mime = "text/plain"): boolean {
  if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") {
    return false;
  }
  let url: string | null = null;
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  } catch {
    return false;
  } finally {
    // 延迟释放，避免下载尚未开始时 objectURL 被回收
    if (url !== null) {
      const objectUrl = url;
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }
}
