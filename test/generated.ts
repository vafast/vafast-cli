/**
 * 自动生成的 API 类型定义
 * 生成时间: 2026-02-04T09:48:05.127Z
 * 版本: 1.0.0
 * 
 * ⚠️ 请勿手动修改此文件，使用 `vafast sync` 重新生成
 */

import type { ApiResponse, RequestConfig, Client, EdenClient, SSESubscription, SSESubscribeOptions } from '@vafast/api-client'
import { eden } from '@vafast/api-client'

/** SSE 回调接口 */
interface SSECallbacks<T> {
  onMessage: (data: T) => void
  onError?: (error: { code: number; message: string }) => void
  onOpen?: () => void
  onClose?: () => void
  onReconnect?: (attempt: number, maxAttempts: number) => void
  onMaxReconnects?: () => void
}

/** API 契约类型 */
export type Api = {
  users: {
    /** 获取用户列表 */
    get: {
      query: { page: number; limit?: number }
      return: any
    }
    /** 创建用户 */
    post: {
      body: { name: string; email: string; age?: number }
      return: any
    }
    ':id': {
      /** 获取用户详情 */
      get: {
      params: { id: string }
      return: any
    }
      /** 删除用户 */
      delete: {
      params: { id: string }
      return: any
    }
    }
  }
  posts: {
    /** 获取文章列表 */
    get: {
      query: { page?: number; status?: "draft" | "published" | "archived" }
      return: any
    }
  }
  chat: {
    stream: {
      /** AI 聊天流式响应（SSE） */
      sse: {
      query: { prompt: string }
      return: { text: string; done: boolean }
    }
    }
  }
  tasks: {
    ':id': {
      progress: {
        /** 获取任务进度（SSE） */
        sse: {
      params: { id: string }
      return: { progress: number; status: string }
    }
      }
    }
  }
  ai: {
    chat: {
      /** AI 对话流式响应（POST SSE with body） */
      sse: {
      body: { messages: { role: string; content: string }[]; model?: string }
      return: { content: string; done: boolean }
    }
    }
  }
}

/** API 客户端类型（提供完整的 IDE 智能提示） */
export interface ApiClient {
  users: {
    /** 获取用户列表 */
    get: (query?: { page: number; limit?: number }, config?: RequestConfig) => Promise<ApiResponse<any>>
    /** 创建用户 */
    post: (body: { name: string; email: string; age?: number }, config?: RequestConfig) => Promise<ApiResponse<any>>
    ':id': {
      /** 获取用户详情 */
      get: (config?: RequestConfig) => Promise<ApiResponse<any>>
      /** 删除用户 */
      delete: (config?: RequestConfig) => Promise<ApiResponse<any>>
    }
  }
  posts: {
    /** 获取文章列表 */
    get: (query?: { page?: number; status?: "draft" | "published" | "archived" }, config?: RequestConfig) => Promise<ApiResponse<any>>
  }
  chat: {
    stream: {
      /** AI 聊天流式响应（SSE） */
      sse: (query: { prompt: string }, callbacks: SSECallbacks<{ text: string; done: boolean }>, options?: SSESubscribeOptions) => SSESubscription<{ text: string; done: boolean }>
    }
  }
  tasks: {
    ':id': {
      progress: {
        /** 获取任务进度（SSE） */
        sse: (callbacks: SSECallbacks<{ progress: number; status: string }>, options?: SSESubscribeOptions) => SSESubscription<{ progress: number; status: string }>
      }
    }
  }
  ai: {
    chat: {
      /** AI 对话流式响应（POST SSE with body） */
      sse: (body: { messages: { role: string; content: string }[]; model?: string }, callbacks: SSECallbacks<{ content: string; done: boolean }>, options?: SSESubscribeOptions) => SSESubscription<{ content: string; done: boolean }>
    }
  }
}

/** API 客户端类型别名（基于 EdenClient 推断，提供完整类型检查） */
export type ApiClientType = EdenClient<Api>

/**
 * 创建类型安全的 API 客户端
 * 
 * @example
 * ```typescript
 * import { createClient } from '@vafast/api-client'
 * import { createApiClient } from './api.generated'
 * 
 * const client = createClient('/api').use(authMiddleware)
 * const api = createApiClient(client)
 * 
 * // 完整的 IDE 智能提示和类型检查
 * const { data, error } = await api.users.find.post({ current: 1, pageSize: 10 })
 * // ❌ 错误路径会被 TypeScript 检测到
 * // api.nonExistent.post() // Error: Property 'nonExistent' does not exist
 * ```
 */
export function createApiClient(client: Client): EdenClient<Api> {
  return eden<Api>(client)
}
