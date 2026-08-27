import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** no-redundant-field-alias 规则选项 */
interface Options {
  /** 是否检查返回对象中的字段别名 */
  checkReturnAliases?: boolean
  /** 不检查的函数名称后缀 */
  ignoredFunctionSuffixes?: string[]
  /** 视为临时模块别名的后缀 */
  temporaryAliasSuffixes?: string[]
}

/** 当前函数或模块作用域状态 */
interface ScopeState {
  /** 当前作用域已访问的对象解构绑定 */
  destructured: Set<string>
  /** 当前函数名称 */
  functionName?: string
}

/** -------------------- 常量 -------------------- */
/** 默认不猜测消费项目的临时别名后缀 */
const DEFAULT_TEMPORARY_ALIAS_SUFFIXES: string[] = []
/** 默认不按消费项目的函数命名跳过检查 */
const DEFAULT_IGNORED_FUNCTION_SUFFIXES: string[] = []

/** -------------------- 内部函数 -------------------- */
/** 读取静态属性名称 */
function readPropertyName(node: Rule.Node) {
  if (node.type === 'Identifier' || node.type === 'Literal')
    return String(node.type === 'Identifier' ? node.name : node.value)
}

/** 读取函数声明或变量函数名称 */
function readFunctionName(node: Rule.Node) {
  if (
    (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression')
    && node.id
  ) {
    return node.id.name
  }
  if (
    node.parent?.type === 'VariableDeclarator'
    && node.parent.id.type === 'Identifier'
  ) {
    return node.parent.id.name
  }
}

/** -------------------- 规则 -------------------- */
/** 避免用领域后缀或返回映射保留无意义字段别名 */
export const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage redundant field aliases that can use short temporary names',
    },
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        checkReturnAliases: { type: 'boolean' },
        ignoredFunctionSuffixes: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true,
        },
        temporaryAliasSuffixes: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
        },
      },
    }],
    messages: {
      returnAlias: '{{property}} maps to {{alias}} in the returned object while a same-named binding exists. Consider reserving the original name for the final value.',
      temporaryAlias: '{{property}} is temporarily aliased as {{alias}}. Consider using _{{property}} instead.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const checkReturnAliases = options.checkReturnAliases ?? true
    const ignoredFunctionSuffixes = options.ignoredFunctionSuffixes
      ?? DEFAULT_IGNORED_FUNCTION_SUFFIXES
    const temporaryAliasSuffixes = options.temporaryAliasSuffixes
      ?? DEFAULT_TEMPORARY_ALIAS_SUFFIXES
    const scopes: ScopeState[] = [{ destructured: new Set() }]

    /** 进入新的函数作用域 */
    const enterScope = (node: Rule.Node) => {
      const functionName = readFunctionName(node)
      const state: ScopeState = { destructured: new Set() }

      if (functionName)
        state.functionName = functionName
      scopes.push(state)
    }
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
        const property = readPropertyName(node.key as Rule.Node)

        if (!property || node.computed || node.kind !== 'init')
          return

        const state = scopes.at(-1)!

        if (node.parent.type === 'ObjectPattern') {
          if (node.value.type === 'Identifier') {
            const alias = node.value.name

            if (temporaryAliasSuffixes.some(suffix => alias === `${property}${suffix}`)) {
              context.report({
                node,
                messageId: 'temporaryAlias',
                data: { alias, property },
              })
            }

            state.destructured.add(alias)
          }
          return
        }

        if (
          !checkReturnAliases
          || node.parent.type !== 'ObjectExpression'
          || node.parent.parent.type !== 'ReturnStatement'
          || node.value.type !== 'Identifier'
          || node.value.name === property
          || !state.destructured.has(property)
          || (
            state.functionName
            && ignoredFunctionSuffixes.some(suffix => state.functionName!.endsWith(suffix))
          )
        ) {
          return
        }

        context.report({
          node,
          messageId: 'returnAlias',
          data: { alias: node.value.name, property },
        })
      },
    }
  },
}
