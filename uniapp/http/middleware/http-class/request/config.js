// 基础配置
export const BASE_CONFIG = {
  baseURL: 'https://api.example.com',
  timeout: 10000,
  header: {
    'Content-Type': 'application/json'
  }
}

// 错误码定义
export const ERROR_CODE = {
  SUCCESS: 0,
  TOKEN_EXPIRED: 401,
  TOKEN_INVALID: 403,
  SERVER_ERROR: 500
}

// 请求重试配置
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatus: [408, 500, 502, 503, 504]
}

// Token相关配置
export const TOKEN_CONFIG = {
  tokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  tokenExpireKey: 'token_expire'
} 
