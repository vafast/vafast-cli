/**
 * JSON Schema → TypeScript 类型转换器
 * 
 * 将 TypeBox 生成的 JSON Schema 转换为 TypeScript 类型字符串
 */

interface JSONSchema {
  type?: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  anyOf?: JSONSchema[]
  allOf?: JSONSchema[]
  oneOf?: JSONSchema[]
  const?: unknown
  enum?: unknown[]
  $ref?: string
  additionalProperties?: boolean | JSONSchema
  format?: string
  // TypeBox 特有字段
  [key: string]: unknown
}

/**
 * 将 JSON Schema 转换为 TypeScript 类型字符串
 */
export function schemaToType(schema: unknown): string {
  if (!schema || typeof schema !== 'object') {
    return 'unknown'
  }
  
  const s = schema as JSONSchema
  
  // const 字面量
  if (s.const !== undefined) {
    return JSON.stringify(s.const)
  }
  
  // enum 枚举
  if (s.enum) {
    return s.enum.map(v => JSON.stringify(v)).join(' | ')
  }
  
  // anyOf / oneOf（联合类型）
  if (s.anyOf) {
    return s.anyOf.map(schemaToType).join(' | ')
  }
  if (s.oneOf) {
    return s.oneOf.map(schemaToType).join(' | ')
  }
  
  // allOf（交叉类型）
  if (s.allOf) {
    return s.allOf.map(schemaToType).join(' & ')
  }
  
  // 基本类型
  switch (s.type) {
    case 'string':
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'null':
      return 'null'
    case 'array':
      return arrayToType(s)
    case 'object':
      return objectToType(s)
    default:
      // 没有 type 但有 properties，当作 object
      if (s.properties) {
        return objectToType(s)
      }
      return 'unknown'
  }
}

/**
 * 数组类型转换
 */
function arrayToType(schema: JSONSchema): string {
  if (schema.items) {
    const itemType = schemaToType(schema.items)
    return `${itemType}[]`
  }
  return 'unknown[]'
}

/**
 * 对象类型转换
 */
function objectToType(schema: JSONSchema): string {
  // 处理 patternProperties（TypeBox 的 Type.Record 生成）
  const patternProps = schema.patternProperties as Record<string, JSONSchema> | undefined
  if (patternProps) {
    const patterns = Object.values(patternProps)
    if (patterns.length > 0 && patterns[0]) {
      const valueType = schemaToType(patterns[0])
      return `Record<string, ${valueType}>`
    }
    return 'Record<string, unknown>'
  }

  if (!schema.properties) {
    // 无属性的对象
    if (schema.additionalProperties === true) {
      return 'Record<string, unknown>'
    }
    if (typeof schema.additionalProperties === 'object') {
      const valueType = schemaToType(schema.additionalProperties)
      return `Record<string, ${valueType}>`
    }
    // 空对象使用 Record 避免 lint 错误
    return 'Record<string, unknown>'
  }
  
  const required = new Set(schema.required || [])
  const props: string[] = []
  
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const propType = schemaToType(propSchema)
    const optional = required.has(key) ? '' : '?'
    props.push(`${key}${optional}: ${propType}`)
  }
  
  if (props.length === 0) {
    return 'Record<string, unknown>'
  }
  
  return `{ ${props.join('; ')} }`
}
