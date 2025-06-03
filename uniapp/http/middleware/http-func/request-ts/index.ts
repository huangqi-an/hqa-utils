import { BASE_CONFIG, RETRY_CONFIG, MIDDLEWARE_TYPE } from './config'
import { runMiddlewareChain } from './middleware'
import './middlewares'
import { RequestConfig, Response } from './types'

// 合并配置
const mergeConfig = (config: Partial<RequestConfig> & { url: string }): RequestConfig => ({
  ...BASE_CONFIG,
  ...config,
  retryCount: RETRY_CONFIG.maxRetries
})

// 创建请求配置
const createRequestConfig = (
  method: RequestConfig['method'],
  url: string,
  data: any = {},
  options: Partial<RequestConfig> = {}
): RequestConfig => ({
  url,
  data,
  method,
  ...options
})

// 发起请求
const request = async <T = any>(options: Partial<RequestConfig> & { url: string }): Promise<Response<T>> => {
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

// 请求方法类型
interface HttpMethods {
  get: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  post: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  put: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  delete: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  request: typeof request
}

// 导出请求方法
export const http: HttpMethods = {
  // GET请求
  get: <T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}) => 
    request<T>(createRequestConfig('GET', url, data, options)),

  // POST请求
  post: <T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}) => 
    request<T>(createRequestConfig('POST', url, data, options)),

  // PUT请求
  put: <T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}) => 
    request<T>(createRequestConfig('PUT', url, data, options)),

  // DELETE请求
  delete: <T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}) => 
    request<T>(createRequestConfig('DELETE', url, data, options)),

  // 自定义请求
  request
}

export default http 
