/**
 * 延时指定毫秒数
 * @param ms 延迟毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
