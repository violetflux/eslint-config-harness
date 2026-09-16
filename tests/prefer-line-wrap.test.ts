import { Linter } from 'eslint'
import { expect, test } from 'vitest'
import { rule } from '../src/rules/prefer-line-wrap'

/** 检查完整物理行，包括注释、缩进和 Unicode */
function lint(code: string) {
  return new Linter().verifyAndFix(code, [{
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { harness: { rules: { 'prefer-line-wrap': rule } } },
    rules: { 'harness/prefer-line-wrap': 'warn' },
  }])
}

test.each([74, 75, 76, 119, 120, 121])('行宽 %i 的警告边界', (length) => {
  const code = 'x'.repeat(length)
  const result = lint(code)
  expect(result.messages.map(message => message.severity)).toEqual(length >= 75 && length <= 120 ? [1] : [])
  expect(result.fixed).toBe(false)
  expect(result.output).toBe(code)
})

test('unicode、Tab 和 CRLF 按物理行正确计数定位', () => {
  const code = `\t${'𐐀'.repeat(71)}\r\n${'中'.repeat(120)}`
  expect(lint(code).messages).toMatchObject([
    { line: 1, message: 'This line is 75 characters long. Consider wrapping it.' },
    { line: 2, message: 'This line is 120 characters long. Consider wrapping it.' },
  ])
})

test('忽略独立、块和行尾注释，仍检查前面的代码', () => {
  expect(lint(`//${'x'.repeat(160)}\n/*${'x'.repeat(160)}\n${'x'.repeat(160)}*/\nconst x = 1 //${'x'.repeat(160)}`).messages).toEqual([])
  expect(lint(`${'x'.repeat(75)} //${'x'.repeat(160)}`).messages).toMatchObject([
    { message: 'This line is 75 characters long. Consider wrapping it.' },
  ])
  expect(lint(`'https://${'x'.repeat(80)}'`).messages).toHaveLength(0)
})

test('忽略独立 JSX 注释并保留代码中间的块注释计算', () => {
  expect(lint(`const view = <div>\n  {/*${'x'.repeat(160)}*/}\n</div>`).messages).toEqual([])
  const inline = `const x = /*${'x'.repeat(65)}*/ 1`
  expect(lint(inline).messages).toHaveLength(1)
})

test('命名导出由专用布局规则处理，普通声明仍检查', () => {
  const name = 'x'.repeat(80)
  expect(lint(`const ${name} = 1\nexport { ${name} }`).messages.map(message => message.line)).toEqual([1])
})

test.each([90, 130])('字面量整行豁免：%i 字符', (length) => {
  for (const code of [
    `'${'x'.repeat(length)}'`,
    `\`${'x'.repeat(length)}\``,
    `/${'x'.repeat(length)}/`,
    `import { value } from '${'x'.repeat(length)}'`,
  ]) {
    expect(lint(code).messages).toEqual([])
  }
})
