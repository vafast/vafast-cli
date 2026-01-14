/**
 * sync 命令实现
 * 
 * 从服务端拉取契约并生成 TypeScript 类型定义
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { schemaToType } from '../codegen/schema-to-type'

interface SyncOptions {
  url: string
  output: string
  endpoint: string
}

interface RouteContract {
  method: string
  path: string
  name?: string
  description?: string
  schema?: {
    body?: unknown
    query?: unknown
    params?: unknown
  }
}

interface ApiContract {
  version: string
  generatedAt: string
  routes: RouteContract[]
}

/**
 * 同步 API 类型
 */
export async function syncTypes(options: SyncOptions): Promise<void> {
  const { url, output, endpoint } = options
  
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
  
  // 2. 生成类型定义
  const typeContent = generateTypeDefinition(contract)
  
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
function generateTypeDefinition(contract: ApiContract): string {
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
  
  // 构建路由树
  const routeTree = buildRouteTree(contract.routes)
  
  // 生成类型
  lines.push('export type Api = {')
  lines.push(generateRouteTreeType(routeTree, 1))
  lines.push('}')
  lines.push('')
  
  return lines.join('\n')
}

interface RouteTreeNode {
  methods: Map<string, RouteContract>
  children: Map<string, RouteTreeNode>
  isDynamic: boolean
}

/**
 * 构建路由树
 */
function buildRouteTree(routes: RouteContract[]): Map<string, RouteTreeNode> {
  const root = new Map<string, RouteTreeNode>()
  
  for (const route of routes) {
    const segments = route.path.split('/').filter(Boolean)
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
        node.methods.set(route.method.toLowerCase(), route)
      }
      
      current = node.children
    }
  }
  
  return root
}

/**
 * 生成路由树的类型定义
 */
function generateRouteTreeType(tree: Map<string, RouteTreeNode>, indent: number): string {
  const lines: string[] = []
  const pad = '  '.repeat(indent)
  
  for (const [key, node] of tree) {
    // 处理动态参数
    if (key === ':id') {
      lines.push(`${pad}':id': {`)
    } else {
      lines.push(`${pad}${key}: {`)
    }
    
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
function generateMethodType(route: RouteContract): string {
  const parts: string[] = []
  
  // query 类型
  if (route.schema?.query) {
    const queryType = schemaToType(route.schema.query)
    parts.push(`query: ${queryType}`)
  }
  
  // body 类型
  if (route.schema?.body) {
    const bodyType = schemaToType(route.schema.body)
    parts.push(`body: ${bodyType}`)
  }
  
  // params 类型
  if (route.schema?.params) {
    const paramsType = schemaToType(route.schema.params)
    parts.push(`params: ${paramsType}`)
  }
  
  // return 类型（契约中没有返回类型信息，使用 unknown）
  parts.push('return: unknown')
  
  if (parts.length === 1) {
    return `{ ${parts[0]} }`
  }
  
  return `{\n      ${parts.join('\n      ')}\n    }`
}
