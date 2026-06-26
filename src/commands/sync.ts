/**
 * sync 命令实现
 * 
 * 从服务端拉取契约并生成 TypeScript 类型定义
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { schemaToType } from '../codegen/schema-to-type'

export interface SyncOptions {
  url: string
  output: string
  endpoint: string
  stripPrefix?: string
}

export interface RouteContract {
  method: string
  path: string
  name?: string
  description?: string
  /** 是否为 SSE 端点 */
  sse?: boolean
  schema?: {
    body?: unknown
    query?: unknown
    params?: unknown
    response?: unknown
  }
}

export interface ApiContract {
  version: string
  generatedAt: string
  routes: RouteContract[]
}

/**
 * 同步 API 类型
 */
export async function syncTypes(options: SyncOptions): Promise<void> {
  const { url, output, endpoint, stripPrefix } = options

  console.log(`🔄 正在从 ${url}${endpoint} 获取契约...`)

  // 1. 获取契约
  const contractUrl = new URL(endpoint, url).toString()

  let contract: ApiContract
  try {
    const response = await fetch(contractUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    contract = await response.json() as ApiContract
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error(`❌ 获取契约失败: ${err.message}`)
    process.exit(1)
  }

  console.log(`✅ 获取到 ${contract.routes.length} 个路由`)

  if (stripPrefix) {
    console.log(`🔧 去掉路径前缀: ${stripPrefix}`)
  }

  // 2. 生成类型定义
  const typeContent = generateTypeDefinition(contract, stripPrefix)

  // 3. 写入文件
  const outputDir = dirname(output)
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(output, typeContent, 'utf-8')

  console.log(`✅ 类型定义已生成: ${output}`)
  console.log('')
  console.log('📝 使用方式:')
  console.log(`   import { eden } from '@vafast/api-client'`)
  console.log(`   import type { Api } from './${output.replace(/\.ts$/, '')}'`)
  console.log(`   const api = eden<Api>('${url}')`)
}

/**
 * 生成类型定义文件内容
 */
export function generateTypeDefinition(contract: ApiContract, stripPrefix?: string): string {
  const lines: string[] = []

  // 文件头
  lines.push('/**')
  lines.push(' * 自动生成的 API 类型定义')
  lines.push(` * 生成时间: ${contract.generatedAt}`)
  lines.push(` * 版本: ${contract.version}`)
  lines.push(' * ')
  lines.push(' * ⚠️ 请勿手动修改此文件，使用 `vafast sync` 重新生成')
  lines.push(' */')
  lines.push('')

  // 导入类型
  // RequestBuilder 用于所有 HTTP 方法（支持 await 或 .sse() 链式调用）
  lines.push('import type { RequestConfig, Client, EdenClient, RequestBuilder } from \'@vafast/api-client\'')
  lines.push('import { eden } from \'@vafast/api-client\'')
  lines.push('')

  // 构建路由树
  const routeTree = buildRouteTree(contract.routes, stripPrefix)

  // 生成契约类型（给 eden 内部用）
  lines.push('/** API 契约类型 */')
  lines.push('export type Api = {')
  lines.push(generateRouteTreeType(routeTree, 1))
  lines.push('}')
  lines.push('')

  // 生成客户端接口类型（给 IDE 提示用）
  lines.push('/** API 客户端类型（提供完整的 IDE 智能提示） */')
  lines.push('export interface ApiClient {')
  lines.push(generateClientType(routeTree, 1))
  lines.push('}')
  lines.push('')

  // 生成类型别名（使用 EdenClient 推断，提供完整类型安全）
  lines.push('/** API 客户端类型别名（基于 EdenClient 推断，提供完整类型检查） */')
  lines.push('export type ApiClientType = EdenClient<Api>')
  lines.push('')

  // 生成工厂函数
  lines.push('/**')
  lines.push(' * 创建类型安全的 API 客户端')
  lines.push(' * ')
  lines.push(' * @example')
  lines.push(' * ```typescript')
  lines.push(' * import { createClient } from \'@vafast/api-client\'')
  lines.push(' * import { createApiClient } from \'./api.generated\'')
  lines.push(' * ')
  lines.push(' * const client = createClient(\'/api\').use(authMiddleware)')
  lines.push(' * const api = createApiClient(client)')
  lines.push(' * ')
  lines.push(' * // 完整的 IDE 智能提示和类型检查')
  lines.push(' * const { data, error } = await api.users.find.post({ current: 1, pageSize: 10 })')
  lines.push(' * // ❌ 错误路径会被 TypeScript 检测到')
  lines.push(' * // api.nonExistent.post() // Error: Property \'nonExistent\' does not exist')
  lines.push(' * ```')
  lines.push(' */')
  lines.push('export function createApiClient(client: Client): EdenClient<Api> {')
  lines.push('  return eden<Api>(client)')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

/**
 * 生成客户端接口类型（带完整方法签名，IDE 友好）
 */
export function generateClientType(tree: Map<string, RouteTreeNode>, indent: number): string {
  const lines: string[] = []
  const pad = '  '.repeat(indent)

  for (const [key, node] of tree) {
    const needsQuotes = /[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key)
    const propName = needsQuotes ? `'${key}'` : key
    lines.push(`${pad}${propName}: {`)

    // 添加方法签名
    for (const [method, route] of node.methods) {
      if (route.description) {
        lines.push(`${pad}  /** ${route.description} */`)
      }

      const methodSig = generateMethodSignature(route, method)
      lines.push(`${pad}  ${method}: ${methodSig}`)
    }

    // 递归处理子节点
    if (node.children.size > 0) {
      const childContent = generateClientType(node.children, indent + 1)
      if (childContent) {
        lines.push(childContent)
      }
    }

    lines.push(`${pad}}`)
  }

  return lines.join('\n')
}

/**
 * body schema 是否无必填字段（调用方可省略 body 参数）
 */
function isBodyParamOptional(bodySchema: unknown): boolean {
  if (!bodySchema || typeof bodySchema !== 'object') {
    return false
  }
  const schema = bodySchema as { type?: string; properties?: Record<string, unknown>; required?: string[] }
  if (schema.type !== 'object' && !schema.properties) {
    return false
  }
  const required = schema.required
  return !Array.isArray(required) || required.length === 0
}

/**
 * 生成方法签名（函数类型）
 */
export function generateMethodSignature(route: RouteContract, method: string): string {
  const params: string[] = []

  // 返回类型
  const returnType = route.schema?.response
    ? schemaToType(route.schema.response)
    : 'any'

  // SSE 端点：使用链式调用 .method().sse()
  // SSE 端点生成普通 HTTP 方法签名，返回 RequestBuilder（支持 .sse()）
  // 不再生成独立的 SSE 签名

  // 普通 HTTP 方法
  // body 参数（POST/PUT/PATCH/DELETE）
  if (route.schema?.body) {
    const bodyType = schemaToType(route.schema.body)
    const bodyOptional = isBodyParamOptional(route.schema.body)
    params.push(bodyOptional ? `body?: ${bodyType}` : `body: ${bodyType}`)
  }

  // query 参数（GET）
  if (route.schema?.query) {
    const queryType = schemaToType(route.schema.query)
    params.push(`query?: ${queryType}`)
  }

  // config 参数（可选）
  params.push('config?: RequestConfig')

  // 返回 RequestBuilder（支持 await 或 .sse() 链式调用）
  return `(${params.join(', ')}) => RequestBuilder<${returnType}>`
}

export interface RouteTreeNode {
  methods: Map<string, RouteContract>
  children: Map<string, RouteTreeNode>
  isDynamic: boolean
}

/**
 * 构建路由树
 */
export function buildRouteTree(routes: RouteContract[], stripPrefix?: string): Map<string, RouteTreeNode> {
  const root = new Map<string, RouteTreeNode>()

  // 规范化前缀（确保以 / 开头，不以 / 结尾）
  const normalizedPrefix = stripPrefix
    ? '/' + stripPrefix.replace(/^\/+|\/+$/g, '')
    : undefined

  for (const route of routes) {
    // 去掉前缀
    let path = route.path
    if (normalizedPrefix && path.startsWith(normalizedPrefix)) {
      path = path.slice(normalizedPrefix.length) || '/'
    }

    const segments = path.split('/').filter(Boolean)

    // 如果去掉前缀后没有路径段，跳过（通常是根路径）
    if (segments.length === 0) {
      continue
    }

    let current = root

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const isDynamic = segment.startsWith(':')
      const key = isDynamic ? ':id' : segment

      if (!current.has(key)) {
        current.set(key, {
          methods: new Map(),
          children: new Map(),
          isDynamic,
        })
      }

      const node = current.get(key)!

      // 最后一段，添加方法
      if (i === segments.length - 1) {
        // SSE 端点使用实际的 HTTP method（链式调用：.post().sse()）
        const methodName = route.method.toLowerCase()
        node.methods.set(methodName, route)
      }

      current = node.children
    }
  }

  return root
}

/**
 * 生成路由树的类型定义
 */
export function generateRouteTreeType(tree: Map<string, RouteTreeNode>, indent: number): string {
  const lines: string[] = []
  const pad = '  '.repeat(indent)

  for (const [key, node] of tree) {
    // 判断属性名是否需要引号（包含特殊字符或以数字开头）
    const needsQuotes = /[^a-zA-Z0-9_$]/.test(key) || /^\d/.test(key)
    const propName = needsQuotes ? `'${key}'` : key
    lines.push(`${pad}${propName}: {`)

    // 添加方法
    for (const [method, route] of node.methods) {
      const methodType = generateMethodType(route)

      // 添加注释
      if (route.description) {
        lines.push(`${pad}  /** ${route.description} */`)
      }

      lines.push(`${pad}  ${method}: ${methodType}`)
    }

    // 递归处理子节点
    if (node.children.size > 0) {
      const childContent = generateRouteTreeType(node.children, indent + 1)
      if (childContent) {
        lines.push(childContent)
      }
    }

    lines.push(`${pad}}`)
  }

  return lines.join('\n')
}

/**
 * 生成方法类型
 */
export function generateMethodType(route: RouteContract): string {
  const parts: string[] = []

  // query 类型
  if (route.schema?.query) {
    const queryType = schemaToType(route.schema.query)
    parts.push(`query: ${queryType}`)
  }

  // body 类型（SSE 端点也支持 body）
  if (route.schema?.body) {
    const bodyType = schemaToType(route.schema.body)
    parts.push(`body: ${bodyType}`)
  }

  // params 类型
  if (route.schema?.params) {
    const paramsType = schemaToType(route.schema.params)
    parts.push(`params: ${paramsType}`)
  }

  // return 类型：优先使用 response schema，否则使用 any（渐进式类型安全）
  if (route.schema?.response) {
    const responseType = schemaToType(route.schema.response)
    parts.push(`return: ${responseType}`)
  } else {
    // 使用 any 而非 unknown，方便渐进式迁移
    // 用户可以先完成迁移，再逐步添加 response schema 获得完整类型安全
    parts.push('return: any')
  }

  if (parts.length === 1) {
    return `{ ${parts[0]} }`
  }

  return `{\n      ${parts.join('\n      ')}\n    }`
}
