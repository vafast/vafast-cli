/**
 * schema-to-type 单元测试
 */

import { describe, it, expect } from 'vitest'
import { schemaToType } from './schema-to-type'

describe('schemaToType', () => {
  describe('基础类型', () => {
    it('string', () => {
      expect(schemaToType({ type: 'string' })).toBe('string')
    })

    it('number', () => {
      expect(schemaToType({ type: 'number' })).toBe('number')
    })

    it('integer', () => {
      expect(schemaToType({ type: 'integer' })).toBe('number')
    })

    it('boolean', () => {
      expect(schemaToType({ type: 'boolean' })).toBe('boolean')
    })

    it('null', () => {
      expect(schemaToType({ type: 'null' })).toBe('null')
    })

    it('unknown (无类型)', () => {
      expect(schemaToType({})).toBe('unknown')
      expect(schemaToType(null)).toBe('unknown')
      expect(schemaToType(undefined)).toBe('unknown')
    })
  })

  describe('对象类型', () => {
    it('空对象', () => {
      expect(schemaToType({ type: 'object' })).toBe('Record<string, unknown>')
    })

    it('简单对象', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      }
      expect(schemaToType(schema)).toBe('{ name: string; age: number }')
    })

    it('可选字段', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],  // age 不在 required 中
      }
      expect(schemaToType(schema)).toBe('{ name: string; age?: number }')
    })

    it('无 required 字段（全部可选）', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      }
      expect(schemaToType(schema)).toBe('{ name?: string }')
    })

    it('嵌套对象', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        },
        required: ['user'],
      }
      expect(schemaToType(schema)).toBe('{ user: { id: string } }')
    })

    it('Record 类型 (additionalProperties: true)', () => {
      const schema = {
        type: 'object',
        additionalProperties: true,
      }
      expect(schemaToType(schema)).toBe('Record<string, unknown>')
    })

    it('Record 类型 (additionalProperties: schema)', () => {
      const schema = {
        type: 'object',
        additionalProperties: { type: 'number' },
      }
      expect(schemaToType(schema)).toBe('Record<string, number>')
    })
  })

  describe('数组类型', () => {
    it('简单数组', () => {
      const schema = {
        type: 'array',
        items: { type: 'string' },
      }
      expect(schemaToType(schema)).toBe('string[]')
    })

    it('对象数组', () => {
      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      }
      expect(schemaToType(schema)).toBe('{ id: string }[]')
    })

    it('无 items 的数组', () => {
      const schema = { type: 'array' }
      expect(schemaToType(schema)).toBe('unknown[]')
    })
  })

  describe('联合类型', () => {
    it('anyOf', () => {
      const schema = {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
        ],
      }
      expect(schemaToType(schema)).toBe('string | number')
    })

    it('oneOf', () => {
      const schema = {
        oneOf: [
          { type: 'string' },
          { type: 'null' },
        ],
      }
      expect(schemaToType(schema)).toBe('string | null')
    })
  })

  describe('交叉类型', () => {
    it('allOf', () => {
      const schema = {
        allOf: [
          { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
        ],
      }
      expect(schemaToType(schema)).toBe('{ id: string } & { name: string }')
    })
  })

  describe('字面量和枚举', () => {
    it('const 字面量', () => {
      expect(schemaToType({ const: 'active' })).toBe('"active"')
      expect(schemaToType({ const: 42 })).toBe('42')
      expect(schemaToType({ const: true })).toBe('true')
    })

    it('enum 枚举', () => {
      const schema = {
        enum: ['active', 'inactive', 'pending'],
      }
      expect(schemaToType(schema)).toBe('"active" | "inactive" | "pending"')
    })

    it('数字枚举', () => {
      const schema = {
        enum: [1, 2, 3],
      }
      expect(schemaToType(schema)).toBe('1 | 2 | 3')
    })
  })

  describe('复杂场景', () => {
    it('用户 schema', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          age: { type: 'number' },
          role: {
            enum: ['admin', 'user', 'guest'],
          },
        },
        required: ['id', 'name', 'email'],
      }
      const result = schemaToType(schema)
      expect(result).toContain('id: string')
      expect(result).toContain('name: string')
      expect(result).toContain('email: string')
      expect(result).toContain('age?: number')
      expect(result).toContain('role?: "admin" | "user" | "guest"')
    })

    it('分页查询 schema', () => {
      const schema = {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          sort: { type: 'string' },
          order: {
            enum: ['asc', 'desc'],
          },
        },
      }
      const result = schemaToType(schema)
      expect(result).toContain('page?: number')
      expect(result).toContain('limit?: number')
      expect(result).toContain('sort?: string')
      expect(result).toContain('order?: "asc" | "desc"')
    })
  })
})
