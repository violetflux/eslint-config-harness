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
      message: 'This JSX return is only 46 characters on one line. Keep it on one line.',
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

    expect(lint(code, { maxLength: 20 })).toEqual([])
    expect(lint(code, { maxLength: 22 })).toMatchObject([{
      messageId: 'useSingleLine',
    }])
    expect(fix(code, { maxLength: 22 }).output).toBe(`function Empty() {
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

    expect(lint(code)).toEqual([])
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
