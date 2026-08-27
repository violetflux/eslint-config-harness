import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** prefer-cn 规则选项 */
interface Options {
  /** 作为 class 字段识别的名称 */
  classNames?: string[]
  /** 推荐使用的 class 合并函数名称，第一项用于诊断文案 */
  cnNames?: string[]
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
/** 默认 class 合并函数名称 */
const DEFAULT_CN_NAMES = ['cn']

/** -------------------- 内部函数 -------------------- */
/** 读取静态属性名称 */
function readPropertyName(node: Rule.Node) {
  if (node.type === 'Identifier' || node.type === 'Literal')
    return String(node.type === 'Identifier' ? node.name : node.value)
}

/** 判断表达式是否为明确的数组 filter(Boolean).join(' ') 链 */
function isFilterBooleanJoin(node: Rule.Node) {
  if (node.type !== 'CallExpression' || node.arguments.length !== 1)
    return false

  const { callee } = node
  const separator = node.arguments[0]

  if (
    callee.type !== 'MemberExpression'
    || callee.computed
    || callee.property.type !== 'Identifier'
    || callee.property.name !== 'join'
    || separator?.type !== 'Literal'
    || separator.value !== ' '
  ) {
    return false
  }

  const filterCall = callee.object

  if (filterCall.type !== 'CallExpression' || filterCall.arguments.length !== 1)
    return false

  const filter = filterCall.callee
  const predicate = filterCall.arguments[0]

  return filter.type === 'MemberExpression'
    && !filter.computed
    && filter.property.type === 'Identifier'
    && filter.property.name === 'filter'
    && filter.object.type === 'ArrayExpression'
    && predicate?.type === 'Identifier'
    && predicate.name === 'Boolean'
}

/** -------------------- 规则 -------------------- */
/** 要求明确的数组 class 拼接改用 cn */
export const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer a class composition function over filter(Boolean).join in class fields',
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
        cnNames: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
          uniqueItems: true,
        },
      },
    }],
    messages: {
      preferCn: "Class values composed with filter(Boolean).join(' ') should use {{cnName}} instead.",
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const classNames = new Set(options.classNames ?? DEFAULT_CLASS_NAMES)
    const cnName = (options.cnNames ?? DEFAULT_CN_NAMES)[0] ?? 'cn'

    return {
      JSXAttribute: ((node: JsxAttributeNode) => {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : undefined

        if (
          !name
          || !classNames.has(name)
          || node.value?.type !== 'JSXExpressionContainer'
          || node.value.expression.type === 'JSXEmptyExpression'
          || !isFilterBooleanJoin(node.value.expression)
        ) {
          return
        }

        context.report({
          node: node.value.expression,
          messageId: 'preferCn',
          data: { cnName },
        })
      }) as never,
      Property(node) {
        if (node.kind !== 'init' || node.computed)
          return

        const name = readPropertyName(node.key as Rule.Node)

        if (name && classNames.has(name) && isFilterBooleanJoin(node.value as Rule.Node)) {
          context.report({
            node,
            messageId: 'preferCn',
            data: { cnName },
          })
        }
      },
    }
  },
}
