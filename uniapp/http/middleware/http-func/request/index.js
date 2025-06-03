import { BASE_CONFIG, RETRY_CONFIG, MIDDLEWARE_TYPE } from './config'
import { runMiddlewareChain } from './middleware'
import './middlewares' // 导入中间件

// 合并配置
const mergeConfig = (config = {}) => ({
  ...BASE_CONFIG,
  ...config,
  retryCount: RETRY_CONFIG.maxRetries
})

// 创建请求配置
const createRequestConfig = (method, url, data = {}, options = {}) => ({
  url,
  data,
  method,
  ...options
})

// 发起请求
const request = async (options) => {
  const config = mergeConfig(options)

  try {
    // 执行请求中间件
    const processedConfig = await runMiddlewareChain(MIDDLEWARE_TYPE.REQUEST, config)
    
    // 发起请求
    const response = await uni.request(processedConfig)
    
    // 执行响应中间件
    return await runMiddlewareChain(MIDDLEWARE_TYPE.RESPONSE, {
      ...response,
      config: processedConfig
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

// 导出请求方法
export const http = {
  // GET请求
  get: (url, data = {}, options = {}) => 
    request(createRequestConfig('GET', url, data, options)),

  // POST请求
  post: (url, data = {}, options = {}) => 
    request(createRequestConfig('POST', url, data, options)),

  // PUT请求
  put: (url, data = {}, options = {}) => 
    request(createRequestConfig('PUT', url, data, options)),

  // DELETE请求
  delete: (url, data = {}, options = {}) => 
    request(createRequestConfig('DELETE', url, data, options)),

  // 自定义请求
  request
}

export default http 
