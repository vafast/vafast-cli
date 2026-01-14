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
import { eden } from '@vafast/api-client'
import type { Api } from './api.generated'

const api = eden<Api>('http://localhost:3000')

// 类型安全的调用
const { data, error } = await api.users.get({ page: 1 })
```

## 自动化

在 `package.json` 中配置脚本：

```json
{
  "scripts": {
    "sync": "vafast sync --url $API_URL",
    "dev": "npm run sync && vite",
    "build": "npm run sync && vite build"
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
export type Api = {
  users: {
    get: {
      query: { page?: number }
      return: unknown
    }
    post: {
      body: { name?: string }
      return: unknown
    }
  }
}
```

## 注意事项

1. **返回类型**：当前契约不包含返回类型信息，生成的类型中返回值为 `unknown`。如需完整类型推断，建议使用 monorepo 共享路由定义。

2. **服务器必须运行**：执行 `sync` 命令时，服务端必须在运行并暴露契约接口。

3. **不要手动修改**：生成的文件会被覆盖，请勿手动修改。

## License

MIT
