import { Linter } from 'eslint'
import { expect, test } from 'vitest'
import { rule } from '../src/rules/prefer-line-wrap'

/** 检查完整物理行，包括注释、缩进和 Unicode */
function lint(code: string) {
  return new Linter().verifyAndFix(code, [{
    plugins: { harness: { rules: { 'prefer-line-wrap': rule } } },
    rules: { 'harness/prefer-line-wrap': 'warn' },
  }])
}

test.each([59, 60, 61, 119, 120, 121])('行宽 %i 的警告边界', (length) => {
  const code = `//${'x'.repeat(length - 2)}`
  const result = lint(code)
  expect(result.messages.map(message => message.severity)).toEqual(length >= 60 && length <= 120 ? [1] : [])
  expect(result.fixed).toBe(false)
  expect(result.output).toBe(code)
})

test('unicode、Tab 和 CRLF 按物理行正确计数定位', () => {
  const code = `\t//${'😀'.repeat(54)}\r\n//${'中'.repeat(118)}`
  expect(lint(code).messages).toMatchObject([
    { line: 1, message: 'This line is 60 characters long. Consider wrapping it.' },
    { line: 2, message: 'This line is 120 characters long. Consider wrapping it.' },
  ])
})
