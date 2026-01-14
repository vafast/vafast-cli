/**
 * 自动生成的 API 类型定义
 * 生成时间: 2026-01-14T12:36:04.056Z
 * 版本: 1.0.0
 * 
 * ⚠️ 请勿手动修改此文件，使用 `vafast sync` 重新生成
 */

export type Api = {
  users: {
    /** 获取用户列表 */
    get: {
      query: { page: number; limit?: number }
      return: unknown
    }
    /** 创建用户 */
    post: {
      body: { name: string; email: string; age?: number }
      return: unknown
    }
    ':id': {
      /** 获取用户详情 */
      get: {
      params: { id: string }
      return: unknown
    }
      /** 删除用户 */
      delete: {
      params: { id: string }
      return: unknown
    }
    }
  }
  posts: {
    /** 获取文章列表 */
    get: {
      query: { page?: number; status?: "draft" | "published" | "archived" }
      return: unknown
    }
  }
}
