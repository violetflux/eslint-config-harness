import type { Rule } from 'eslint'

/** 提示 75～120 字符的行换行，Tab 与 max-len 的四列制表位一致 */
export const rule: Rule.RuleModule = {
  meta: {
    docs: { description: 'Suggest wrapping lines between 75 and 120 characters' },
    messages: { preferWrap: 'This line is {{length}} characters long. Consider wrapping it.' },
    schema: [],
    type: 'layout',
  },
  create(context) {
    const declarationLines = new Set<number>()
    /** 命名导入导出的布局由专用规则负责 */
    const skipDeclaration = (node: Rule.Node) => {
      if (!node.loc || !('specifiers' in node)
        || !node.specifiers.some(specifier => ['ImportSpecifier', 'ExportSpecifier'].includes(specifier.type))) {
        return
      }
      for (let line = node.loc.start.line; line <= node.loc.end.line; line++)
        declarationLines.add(line)
    }
    return {
      ImportDeclaration: skipDeclaration,
      ExportNamedDeclaration: skipDeclaration,
      'Program:exit': function () {
        const literalLines = new Set<number>()
        for (const token of context.sourceCode.getTokens(context.sourceCode.ast)) {
          const attribute = token.type === 'JSXText'
            ? context.sourceCode.getNodeByRangeIndex(token.range[0] - 1)
            : undefined
          if (!['String', 'Template', 'RegularExpression'].includes(token.type)
            && (attribute as { type?: string } | undefined)?.type !== 'JSXAttribute') {
            continue
          }
          for (let line = token.loc.start.line; line <= token.loc.end.line; line++)
            literalLines.add(line)
        }
        const comments = context.sourceCode.getAllComments().map((comment) => {
          if (!comment.range)
            return comment
          const node = context.sourceCode.getNodeByRangeIndex(comment.range[0]) as {
            /** JSX 扩展节点种类 */
            type: string
            /** 包含注释的 JSX 表达式容器 */
            parent?: { type: string, loc?: typeof comment.loc }
          } | null
          const parent = node?.parent
          if (node?.type === 'JSXEmptyExpression' && parent?.type === 'JSXExpressionContainer'
            && parent.loc?.start.line === parent.loc?.end.line) {
            return parent
          }
          return comment
        })
        context.sourceCode.lines.forEach((line, index) => {
          const lineNumber = index + 1
          if (declarationLines.has(lineNumber) || literalLines.has(lineNumber))
            return
          let measured = line
          // 与 style/max-len ignoreComments 一致：忽略独立注释和行尾注释。
          for (const comment of comments.toReversed()) {
            if (!comment.loc)
              continue
            const { start, end } = comment.loc
            if (start.line > lineNumber || end.line < lineNumber)
              continue
            if (end.line === lineNumber && end.column !== measured.length)
              continue
            if (start.line < lineNumber || !measured.slice(0, start.column).trim()) {
              measured = ''
              break
            }
            measured = measured.slice(0, start.column).trimEnd()
          }
          if (/[^:/?#]:\/\/[^?#]/u.test(measured))
            return
          // 与 Stylistic 一样，以 UTF-16 列位置展开 Tab，再计算 Unicode 字符数。
          let extraWidth = 0
          for (let offset = 0; offset < measured.length; offset++) {
            if (measured[offset] === '\t')
              extraWidth += 4 - (offset + extraWidth) % 4 - 1
          }
          const length = Array.from(measured).length + extraWidth
          if (length >= 75 && length <= 120) {
            context.report({
              loc: { start: { line: index + 1, column: 0 }, end: { line: index + 1, column: line.length } },
              messageId: 'preferWrap',
              data: { length },
            })
          }
        })
      },
    }
  },
}
