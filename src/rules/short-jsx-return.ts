import type { Rule } from 'eslint'

/** JSX 去空白后的长度上限（不包含此值） */
interface Options {
  /** 去空白后的 JSX 必须小于此值才折叠 */
  maxLength?: number
}

/** 带 JSX 字段的 AST 节点 */
type JsxNode = Rule.Node & {
  /** JSX 开始标签 */
  openingElement?: JsxNode
  /** 开始标签上的属性 */
  attributes?: JsxNode[]
}

/** 仅合并标签属性之间的空白，保留文本和表达式内部语义 */
function collapseJsx(node: JsxNode, context: Rule.RuleContext): string | undefined {
  const source = context.sourceCode
  if (source.getCommentsInside(node).length)
    return
  const allowed: Array<readonly [number, number]> = []
  const protectedRanges: Array<readonly [number, number]> = []
  /** 收集可折叠的开始标签和不可改动的属性范围 */
  const visit = (current: JsxNode) => {
    if (current.openingElement) {
      allowed.push(source.getRange(current.openingElement))
      for (const attribute of current.openingElement.attributes ?? [])
        protectedRanges.push(source.getRange(attribute))
    }
    for (const key of source.visitorKeys[current.type] ?? []) {
      const value = (current as unknown as Record<string, unknown>)[key]
      for (const child of Array.isArray(value) ? value : [value]) {
        if (child && typeof child === 'object' && 'type' in child)
          visit(child as JsxNode)
      }
    }
  }
  visit(node)
  const text = source.getText(node)
  const [start] = source.getRange(node)
  let safe = true
  const result = text.replace(/[\t \r\n]*[\r\n][\t \r\n]*/g, (whitespace, offset: number) => {
    const from = start + offset
    const to = from + whitespace.length
    if (!allowed.some(([a, b]) => a <= from && to <= b)
      || protectedRanges.some(([a, b]) => a < to && from < b)) {
      safe = false
    }
    return ' '
  })
  return safe ? result : undefined
}

/** 让小于阈值的 JSX 安全保持单行，包括 return、赋值和嵌套 JSX */
export const rule: Rule.RuleModule = {
  meta: {
    docs: { description: 'Keep JSX with fewer than 50 non-whitespace characters on one line' },
    fixable: 'code',
    messages: {
      useSingleLine: 'This JSX has only {{length}} non-whitespace characters. Keep it on one line.',
    },
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: { maxLength: { type: 'integer', minimum: 1, default: 50 } },
    }],
    type: 'layout',
  },
  create(context) {
    const limit = ((context.options[0] ?? {}) as Options).maxLength ?? 50
    const source = context.sourceCode
    const handled = new Set<Rule.Node>()
    /** 检查 JSX 并在适用时同时去掉 return 的外围括号 */
    const inspect = (node: JsxNode, returnNode?: Rule.Node) => {
      const text = source.getText(node)
      const length = Array.from(text.replace(/\s/gu, '')).length
      if (length >= limit)
        return
      const jsx = collapseJsx(node, context)
      if (jsx === undefined)
        return
      let target: Rule.Node = node
      let replacement = jsx
      if (returnNode) {
        if (source.getCommentsInside(returnNode).length)
          return
        const token = source.getFirstToken(returnNode)!
        const before = source.text.slice(source.getRange(token)[1], source.getRange(node)[0])
        const after = source.text.slice(source.getRange(node)[1], source.getRange(returnNode)[1])
        const parenthesized = /^[\t ]*\([\t \r\n]*$/.test(before) && /^[\t \r\n]*\)[\t ]*;?$/.test(after)
        const bare = /^[\t ]*$/.test(before) && /^[\t ]*;?$/.test(after)
        if (!parenthesized && !bare)
          return
        target = returnNode
        replacement = `return ${jsx}${source.getLastToken(returnNode)?.value === ';' ? ';' : ''}`
      }
      if (!/[\r\n]/.test(source.getText(target)))
        return
      context.report({
        node: target,
        messageId: 'useSingleLine',
        data: { length },
        fix: fixer => fixer.replaceText(target, replacement),
      })
    }
    /** 单独出现的 JSX 也应用相同规则 */
    const inspectJsx = (node: JsxNode) => {
      if (!handled.has(node))
        inspect(node)
    }
    return {
      ReturnStatement(node) {
        if (node.argument && ['JSXElement', 'JSXFragment'].includes(node.argument.type)) {
          handled.add(node.argument as Rule.Node)
          inspect(node.argument as JsxNode, node)
        }
      },
      JSXElement: inspectJsx as never,
      JSXFragment: inspectJsx as never,
    }
  },
}
