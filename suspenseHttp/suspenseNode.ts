// Node.js Suspense 风格请求缓存工具（兼容 TS/JS）
// 用法：在同步代码中调用 fetchWithSuspenseNode，未命中缓存时抛出 Promise，命中时返回数据

const cache = new Map();

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fetcher
 * @returns {T}
 * @throws {Promise<T>|any}
 */
function fetchWithSuspenseNode(key, fetcher) {
  if (cache.has(key)) {
    const value = cache.get(key);
    if (value.status === 'fulfilled') return value.data;
    if (value.status === 'rejected') throw value.error;
    throw value.promise;
  }
  const promise = fetcher()
    .then(data => {
      cache.set(key, { status: 'fulfilled', data });
    })
    .catch(error => {
      cache.set(key, { status: 'rejected', error });
    });
  cache.set(key, { status: 'pending', promise });
  throw promise;
}

function clearSuspenseCacheNode(key) {
  if (key) cache.delete(key);
  else cache.clear();
}

// export { fetchWithSuspenseNode, clearSuspenseCacheNode }; 
module.exports = { fetchWithSuspenseNode, clearSuspenseCacheNode };
