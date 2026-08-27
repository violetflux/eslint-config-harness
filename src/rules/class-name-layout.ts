import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** class-name-layout 规则选项 */
interface Options {
  /** 作为 class 字段识别的名称 */
  classNames?: string[]
  /** 静态 class 保持单行的最大字符数 */
  maxLength?: number
}

/** JSX Attribute 的最小 ESTree 结构 */
interface JsxAttributeNode {
  /** Attribute 名称 */
  name: { name?: string, type: string }
  /** 节点类型 */
  type: 'JSXAttribute'
  /** Attribute 值 */
  value: null | Rule.Node | {
    /** 容器表达式 */
    expression: Rule.Node | { type: 'JSXEmptyExpression' }
    /** 容器类型 */
    type: 'JSXExpressionContainer'
  }
}

/** -------------------- 常量 -------------------- */
/** 默认 class 字段名称 */
const DEFAULT_CLASS_NAMES = ['className']
/** 默认静态 class 最大字符数 */
const DEFAULT_MAX_LENGTH = 56

/** -------------------- 内部函数 -------------------- */
/** 读取静态属性名称 */
function readPropertyName(node: Rule.Node) {
  if (node.type === 'Identifier' || node.type === 'Literal')
    return String(node.type === 'Identifier' ? node.name : node.value)
}

/** 读取字符串表达式的静态值 */
function readStaticText(node: Rule.Node) {
  if (node.type === 'Literal' && typeof node.value === 'string')
    return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw
}

/** 判断字符串是否包含多个 utility */
function hasMultipleClasses(value: string) {
  return value.trim().split(/\s+/).length > 1
}

/** -------------------- 规则 -------------------- */
/** 限制 class 字段中的长静态样式保持在单个字符串内 */
export const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Require long static class strings to use multiline class composition',
    },
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        classNames: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
        },
        maxLength: { type: 'integer', minimum: 1 },
      },
    }],
    messages: {
      longStaticClass: 'Static class string has {{length}} characters, exceeding the {{maxLength}} character limit. Use multiline class composition.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const classNames = new Set(options.classNames ?? DEFAULT_CLASS_NAMES)
    const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH

    /** 报告过长的静态 class */
    const inspectValue = (node: Rule.Node) => {
      const value = readStaticText(node)

      if (value && value.length > maxLength && hasMultipleClasses(value)) {
        context.report({
          node,
          messageId: 'longStaticClass',
          data: { length: String(value.length), maxLength: String(maxLength) },
        })
      }
    }

    return {
      JSXAttribute: ((node: JsxAttributeNode) => {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : undefined

        if (!name || !classNames.has(name) || !node.value)
          return

        if (node.value.type === 'JSXExpressionContainer') {
          if (node.value.expression.type !== 'JSXEmptyExpression')
            inspectValue(node.value.expression)
          return
        }

        inspectValue(node.value)
      }) as never,
      Property(node) {
        if (node.kind !== 'init' || node.computed)
          return

        const name = readPropertyName(node.key as Rule.Node)

        if (name && classNames.has(name))
          inspectValue(node.value as Rule.Node)
      },
    }
  },
}
