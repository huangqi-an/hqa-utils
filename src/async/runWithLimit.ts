/**
 * 带并发上限地执行异步任务，返回所有结果（保持输入顺序）
 * @param tasks 任务工厂列表
 * @param concurrency 最大并发数，默认 Infinity
 */
export async function runWithLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = Number.POSITIVE_INFINITY,
): Promise<T[]> {
  if (concurrency < 1) {
    throw new RangeError("concurrency must be >= 1");
  }
  const results = new Array<T>(tasks.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    async () => {
      while (next < tasks.length) {
        const i = next++;
        results[i] = await tasks[i]!();
      }
    },
  );
  await Promise.all(workers);
  return results;
}
