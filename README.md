# @vafast/cli

Vafast CLI 工具，提供 API 类型同步等功能。

## 安装

```bash
npm install -D @vafast/cli
```

## 命令

### `vafast sync` - 同步 API 类型

从服务端获取 API 契约，生成 TypeScript 类型定义文件。

```bash
# 基本用法
npx vafast sync --url http://localhost:3000

# 指定输出文件
npx vafast sync --url http://localhost:3000 --out src/types/api.ts

# 指定契约端点（默认 /__contract__）
npx vafast sync --url http://localhost:3000 --endpoint /api/contract
```

#### 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--url <url>` | 服务端地址（必填） | - |
| `--out <path>` | 输出文件路径 | `src/api.generated.ts` |
| `--endpoint <path>` | 契约接口路径 | `/__contract__` |
| `--strip-prefix <prefix>` | 去掉路径前缀 | - |

**示例：**

```bash
# 去掉 /restfulApi 前缀
npx vafast sync \
  --url http://localhost:9002 \
  --endpoint /restfulApi/api-spec \
  --out src/types/api/ones.generated.ts \
  --strip-prefix /restfulApi
```

## 工作流程

### 1. 服务端配置

在 vafast 服务端暴露契约接口：

```typescript
import { defineRoutes, createContractHandler } from 'vafast'

const routes = defineRoutes([
  // 你的路由定义...
])

// 添加契约接口
const allRoutes = [
  ...routes,
  {
    method: 'GET',
    path: '/__contract__',
    handler: createContractHandler(routes)
  }
]
```

### 2. 客户端同步

```bash
npx vafast sync --url http://localhost:3000
```

### 3. 使用生成的类型

```typescript
import { createClient } from '@vafast/api-client'
import { createApiClient } from './api.generated'

// 创建底层客户端
const client = createClient({
  baseURL: 'http://localhost:3000',
  timeout: 30000
})

// 创建类型安全的 API 客户端
const api = createApiClient(client)

// 类型安全的调用（错误路径会被 TypeScript 检测）
const { data, error } = await api.users.get({ page: 1 })

// ❌ TypeScript 会报错
// api.nonExistent.get()  // Error: Property 'nonExistent' does not exist
```

## 自动化

在 `package.json` 中配置脚本：

```json
{
  "scripts": {
    "sync:auth": "vafast sync --url http://localhost:9003 --endpoint /authRestfulApi/api-spec --out src/types/api/auth.generated.ts --strip-prefix /authRestfulApi",
    "sync:ones": "vafast sync --url http://localhost:9002 --endpoint /restfulApi/api-spec --out src/types/api/ones.generated.ts --strip-prefix /restfulApi",
    "sync:billing": "vafast sync --url http://localhost:9004 --endpoint /billingRestfulApi/api-spec --out src/types/api/billing.generated.ts --strip-prefix /billingRestfulApi",
    "sync:types": "npm run sync:auth && npm run sync:billing && npm run sync:ones",
    "dev": "vite",
    "build": "npm run sync:types && vite build"
  }
}
```

## 生成的类型示例

输入契约：

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/users",
      "schema": { "query": { "type": "object", "properties": { "page": { "type": "number" } } } }
    },
    {
      "method": "POST",
      "path": "/users",
      "schema": { "body": { "type": "object", "properties": { "name": { "type": "string" } } } }
    }
  ]
}
```

生成的类型：

```typescript
import type { ApiResponse, RequestConfig, Client, EdenClient } from '@vafast/api-client'
import { eden } from '@vafast/api-client'

/** API 契约类型 */
export type Api = {
  users: {
    get: {
      query: { page?: number }
      return: any
    }
    post: {
      body: { name?: string }
      return: any
    }
  }
}

/** API 客户端类型别名 */
export type ApiClientType = EdenClient<Api>

/**
 * 创建类型安全的 API 客户端
 */
export function createApiClient(client: Client): EdenClient<Api> {
  return eden<Api>(client)
}
```

**使用方式：**

```typescript
import { createClient } from '@vafast/api-client'
import { createApiClient } from './api.generated'

const client = createClient({ baseURL: '/api', timeout: 30000 })
const api = createApiClient(client)

// 完整的类型安全
const { data, error } = await api.users.post({ name: 'John' })
```

## 注意事项

1. **返回类型**：如果后端未定义 `response` schema，生成的返回类型为 `any`（渐进式类型安全）。建议后端添加 `response` schema 获得完整类型检查。

2. **服务器必须运行**：执行 `sync` 命令时，服务端必须在运行并暴露契约接口。

3. **不要手动修改**：生成的文件会被覆盖，请勿手动修改。

4. **类型安全**：生成的 `createApiClient` 返回 `EdenClient<Api>`，TypeScript 会检测错误的 API 路径。

## License

MIT
