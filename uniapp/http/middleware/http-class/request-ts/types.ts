// 请求配置类型
export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  timeout?: number
  baseURL?: string
  retryCount?: number
}

// 响应数据类型
export interface ResponseData<T = any> {
  code: number
  data: T
  message: string
}

// 响应类型
export interface Response<T = any> {
  statusCode: number
  data: ResponseData<T>
  header: Record<string, string>
  config: RequestConfig
}

// 中间件类型
export type MiddlewareType = 'request' | 'response'

// 中间件函数类型
export type RequestMiddleware = (config: RequestConfig) => Promise<RequestConfig>
export type ResponseMiddleware = (response: Response) => Promise<Response>

// 错误类型
export interface RequestError extends Error {
  response?: Response
  statusCode?: number
  config?: RequestConfig
}

// Token配置类型
export interface TokenConfig {
  tokenKey: string
  refreshTokenKey: string
  tokenExpireKey: string
}

// 基础配置类型
export interface BaseConfig {
  baseURL: string
  timeout: number
  header: Record<string, string>
}

// 重试配置类型
export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  retryableStatus: number[]
}

// 错误码类型
export interface ErrorCode {
  SUCCESS: number
  TOKEN_EXPIRED: number
  TOKEN_INVALID: number
  SERVER_ERROR: number
}

// 请求类配置类型
export interface RequestOptions extends Partial<BaseConfig> {
  middlewares?: {
    request?: RequestMiddleware[]
    response?: ResponseMiddleware[]
  }
}

// 请求方法类型
export interface RequestMethods {
  get: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  post: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  put: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  delete: <T = any>(url: string, data?: any, options?: Partial<RequestConfig>) => Promise<Response<T>>
  request: <T = any>(options: Partial<RequestConfig> & { url: string }) => Promise<Response<T>>
} 
