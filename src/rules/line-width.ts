import type { Rule } from 'eslint'

/** 创建共用计数与豁免逻辑的两档行宽规则 */
export function createLineWidthRule(hardLimit: boolean): Rule.RuleModule {
  return {
    meta: {
      docs: { description: hardLimit ? 'Limit lines to 100 characters excluding spaces and tabs' : 'Suggest wrapping lines with 50–100 characters excluding spaces and tabs' },
      messages: {
        preferWrap: 'This line has {{length}} characters excluding spaces and tabs. Consider wrapping it.',
        tooLong: 'This line has {{length}} characters excluding spaces and tabs. Maximum allowed is 100.',
      },
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
      /** 短 JSX 已由专用规则要求单行，通用警告不提出相反建议 */
      const skipShortJsx = (node: Rule.Node) => {
        if (!node.loc || node.loc.start.line !== node.loc.end.line)
          return
        if (Array.from(context.sourceCode.getText(node).replace(/\s/gu, '')).length < 50)
          declarationLines.add(node.loc.start.line)
      }
      return {
        JSXElement: skipShortJsx as never,
        JSXFragment: skipShortJsx as never,
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
            if ((!hardLimit && declarationLines.has(lineNumber)) || literalLines.has(lineNumber))
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
            const length = Array.from(measured.replace(/[ \t]/g, '')).length
            if (hardLimit ? length > 100 : length >= 50 && length <= 100) {
              context.report({
                loc: { start: { line: index + 1, column: 0 }, end: { line: index + 1, column: line.length } },
                messageId: hardLimit ? 'tooLong' : 'preferWrap',
                data: { length },
              })
            }
          })
        },
      }
    },
  }
}
