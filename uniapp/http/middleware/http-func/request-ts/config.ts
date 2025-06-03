import { BaseConfig, ErrorCode, RetryConfig, TokenConfig } from './types'

// 基础配置
export const BASE_CONFIG: BaseConfig = {
  baseURL: 'https://api.example.com',
  timeout: 10000,
  header: {
    'Content-Type': 'application/json'
  }
}

// 错误码定义
export const ERROR_CODE: ErrorCode = {
  SUCCESS: 0,
  TOKEN_EXPIRED: 401,
  TOKEN_INVALID: 403,
  SERVER_ERROR: 500
}

// 请求重试配置
export const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatus: [408, 500, 502, 503, 504]
}

// Token相关配置
export const TOKEN_CONFIG: TokenConfig = {
  tokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  tokenExpireKey: 'token_expire'
}

// 中间件类型
export const MIDDLEWARE_TYPE = {
  REQUEST: 'request' as const,
  RESPONSE: 'response' as const
} 
