import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** prefer-local-transformation 规则选项 */
interface Options {
  /** 检查的对象上下文 */
  contexts?: Array<'call' | 'return'>
  /** 进入建议范围的最大字段数 */
  maxProperties?: number
  /** 进入建议范围的最大派生字段数 */
  maxTransformations?: number
  /** 要求对象至少已有的属性简写数量 */
  minShorthandProperties?: number
}

/** -------------------- 常量 -------------------- */
/** 默认检查直接调用参数和返回对象 */
const DEFAULT_CONTEXTS: Array<'call' | 'return'> = ['call', 'return']
/** 默认对象最大字段数 */
const DEFAULT_MAX_PROPERTIES = 6
/** 默认派生字段最大数量 */
const DEFAULT_MAX_TRANSFORMATIONS = 4
/** 默认要求的属性简写数量 */
const DEFAULT_MIN_SHORTHAND_PROPERTIES = 2

/** -------------------- 内部函数 -------------------- */
/** 读取对象的直接使用位置 */
function readContext(node: Rule.Node) {
  if (node.parent?.type === 'ReturnStatement')
    return 'return' as const
  if (
    node.parent?.type === 'CallExpression'
    && node.parent.arguments.some(argument => argument === node)
  ) {
    return 'call' as const
  }
}

/** 判断字段值是否为明确的派生表达式 */
function isTransformation(node: Rule.Node) {
  return [
    'AwaitExpression',
    'BinaryExpression',
    'CallExpression',
    'ConditionalExpression',
    'LogicalExpression',
  ].includes(node.type)
}

/** 读取静态属性名称 */
function readPropertyName(node: Rule.Node) {
  if (node.type === 'Identifier' || node.type === 'Literal')
    return String(node.type === 'Identifier' ? node.name : node.value)
}

/** -------------------- 规则 -------------------- */
/** 建议将小型投影对象中的少量派生字段提前命名 */
export const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer naming derived fields before small call or return object projections',
    },
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        contexts: {
          type: 'array',
          items: { enum: ['call', 'return'] },
          uniqueItems: true,
        },
        maxProperties: { type: 'integer', minimum: 1 },
        maxTransformations: { type: 'integer', minimum: 1 },
        minShorthandProperties: { type: 'integer', minimum: 0 },
      },
    }],
    messages: {
      preferLocal: '{{properties}} are derived inline in a {{context}} object. Consider naming them first and using property shorthand.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const contexts = new Set(options.contexts ?? DEFAULT_CONTEXTS)
    const maxProperties = options.maxProperties ?? DEFAULT_MAX_PROPERTIES
    const maxTransformations = options.maxTransformations ?? DEFAULT_MAX_TRANSFORMATIONS
    const minShorthandProperties = options.minShorthandProperties
      ?? DEFAULT_MIN_SHORTHAND_PROPERTIES

    return {
      ObjectExpression(node) {
        const projectionContext = readContext(node)

        if (!projectionContext || !contexts.has(projectionContext))
          return
        if (node.properties.length > maxProperties)
          return

        const shorthandCount = node.properties.filter(property => (
          property.type === 'Property' && property.shorthand
        )).length
        const transformations = node.properties.filter(property => (
          property.type === 'Property'
          && !property.computed
          && property.kind === 'init'
          && isTransformation(property.value as Rule.Node)
        ))

        if (
          shorthandCount < minShorthandProperties
          || transformations.length === 0
          || transformations.length > maxTransformations
        ) {
          return
        }

        const properties = transformations.map((property) => {
          if (property.type !== 'Property')
            return ''
          return readPropertyName(property.key as Rule.Node)
            ?? context.sourceCode.getText(property.key)
        }).join(', ')

        context.report({
          node: transformations[0] ?? node,
          messageId: 'preferLocal',
          data: {
            context: projectionContext === 'call' ? 'call argument' : 'return',
            properties,
          },
        })
      },
    }
  },
}
