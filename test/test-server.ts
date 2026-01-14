/**
 * 使用真正的 vafast 框架进行完整测试
 */

import { Server, defineRoute, defineRoutes, Type, serve, createContractHandler } from 'vafast'

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
] as const

// 转换为运行时路由
const routes = defineRoutes(routeDefinitions)

// 添加契约接口
const allRoutes = [
  ...routes,
  {
    method: 'GET' as const,
    path: '/__contract__',
    handler: createContractHandler(routeDefinitions),
  }
]

// 创建服务器
const server = new Server(allRoutes)

// 启动
serve({ fetch: server.fetch, port: 3456 }, () => {
  console.log('🚀 Vafast test server running on http://localhost:3456')
  console.log('📄 Contract: http://localhost:3456/__contract__')
})
