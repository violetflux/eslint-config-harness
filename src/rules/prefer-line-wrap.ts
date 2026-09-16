import type { Rule } from 'eslint'

/** 提示 60～120 字符的行换行，Tab 与 max-len 的四列制表位一致 */
export const rule: Rule.RuleModule = {
  meta: {
    docs: { description: 'Suggest wrapping lines between 60 and 120 characters' },
    messages: { preferWrap: 'This line is {{length}} characters long. Consider wrapping it.' },
    schema: [],
    type: 'layout',
  },
  create(context) {
    return {
      Program() {
        context.sourceCode.lines.forEach((line, index) => {
          let length = 0
          for (const character of line)
            length += character === '\t' ? 4 - length % 4 : 1
          if (length >= 60 && length <= 120) {
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
