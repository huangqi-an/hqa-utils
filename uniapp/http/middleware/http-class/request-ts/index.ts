import { BASE_CONFIG, RETRY_CONFIG, MIDDLEWARE_TYPE } from './config'
import { middlewareManager } from './middlewares'
import { RequestConfig, Response, RequestOptions, RequestMethods } from './types'

export class Request implements RequestMethods {
  private config: Partial<RequestConfig>
  private middlewareManager = middlewareManager

  constructor(options: RequestOptions = {}) {
    this.config = {
      ...BASE_CONFIG,
      ...options
    }

    // 注册自定义中间件
    if (options.middlewares) {
      const { request, response } = options.middlewares
      request?.forEach(middleware => this.middlewareManager.use(MIDDLEWARE_TYPE.REQUEST, middleware))
      response?.forEach(middleware => this.middlewareManager.use(MIDDLEWARE_TYPE.RESPONSE, middleware))
    }
  }

  // 合并配置
  private mergeConfig(config: Partial<RequestConfig> & { url: string }): RequestConfig {
    if (!config.url) {
      throw new Error('URL is required')
    }
    return {
      ...this.config,
      ...config,
      retryCount: RETRY_CONFIG.maxRetries
    }
  }

  // 创建请求配置
  private createRequestConfig(
    method: RequestConfig['method'],
    url: string,
    data: any = {},
    options: Partial<RequestConfig> = {}
  ): RequestConfig {
    return {
      url,
      data,
      method,
      ...options
    }
  }

  // 发起请求
  async request<T = any>(options: Partial<RequestConfig> & { url: string }): Promise<Response<T>> {
    const config = this.mergeConfig(options)

    try {
      // 执行请求中间件
      const processedConfig = await this.middlewareManager.runMiddlewareChain(
        MIDDLEWARE_TYPE.REQUEST,
        config
      )
      
      // 发起请求
      const response = await uni.request(processedConfig)
      
      // 执行响应中间件
      return await this.middlewareManager.runMiddlewareChain(MIDDLEWARE_TYPE.RESPONSE, {
        ...response,
        config: processedConfig
      })
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // GET请求
  get<T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}): Promise<Response<T>> {
    return this.request<T>(this.createRequestConfig('GET', url, data, options))
  }

  // POST请求
  post<T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}): Promise<Response<T>> {
    return this.request<T>(this.createRequestConfig('POST', url, data, options))
  }

  // PUT请求
  put<T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}): Promise<Response<T>> {
    return this.request<T>(this.createRequestConfig('PUT', url, data, options))
  }

  // DELETE请求
  delete<T = any>(url: string, data: any = {}, options: Partial<RequestConfig> = {}): Promise<Response<T>> {
    return this.request<T>(this.createRequestConfig('DELETE', url, data, options))
  }
}

// 创建默认请求实例
const request = new Request()

export default request 
