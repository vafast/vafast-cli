/**
 * sync 命令单元测试
 * 
 * 测试类型生成的各种场景：
 * - 普通 HTTP 方法（GET/POST/PUT/PATCH/DELETE）
 * - SSE 端点（GET/POST/PUT/PATCH/DELETE）
 * - 各种参数类型（body/query/params）
 * - 路由树构建
 * - 前缀剥离
 */

import { describe, it, expect } from 'vitest'
import {
  RouteContract,
  ApiContract,
  RouteTreeNode,
  generateMethodSignature,
  generateMethodType,
  buildRouteTree,
  generateRouteTreeType,
  generateClientType,
  generateTypeDefinition,
} from './sync'

describe('sync 命令', () => {
  describe('generateMethodSignature - 方法签名生成', () => {
    describe('普通 HTTP 方法', () => {
      it('GET 请求 - 无参数', () => {
        const route: RouteContract = {
          method: 'GET',
          path: '/users',
        }
        const sig = generateMethodSignature(route, 'get')
        // 所有方法返回 RequestBuilder（支持 await 或 .sse() 链式调用）
        expect(sig).toBe('(config?: RequestConfig) => RequestBuilder<any>')
      })

      it('GET 请求 - 带 query', () => {
        const route: RouteContract = {
          method: 'GET',
          path: '/users',
          schema: {
            query: { type: 'object', properties: { page: { type: 'number' } }, required: ['page'] },
          },
        }
        const sig = generateMethodSignature(route, 'get')
        expect(sig).toBe('(query?: { page: number }, config?: RequestConfig) => RequestBuilder<any>')
      })

      it('POST 请求 - 带 body', () => {
        const route: RouteContract = {
          method: 'POST',
          path: '/users',
          schema: {
            body: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          },
        }
        const sig = generateMethodSignature(route, 'post')
        expect(sig).toBe('(body: { name: string }, config?: RequestConfig) => RequestBuilder<any>')
      })

      it('POST 请求 - 带 body 和 response', () => {
        const route: RouteContract = {
          method: 'POST',
          path: '/users',
          schema: {
            body: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
            response: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          },
        }
        const sig = generateMethodSignature(route, 'post')
        expect(sig).toBe('(body: { name: string }, config?: RequestConfig) => RequestBuilder<{ id: string }>')
      })

      it('DELETE 请求 - 带 body', () => {
        const route: RouteContract = {
          method: 'DELETE',
          path: '/users/batch',
          schema: {
            body: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] },
          },
        }
        const sig = generateMethodSignature(route, 'delete')
        expect(sig).toBe('(body: { ids: string[] }, config?: RequestConfig) => RequestBuilder<any>')
      })
    })

    describe('SSE 端点（链式调用，使用 HTTP method）', () => {
      it('GET SSE - 无参数', () => {
        const route: RouteContract = {
          method: 'GET',
          path: '/events',
          sse: true,
          schema: {
            response: { type: 'object', properties: { data: { type: 'string' } }, required: ['data'] },
          },
        }
        // SSE 端点现在使用普通 HTTP 方法，返回 RequestBuilder
        const sig = generateMethodSignature(route, 'get')
        expect(sig).toBe('(config?: RequestConfig) => RequestBuilder<{ data: string }>')
      })

      it('GET SSE - 带 query', () => {
        const route: RouteContract = {
          method: 'GET',
          path: '/chat/stream',
          sse: true,
          schema: {
            query: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
            response: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
          },
        }
        const sig = generateMethodSignature(route, 'get')
        expect(sig).toBe('(query?: { prompt: string }, config?: RequestConfig) => RequestBuilder<{ text: string }>')
      })

      it('POST SSE - 带 body', () => {
        const route: RouteContract = {
          method: 'POST',
          path: '/ai/chat',
          sse: true,
          schema: {
            body: {
              type: 'object',
              properties: {
                messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } }, required: ['role', 'content'] } },
              },
              required: ['messages'],
            },
            response: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] },
          },
        }
        const sig = generateMethodSignature(route, 'post')
        expect(sig).toContain('body: { messages: { role: string; content: string }[] }')
        expect(sig).toContain('config?: RequestConfig')
        expect(sig).toContain('RequestBuilder<{ content: string }>')
      })

      it('DELETE SSE - 带 body（批量删除进度）', () => {
        const route: RouteContract = {
          method: 'DELETE',
          path: '/files/batch',
          sse: true,
          schema: {
            body: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] },
            response: { type: 'object', properties: { deleted: { type: 'number' }, total: { type: 'number' } }, required: ['deleted', 'total'] },
          },
        }
        const sig = generateMethodSignature(route, 'delete')
        expect(sig).toContain('body: { ids: string[] }')
        expect(sig).toContain('RequestBuilder<{ deleted: number; total: number }>')
      })

      it('PUT SSE - 带 body（批量更新进度）', () => {
        const route: RouteContract = {
          method: 'PUT',
          path: '/items/batch',
          sse: true,
          schema: {
            body: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, value: { type: 'string' } } } } }, required: ['items'] },
            response: { type: 'object', properties: { updated: { type: 'number' } }, required: ['updated'] },
          },
        }
        const sig = generateMethodSignature(route, 'put')
        expect(sig).toContain('body:')
        expect(sig).toContain('RequestBuilder<{ updated: number }>')
      })

      it('PATCH SSE - 带 body', () => {
        const route: RouteContract = {
          method: 'PATCH',
          path: '/config/batch',
          sse: true,
          schema: {
            body: { type: 'object', properties: { changes: { type: 'array', items: { type: 'object' } } }, required: ['changes'] },
            response: { type: 'object', properties: { patched: { type: 'number' } }, required: ['patched'] },
          },
        }
        const sig = generateMethodSignature(route, 'patch')
        expect(sig).toContain('body:')
        expect(sig).toContain('RequestBuilder<{ patched: number }>')
      })
    })
  })

  describe('generateMethodType - 方法类型生成', () => {
    it('只有 return 类型', () => {
      const route: RouteContract = {
        method: 'GET',
        path: '/users',
      }
      expect(generateMethodType(route)).toBe('{ return: any }')
    })

    it('带 query 类型', () => {
      const route: RouteContract = {
        method: 'GET',
        path: '/users',
        schema: {
          query: { type: 'object', properties: { page: { type: 'number' } }, required: ['page'] },
        },
      }
      const type = generateMethodType(route)
      expect(type).toContain('query: { page: number }')
      expect(type).toContain('return: any')
    })

    it('带 body 类型', () => {
      const route: RouteContract = {
        method: 'POST',
        path: '/users',
        schema: {
          body: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
        },
      }
      const type = generateMethodType(route)
      expect(type).toContain('body: { name: string }')
    })

    it('带 params 类型', () => {
      const route: RouteContract = {
        method: 'GET',
        path: '/users/:id',
        schema: {
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        },
      }
      const type = generateMethodType(route)
      expect(type).toContain('params: { id: string }')
    })

    it('带 response 类型', () => {
      const route: RouteContract = {
        method: 'GET',
        path: '/users',
        schema: {
          response: { type: 'object', properties: { users: { type: 'array', items: { type: 'object' } } }, required: ['users'] },
        },
      }
      const type = generateMethodType(route)
      expect(type).toContain('return: { users: Record<string, unknown>[] }')
    })

    it('SSE 端点 - 带 body（POST SSE）', () => {
      const route: RouteContract = {
        method: 'POST',
        path: '/ai/chat',
        sse: true,
        schema: {
          body: { type: 'object', properties: { messages: { type: 'array', items: { type: 'string' } } }, required: ['messages'] },
          response: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] },
        },
      }
      const type = generateMethodType(route)
      expect(type).toContain('body: { messages: string[] }')
      expect(type).toContain('return: { content: string }')
    })

    it('完整类型（query + body + params + response）', () => {
      const route: RouteContract = {
        method: 'PUT',
        path: '/users/:id',
        schema: {
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          query: { type: 'object', properties: { force: { type: 'boolean' } } },
          body: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          response: { type: 'object', properties: { success: { type: 'boolean' } }, required: ['success'] },
        },
      }
      const type = generateMethodType(route)
      expect(type).toContain('query: { force?: boolean }')
      expect(type).toContain('body: { name: string }')
      expect(type).toContain('params: { id: string }')
      expect(type).toContain('return: { success: boolean }')
    })
  })

  describe('buildRouteTree - 路由树构建', () => {
    it('单层路由', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/users' },
      ]
      const tree = buildRouteTree(routes)

      expect(tree.has('users')).toBe(true)
      const usersNode = tree.get('users')!
      expect(usersNode.methods.has('get')).toBe(true)
      expect(usersNode.methods.has('post')).toBe(true)
    })

    it('嵌套路由', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users/:id' },
        { method: 'DELETE', path: '/users/:id' },
      ]
      const tree = buildRouteTree(routes)

      expect(tree.has('users')).toBe(true)
      const usersNode = tree.get('users')!
      expect(usersNode.children.has(':id')).toBe(true)

      const idNode = usersNode.children.get(':id')!
      expect(idNode.isDynamic).toBe(true)
      expect(idNode.methods.has('get')).toBe(true)
      expect(idNode.methods.has('delete')).toBe(true)
    })

    it('多层嵌套路由', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users/:userId/posts/:postId' },
      ]
      const tree = buildRouteTree(routes)

      const usersNode = tree.get('users')!
      const userIdNode = usersNode.children.get(':id')!
      const postsNode = userIdNode.children.get('posts')!
      const postIdNode = postsNode.children.get(':id')!

      expect(postIdNode.methods.has('get')).toBe(true)
    })

    it('前缀剥离', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/api/v1/users' },
        { method: 'POST', path: '/api/v1/users' },
      ]
      const tree = buildRouteTree(routes, '/api/v1')

      expect(tree.has('users')).toBe(true)
      expect(tree.has('api')).toBe(false)
    })

    it('前缀剥离 - 带斜杠', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/billingRestfulApi/users' },
      ]
      const tree = buildRouteTree(routes, 'billingRestfulApi/')

      expect(tree.has('users')).toBe(true)
      expect(tree.has('billingRestfulApi')).toBe(false)
    })

    it('SSE 端点使用实际 HTTP 方法名（链式调用）', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/events', sse: true },
        { method: 'POST', path: '/chat', sse: true },
      ]
      const tree = buildRouteTree(routes)

      const eventsNode = tree.get('events')!
      // SSE 现在使用实际的 HTTP 方法，支持 .get().sse() 链式调用
      expect(eventsNode.methods.has('get')).toBe(true)
      expect(eventsNode.methods.has('sse')).toBe(false)

      const chatNode = tree.get('chat')!
      expect(chatNode.methods.has('post')).toBe(true)
      expect(chatNode.methods.has('sse')).toBe(false)
    })

    it('同一路径的普通和 SSE 端点', () => {
      const routes: RouteContract[] = [
        { method: 'POST', path: '/chat' },
        { method: 'POST', path: '/chat/stream', sse: true },
      ]
      const tree = buildRouteTree(routes)

      const chatNode = tree.get('chat')!
      expect(chatNode.methods.has('post')).toBe(true)

      const streamNode = chatNode.children.get('stream')!
      // SSE 使用实际的 HTTP 方法
      expect(streamNode.methods.has('post')).toBe(true)
    })
  })

  describe('generateRouteTreeType - 路由树类型生成', () => {
    it('简单路由', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users', schema: { response: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },
      ]
      const tree = buildRouteTree(routes)
      const type = generateRouteTreeType(tree, 1)

      expect(type).toContain('users:')
      expect(type).toContain('get:')
      expect(type).toContain('return: { id: string }')
    })

    it('特殊属性名需要引号', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users/:id' },
      ]
      const tree = buildRouteTree(routes)
      const type = generateRouteTreeType(tree, 1)

      expect(type).toContain("':id':")
    })

    it('包含描述注释', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users', description: '获取用户列表' },
      ]
      const tree = buildRouteTree(routes)
      const type = generateRouteTreeType(tree, 1)

      expect(type).toContain('/** 获取用户列表 */')
    })
  })

  describe('generateClientType - 客户端类型生成', () => {
    it('普通 GET 方法签名', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users' },
      ]
      const tree = buildRouteTree(routes)
      const type = generateClientType(tree, 1)

      expect(type).toContain('users:')
      // 所有方法返回 RequestBuilder（支持链式 .sse() 调用）
      expect(type).toContain('get: (config?: RequestConfig) => RequestBuilder<any>')
    })

    it('SSE 方法签名（链式调用）', () => {
      const routes: RouteContract[] = [
        {
          method: 'GET',
          path: '/events',
          sse: true,
          schema: { response: { type: 'object', properties: { data: { type: 'string' } }, required: ['data'] } },
        },
      ]
      const tree = buildRouteTree(routes)
      const type = generateClientType(tree, 1)

      expect(type).toContain('events:')
      // SSE 端点使用实际的 HTTP 方法，返回 RequestBuilder
      expect(type).toContain('get: (config?: RequestConfig) => RequestBuilder<{ data: string }>')
    })
  })

  describe('generateTypeDefinition - 完整类型定义生成', () => {
    it('无 SSE 路由不生成 SSECallbacks', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [
          { method: 'GET', path: '/users' },
        ],
      }
      const content = generateTypeDefinition(contract)

      // 无 SSE 路由时也使用 RequestBuilder（所有方法都返回 RequestBuilder）
      expect(content).toContain('RequestBuilder')
      expect(content).toContain("import type { RequestConfig, Client, EdenClient, RequestBuilder } from '@vafast/api-client'")
    })

    it('有 SSE 路由使用 RequestBuilder 链式调用', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [
          { method: 'GET', path: '/events', sse: true },
        ],
      }
      const content = generateTypeDefinition(contract)

      // SSE 通过链式调用实现：.get().sse()
      // 所有方法返回 RequestBuilder
      expect(content).toContain('RequestBuilder')
      expect(content).toContain("import type { RequestConfig, Client, EdenClient, RequestBuilder } from '@vafast/api-client'")
      // 不再生成独立的 SSECallbacks 接口（从 @vafast/api-client 导出）
    })

    it('生成 Api 类型', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [
          { method: 'GET', path: '/users' },
        ],
      }
      const content = generateTypeDefinition(contract)

      expect(content).toContain('export type Api = {')
    })

    it('生成 ApiClient 接口', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [
          { method: 'GET', path: '/users' },
        ],
      }
      const content = generateTypeDefinition(contract)

      expect(content).toContain('export interface ApiClient {')
    })

    it('生成 createApiClient 工厂函数', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [
          { method: 'GET', path: '/users' },
        ],
      }
      const content = generateTypeDefinition(contract)

      expect(content).toContain('export function createApiClient(client: Client): EdenClient<Api>')
      expect(content).toContain('return eden<Api>(client)')
    })

    it('前缀剥离', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [
          { method: 'GET', path: '/api/v1/users' },
        ],
      }
      const content = generateTypeDefinition(contract, '/api/v1')

      expect(content).toContain('users:')
      expect(content).not.toContain('api:')
      expect(content).not.toContain('v1:')
    })

    it('复杂 API 契约', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [
          { method: 'GET', path: '/users', description: '获取用户列表', schema: { query: { type: 'object', properties: { page: { type: 'number' } } } } },
          { method: 'POST', path: '/users', description: '创建用户', schema: { body: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } },
          { method: 'GET', path: '/users/:id', description: '获取用户详情', schema: { params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },
          { method: 'DELETE', path: '/users/:id', description: '删除用户' },
          { method: 'GET', path: '/chat/stream', sse: true, description: 'AI 聊天', schema: { query: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } } },
          { method: 'POST', path: '/ai/chat', sse: true, description: 'AI 对话', schema: { body: { type: 'object', properties: { messages: { type: 'array', items: { type: 'string' } } }, required: ['messages'] } } },
        ],
      }
      const content = generateTypeDefinition(contract)

      // 验证结构
      expect(content).toContain('users:')
      expect(content).toContain("':id':")
      expect(content).toContain('chat:')
      expect(content).toContain('stream:')
      expect(content).toContain('ai:')

      // 验证方法（SSE 现在使用实际 HTTP 方法，所以都是 get/post 等）
      expect(content).toContain('get:')
      expect(content).toContain('post:')
      expect(content).toContain('delete:')
      // SSE 端点现在使用实际的 HTTP 方法，不再有独立的 sse: 方法

      // 验证注释
      expect(content).toContain('/** 获取用户列表 */')
      expect(content).toContain('/** 创建用户 */')
      expect(content).toContain('/** AI 聊天 */')
      expect(content).toContain('/** AI 对话 */')

      // 验证 RequestBuilder 类型（用于链式调用 .sse()）
      expect(content).toContain('RequestBuilder')
    })
  })

  describe('边界情况', () => {
    it('空路由列表', () => {
      const contract: ApiContract = {
        version: '1.0.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        routes: [],
      }
      const content = generateTypeDefinition(contract)

      expect(content).toContain('export type Api = {')
      expect(content).toContain('}')
    })

    it('根路径路由被跳过', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/' },
      ]
      const tree = buildRouteTree(routes)

      expect(tree.size).toBe(0)
    })

    it('只有前缀的路由被跳过', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/api/v1' },
      ]
      const tree = buildRouteTree(routes, '/api/v1')

      expect(tree.size).toBe(0)
    })

    it('动态参数统一为 :id', () => {
      const routes: RouteContract[] = [
        { method: 'GET', path: '/users/:userId' },
        { method: 'GET', path: '/posts/:postId' },
      ]
      const tree = buildRouteTree(routes)

      const usersNode = tree.get('users')!
      const postsNode = tree.get('posts')!

      expect(usersNode.children.has(':id')).toBe(true)
      expect(usersNode.children.has(':userId')).toBe(false)
      expect(postsNode.children.has(':id')).toBe(true)
      expect(postsNode.children.has(':postId')).toBe(false)
    })

    it('复杂嵌套枚举类型', () => {
      const route: RouteContract = {
        method: 'GET',
        path: '/users',
        schema: {
          query: {
            type: 'object',
            properties: {
              status: { enum: ['active', 'inactive', 'pending'] },
              role: { enum: ['admin', 'user', 'guest'] },
            },
          },
        },
      }
      const type = generateMethodType(route)

      expect(type).toContain('"active" | "inactive" | "pending"')
      expect(type).toContain('"admin" | "user" | "guest"')
    })
  })
})
