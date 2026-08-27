import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** cn-argument-layout 规则选项 */
interface Options {
  /** 作为 class 合并函数识别的名称 */
  cnNames?: string[]
  /** 静态 class 保持单行的最大字符数 */
  maxLength?: number
  /** 普通静态参数允许的最大字符数差 */
  segmentDifference?: number
}

/** -------------------- 常量 -------------------- */
/** 默认 class 合并函数名称 */
const DEFAULT_CN_NAMES = ['cn']
/** 默认静态 class 最大字符数 */
const DEFAULT_MAX_LENGTH = 56
/** 默认参数分段最大字符数差 */
const DEFAULT_SEGMENT_DIFFERENCE = 32

/** -------------------- 内部函数 -------------------- */
/** 读取静态字符串参数 */
function readStaticText(node: Rule.Node) {
  if (node.type === 'Literal' && typeof node.value === 'string')
    return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw
}

/** 判断静态分组是否包含不应按字符长度重排的复杂 utility */
function hasComplexClassGroup(value: string) {
  return value.includes('[')
    || value.includes(']')
    || value.trim().split(/\s+/).some(className => className.includes(':'))
}

/** -------------------- 规则 -------------------- */
/** 统一 cn 的静态参数长度与换行布局 */
export const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Normalize static arguments and line layout in class composition calls',
    },
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        cnNames: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
          uniqueItems: true,
        },
        maxLength: { type: 'integer', minimum: 1 },
        segmentDifference: { type: 'integer', minimum: 0 },
      },
    }],
    messages: {
      longSingleLine: 'Static classes exceed {{maxLength}} characters. Split this class composition call across multiple lines.',
      shortStatic: 'This class composition call contains no more than {{maxLength}} static characters. Use a plain string instead.',
      unbalancedSegments: 'Static class segments differ by more than {{segmentDifference}} characters. Rebalance the semantic groups.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const cnNames = new Set(options.cnNames ?? DEFAULT_CN_NAMES)
    const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH
    const segmentDifference = options.segmentDifference ?? DEFAULT_SEGMENT_DIFFERENCE
    const sourceCode = context.sourceCode

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !cnNames.has(node.callee.name))
          return

        const staticValues: string[] = []

        for (const argument of node.arguments) {
          if (argument.type === 'SpreadElement')
            continue
          const value = readStaticText(argument as Rule.Node)

          if (value !== undefined)
            staticValues.push(value)
        }

        const allStatic = staticValues.length === node.arguments.length
        const staticLength = staticValues.join(' ').length

        if (allStatic && staticLength <= maxLength) {
          context.report({
            node,
            messageId: 'shortStatic',
            data: { maxLength: String(maxLength) },
          })
          return
        }

        if (staticLength > maxLength && !sourceCode.getText(node).includes('\n')) {
          context.report({
            node,
            messageId: 'longSingleLine',
            data: { maxLength: String(maxLength) },
          })
          return
        }

        if (
          staticValues.length >= 2
          && staticValues.every(value => !hasComplexClassGroup(value))
          && Math.max(...staticValues.map(value => value.length))
          - Math.min(...staticValues.map(value => value.length)) > segmentDifference
        ) {
          context.report({
            node,
            messageId: 'unbalancedSegments',
            data: { segmentDifference: String(segmentDifference) },
          })
        }
      },
    }
  },
}
