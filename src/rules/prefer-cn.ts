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

/** 读取明确的数组 filter(Boolean).join(' ') 链 */
function readFilterBooleanJoinArray(node: Rule.Node) {
  if (node.type !== 'CallExpression' || node.arguments.length !== 1)
    return

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
    return
  }

  const filterCall = callee.object

  if (filterCall.type !== 'CallExpression' || filterCall.arguments.length !== 1)
    return

  const filter = filterCall.callee
  const predicate = filterCall.arguments[0]

  if (
    filter.type === 'MemberExpression'
    && !filter.computed
    && filter.property.type === 'Identifier'
    && filter.property.name === 'filter'
    && filter.object.type === 'ArrayExpression'
    && predicate?.type === 'Identifier'
    && predicate.name === 'Boolean'
  ) {
    return filter.object
  }
}

/** -------------------- 规则 -------------------- */
/** 要求明确的数组 class 拼接改用 cn */
export const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
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
    const sourceCode = context.sourceCode

    /** 判断推荐函数是否已由当前或上层作用域声明 */
    const hasCnBinding = (node: Rule.Node) => {
      let scope: ReturnType<typeof sourceCode.getScope> | null = sourceCode.getScope(node)

      while (scope) {
        if (scope.set.has(cnName))
          return true
        scope = scope.upper
      }

      return false
    }

    /** 为无注释和 spread 的明确数组组合创建安全替换 */
    const createFix = (node: Rule.Node) => {
      const array = readFilterBooleanJoinArray(node)

      if (
        !array
        || !hasCnBinding(node)
        || sourceCode.getCommentsInside(array).length > 0
        || array.elements.some(element => !element || element.type === 'SpreadElement')
      ) {
        return
      }

      const argumentsText = array.elements
        .map(element => sourceCode.getText(element!))
        .join(', ')

      return (fixer: Rule.RuleFixer) => fixer.replaceText(
        node,
        `${cnName}(${argumentsText})`,
      )
    }

    /** 报告明确的数组 class 拼接并按可见绑定决定是否修复 */
    const report = (node: Rule.Node) => {
      context.report({
        node,
        messageId: 'preferCn',
        data: { cnName },
        fix: createFix(node),
      })
    }

    return {
      JSXAttribute: ((node: JsxAttributeNode) => {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : undefined

        if (
          !name
          || !classNames.has(name)
          || node.value?.type !== 'JSXExpressionContainer'
          || node.value.expression.type === 'JSXEmptyExpression'
          || !readFilterBooleanJoinArray(node.value.expression)
        ) {
          return
        }

        report(node.value.expression)
      }) as never,
      Property(node) {
        if (node.kind !== 'init' || node.computed)
          return

        const name = readPropertyName(node.key as Rule.Node)

        if (name && classNames.has(name) && readFilterBooleanJoinArray(node.value as Rule.Node))
          report(node.value as Rule.Node)
      },
    }
  },
}
