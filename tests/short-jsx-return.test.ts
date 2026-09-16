import { Linter } from 'eslint'
import { describe, expect, test } from 'vitest'
import { rule } from '../src/rules/short-jsx-return'

/** -------------------- 测试工具 -------------------- */
/** 创建只启用短 JSX return 规则的 flat config */
function createConfig(options?: unknown): Linter.Config[] {
  return [{
    languageOptions: {
      ecmaVersion: 'latest' as const,
      parserOptions: { ecmaFeatures: { jsx: true } },
      sourceType: 'module' as const,
    },
    plugins: {
      harness: { rules: { 'short-jsx-return': rule } },
    },
    rules: {
      'harness/short-jsx-return': ['error', ...(options === undefined ? [] : [options])],
    },
  }]
}

/** 执行短 JSX return 规则并返回诊断 */
function lint(code: string, options?: unknown) {
  return new Linter().verify(code, createConfig(options))
}

/** 执行短 JSX return 规则的安全修复 */
function fix(code: string, options?: unknown) {
  return new Linter().verifyAndFix(code, createConfig(options))
}

/** -------------------- 测试 -------------------- */
describe('short-jsx-return', () => {
  test('报告并折叠可安全单行化的括号 JSX return', () => {
    const code = `function Message() {
  return (
    <MessageListContent key={threadId} />
  );
}`

    expect(lint(code)).toMatchObject([{
      fix: expect.any(Object),
      message: 'This JSX has only 35 non-whitespace characters. Keep it on one line.',
      messageId: 'useSingleLine',
      severity: 2,
    }])
    expect(fix(code)).toMatchObject({
      fixed: true,
      messages: [],
      output: `function Message() {
  return <MessageListContent key={threadId} />;
}`,
    })
  })

  test('支持无分号 JSX fragment 与自定义长度上限', () => {
    const code = `function Empty() {
  return (
    <><Icon /></>
  )
}`

    expect(lint(code, { maxLength: 11 })).toEqual([])
    expect(lint(code, { maxLength: 13 })).toMatchObject([{
      messageId: 'useSingleLine',
    }])
    expect(fix(code, { maxLength: 13 }).output).toBe(`function Empty() {
  return <><Icon /></>
}`)
  })

  test('接受单行、过长及 JSX 自身多行的 return', () => {
    const longValue = 'x'.repeat(120)
    const code = `function SingleLine() {
  return <Component />
}
function LongLine() {
  return (
    <Component value="${longValue}" />
  )
}
function MultilineJsx() {
  return (
    <Component
      value="value"
    />
  )
}
function TextWhitespace() {
  return (
    <span>
      preserved text
    </span>
  )
}`

    expect(lint(code)).toMatchObject([{ messageId: 'useSingleLine' }])
  })

  test('跳过包含注释或额外括号的 return', () => {
    const code = `function BeforeComment() {
  return (
    // 保留说明
    <Component />
  )
}
function AfterComment() {
  return (
    <Component />
    // 保留说明
  )
}
function JsxComment() {
  return (
    <Component>{/* 保留说明 */}</Component>
  )
}
function NestedParentheses() {
  return ((
    <Component />
  ))
}`

    expect(lint(code)).toEqual([])
    expect(fix(code)).toMatchObject({
      fixed: false,
      messages: [],
      output: code,
    })
  })
})

test.each([49, 50, 51])('jsx 去空白后阈值：%i 字符', (length) => {
  const jsx = `<Component value="${'x'.repeat(length - '<Componentvalue=""/>'.length)}" />`
  const code = `function Message() {\n  return (\n    ${jsx}\n  )\n}`
  expect(lint(code).map(message => message.messageId)).toEqual(length < 50 ? ['useSingleLine'] : [])
  expect(fix(code).fixed).toBe(length < 50)
})

test('多行 props 在 return 和独立 JSX 中强制折叠', () => {
  const code = `const view = <Component\n  value={value}\n/>`
  expect(fix(code)).toMatchObject({ fixed: true, messages: [], output: 'const view = <Component value={value} />' })
  expect(fix(`function View() {\n  return (\n    <Component\n      value={value}\n    />\n  )\n}`).output).toBe('function View() {\n  return <Component value={value} />\n}')
})

test('保留文本和属性值中的有效空格，不合并表达式内部换行', () => {
  expect(fix('const view = <TooltipContent\n  title="a  b"\n>新 聊天</TooltipContent>').output)
    .toBe('const view = <TooltipContent title="a  b" >新 聊天</TooltipContent>')
  for (const code of [
    'const view = <div>\n hello\n world\n</div>',
    'const view = <X value={`a\nb`} />',
    'const view = <X value={() => { return\n value }} />',
    'const view = <X\n /* comment */ value={x}\n/>',
  ]) {
    expect(fix(code).fixed).toBe(false)
  }
})

test('只统计 JSX，中文和 Emoji 按 Unicode 字符计数', () => {
  const code = 'function View() {\n  return (\n    <TooltipContent>新聊天</TooltipContent>\n  )\n}'
  expect(lint(code)).toMatchObject([{ message: 'This JSX has only 36 non-whitespace characters. Keep it on one line.' }])
  expect(fix('const view = <X\n  value="😀"\n/>').fixed).toBe(true)
})
