import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** prefer-property-shorthand 规则选项 */
interface Options {
  /** 不检查的转换函数名称 */
  ignoredFunctions?: string[]
  /** 是否要求同名来源由当前作用域的对象解构引入 */
  requireDestructuredSource?: boolean
}

/** 当前函数或模块作用域的对象解构绑定 */
interface ScopeState {
  /** 当前作用域已访问的对象解构绑定 */
  destructured: Set<string>
}

/** -------------------- 内部函数 -------------------- */
/** 读取静态属性名称 */
function readPropertyName(node: Rule.Node) {
  if (node.type === 'Identifier' || node.type === 'Literal')
    return String(node.type === 'Identifier' ? node.name : node.value)
}

/** 读取调用表达式的直接函数名称 */
function readFunctionName(node: Rule.Node) {
  if (node.type === 'Identifier')
    return node.name
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier')
    return node.property.name
}

/** -------------------- 规则 -------------------- */
/** 建议将同名来源的内联转换提前命名后使用属性简写 */
export const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer naming same-source transformations before using property shorthand',
    },
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        ignoredFunctions: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
        },
        requireDestructuredSource: { type: 'boolean' },
      },
    }],
    messages: {
      preferShorthand: '{{property}} transforms a same-named source inline. Consider naming the final value first and using property shorthand.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const ignoredFunctions = new Set(options.ignoredFunctions ?? [])
    const requireDestructuredSource = options.requireDestructuredSource ?? true
    const scopes: ScopeState[] = [{ destructured: new Set() }]

    /** 进入新的函数作用域 */
    const enterScope = () => scopes.push({ destructured: new Set() })
    /** 离开当前函数作用域 */
    const exitScope = () => scopes.pop()

    return {
      ArrowFunctionExpression: enterScope,
      'ArrowFunctionExpression:exit': exitScope,
      FunctionDeclaration: enterScope,
      'FunctionDeclaration:exit': exitScope,
      FunctionExpression: enterScope,
      'FunctionExpression:exit': exitScope,
      Property(node) {
        const state = scopes.at(-1)!

        if (node.parent.type === 'ObjectPattern') {
          if (node.value.type === 'Identifier')
            state.destructured.add(node.value.name)
          else if (node.value.type === 'AssignmentPattern' && node.value.left.type === 'Identifier')
            state.destructured.add(node.value.left.name)
          return
        }

        if (node.kind !== 'init' || node.computed || node.value.type !== 'CallExpression')
          return

        const property = readPropertyName(node.key as Rule.Node)
        const functionName = readFunctionName(node.value.callee as Rule.Node)

        if (!property || (functionName && ignoredFunctions.has(functionName)))
          return

        const usesSameName = node.value.arguments.some(argument => (
          argument.type === 'Identifier' && argument.name === property
        ))

        if (!usesSameName || (requireDestructuredSource && !state.destructured.has(property)))
          return

        context.report({
          node,
          messageId: 'preferShorthand',
          data: { property },
        })
      },
    }
  },
}
