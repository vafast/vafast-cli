/**
 * 使用真正的 vafast 框架进行完整测试
 */

import { Server, defineRoute, defineRoutes, Type, serve, getApiSpec } from 'vafast'

// 定义路由
const routeDefinitions = [
  defineRoute({
    method: 'GET',
    path: '/users',
    name: 'get_users',
    description: '获取用户列表',
    schema: {
      query: Type.Object({
        page: Type.Number(),
        limit: Type.Optional(Type.Number()),
      })
    },
    handler: ({ query }) => ({
      users: [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ],
      page: query.page,
      total: 100,
    })
  }),

  defineRoute({
    method: 'POST',
    path: '/users',
    name: 'create_user',
    description: '创建用户',
    schema: {
      body: Type.Object({
        name: Type.String(),
        email: Type.String({ format: 'email' }),
        age: Type.Optional(Type.Number()),
      })
    },
    handler: ({ body }) => ({
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email,
      age: body.age,
    })
  }),

  defineRoute({
    method: 'GET',
    path: '/users/:id',
    name: 'get_user',
    description: '获取用户详情',
    schema: {
      params: Type.Object({
        id: Type.String(),
      })
    },
    handler: ({ params }) => ({
      id: params.id,
      name: 'Test User',
      email: 'test@example.com',
    })
  }),

  defineRoute({
    method: 'DELETE',
    path: '/users/:id',
    name: 'delete_user',
    description: '删除用户',
    schema: {
      params: Type.Object({
        id: Type.String(),
      })
    },
    handler: () => ({ success: true })
  }),

  defineRoute({
    method: 'GET',
    path: '/posts',
    name: 'get_posts',
    description: '获取文章列表',
    schema: {
      query: Type.Object({
        page: Type.Optional(Type.Number()),
        status: Type.Optional(Type.Union([
          Type.Literal('draft'),
          Type.Literal('published'),
          Type.Literal('archived'),
        ])),
      })
    },
    handler: ({ query }) => ({
      posts: [],
      page: query.page ?? 1,
      status: query.status ?? 'all',
    })
  }),

  // SSE 端点：实时聊天流（GET SSE with query）
  defineRoute({
    method: 'GET',
    path: '/chat/stream',
    name: 'chat_stream',
    sse: true,
    description: 'AI 聊天流式响应（SSE）',
    schema: {
      query: Type.Object({
        prompt: Type.String(),
      }),
      response: Type.Object({
        text: Type.String(),
        done: Type.Boolean(),
      }),
    },
    handler: async function* ({ query }) {
      yield { data: { text: `Processing: ${query.prompt}`, done: false } }
      yield { data: { text: 'Thinking...', done: false } }
      yield { data: { text: 'Done!', done: true } }
    },
  }),

  // SSE 端点：任务进度（GET SSE with params）
  defineRoute({
    method: 'GET',
    path: '/tasks/:id/progress',
    name: 'task_progress',
    sse: true,
    description: '获取任务进度（SSE）',
    schema: {
      params: Type.Object({
        id: Type.String(),
      }),
      response: Type.Object({
        progress: Type.Number(),
        status: Type.String(),
      }),
    },
    handler: async function* ({ params }) {
      yield { data: { progress: 0, status: `Task ${params.id} started` } }
      yield { data: { progress: 50, status: 'Processing...' } }
      yield { data: { progress: 100, status: 'Completed' } }
    },
  }),

  // POST SSE 端点：AI 对话（带 body）
  defineRoute({
    method: 'POST',
    path: '/ai/chat',
    name: 'ai_chat',
    sse: true,
    description: 'AI 对话流式响应（POST SSE with body）',
    schema: {
      body: Type.Object({
        messages: Type.Array(Type.Object({
          role: Type.String(),
          content: Type.String(),
        })),
        model: Type.Optional(Type.String()),
      }),
      response: Type.Object({
        content: Type.String(),
        done: Type.Boolean(),
      }),
    },
    handler: async function* ({ body }) {
      const lastMessage = body.messages[body.messages.length - 1]?.content || ''
      yield { data: { content: `收到: ${lastMessage}`, done: false } }
      yield { data: { content: '处理中...', done: false } }
      yield { data: { content: '完成!', done: true } }
    },
  }),
] as const

// 转换为运行时路由（包含 api-spec）
const routes = defineRoutes([
  ...routeDefinitions,
  defineRoute({
    method: 'GET',
    path: '/api-spec',
    handler: () => getApiSpec(),  // 包装调用，无参获取契约
  }),
])

// 创建服务器
const server = new Server(routes)

// 启动
serve({ fetch: server.fetch, port: 3456 }, () => {
  console.log('🚀 Vafast test server running on http://localhost:3456')
  console.log('📄 API Spec: http://localhost:3456/api-spec')
})
