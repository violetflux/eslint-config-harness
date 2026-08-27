import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** 短 JSX return 规则配置 */
interface ShortJsxReturnOptions {
  /** 允许折叠为单行的最大字符数 */
  maxLength?: number
}

/** return 语句节点 */
type ReturnNode = Extract<Rule.Node, { type: 'ReturnStatement' }>

/** 可安全折叠的 JSX return */
interface ShortJsxReturn {
  /** 折叠后的单行字符数 */
  length: number
  /** 替换整个 return 语句的源码 */
  replacement: string
}

/** -------------------- 常量 -------------------- */
/** 默认允许折叠为单行的最大字符数 */
const defaultMaxLength = 120

/** -------------------- 内部函数 -------------------- */
/** 读取只含冗余括号和空白的短 JSX return */
function readShortJsxReturn(
  node: ReturnNode,
  context: Rule.RuleContext,
  maxLength: number,
): ShortJsxReturn | undefined {
  const { argument } = node

  if (
    !argument
    || !['JSXElement', 'JSXFragment'].includes(argument.type)
  ) {
    return
  }

  const { sourceCode } = context
  const returnToken = sourceCode.getFirstToken(node)
  const openParen = sourceCode.getTokenBefore(argument)
  const closeParen = sourceCode.getTokenAfter(argument)

  if (
    returnToken?.value !== 'return'
    || openParen?.value !== '('
    || closeParen?.value !== ')'
  ) {
    return
  }

  const [, returnEnd] = sourceCode.getRange(returnToken)
  const [argumentStart, argumentEnd] = sourceCode.getRange(argument)
  const [, nodeEnd] = sourceCode.getRange(node)
  const before = sourceCode.text.slice(returnEnd, argumentStart)
  const after = sourceCode.text.slice(argumentEnd, nodeEnd)
  const jsx = sourceCode.getText(argument)
  const statement = sourceCode.getText(node)

  // 只处理一层括号及空白，注释、嵌套括号和 JSX 内部换行都保持原样
  if (
    !/\r|\n/.test(statement)
    || /\r|\n/.test(jsx)
    || !/^[\t ]*\([\t \r\n]*$/.test(before)
    || !/^[\t \r\n]*\)[\t ]*;?$/.test(after)
    || sourceCode.getCommentsInside(node).length > 0
  ) {
    return
  }

  const hasSemicolon = sourceCode.getLastToken(node)?.value === ';'
  const length = returnToken.loc.start.column + `return ${jsx}`.length

  if (length > maxLength)
    return

  return {
    length,
    replacement: `return ${jsx}${hasSemicolon ? ';' : ''}`,
  }
}

/** -------------------- 规则 -------------------- */
/** 将可安全单行化的短 JSX return 折叠为一行 */
export const rule: Rule.RuleModule = {
  meta: {
    docs: {
      description: 'Keep short JSX returns on one line',
    },
    fixable: 'code',
    messages: {
      useSingleLine: 'This JSX return is only {{length}} characters on one line. Keep it on one line.',
    },
    schema: [{
      additionalProperties: false,
      properties: {
        maxLength: {
          default: defaultMaxLength,
          minimum: 1,
          type: 'integer',
        },
      },
      type: 'object',
    }],
    type: 'layout',
  },
  create(context) {
    const options = (context.options[0] ?? {}) as ShortJsxReturnOptions
    const maxLength = options.maxLength ?? defaultMaxLength

    return {
      ReturnStatement(node) {
        const result = readShortJsxReturn(node as ReturnNode, context, maxLength)

        if (!result)
          return

        context.report({
          data: { length: result.length },
          fix: fixer => fixer.replaceText(node, result.replacement),
          messageId: 'useSingleLine',
          node,
        })
      },
    }
  },
}
