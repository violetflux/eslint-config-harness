import { Linter } from 'eslint'
import { expect, test } from 'vitest'
import { rule as hard } from '../src/rules/max-line-length'
import { rule as jsx } from '../src/rules/short-jsx-return'
import { rule as soft } from '../src/rules/prefer-line-wrap'

/** 同时启用两档行宽检查 */
function lint(code: string) {
  return new Linter().verifyAndFix(code, [{
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { harness: { rules: { 'max-line-length': hard, 'prefer-line-wrap': soft, 'short-jsx-return': jsx } } },
    rules: { 'harness/max-line-length': 'error', 'harness/prefer-line-wrap': 'warn', 'harness/short-jsx-return': 'error' },
  }])
}

test.each([49, 50, 100, 101])('任意缩进和内部空白不改变 %i 字符的级别', (length) => {
  const code = `${' \t'.repeat(80)}${'x'.repeat(length - 2)} \t +\t y    `
  const result = lint(code)
  expect(result.messages.map(message => message.severity)).toEqual(length < 50 ? [] : [length <= 100 ? 1 : 2])
  expect(result.output).toBe(code)
  expect(result.fixed).toBe(false)
})

test('注释与字面量豁免在两档保持一致', () => {
  const long = 'x'.repeat(160)
  expect(lint(`//${long}\nconst x = 1 //${long}\n'${long}';\n/${long}/;\n\`${long}\`;`).messages).toEqual([])
})

test('长命名导出不报通用警告，但实际字符超过硬上限仍报错', () => {
  expect(lint(`const x = 1\nexport { x as ${'x'.repeat(101)} }`).messages).toMatchObject([
    { ruleId: 'harness/max-line-length', severity: 2 },
  ])
})

test.each([49, 50])('jSX %i 字符时与通用行宽兼容', (length) => {
  const element = `<Component value={${'x'.repeat(length - '<Componentvalue={}/>'.length)}} />`
  const result = lint(`function View() {\n  return (\n    ${element}\n  )\n}`)
  if (length === 49) {
    expect(result.fixed).toBe(true)
    expect(result.output).toContain(`return ${element}`)
    expect(result.messages).toEqual([])
    expect(lint(result.output).fixed).toBe(false)
  }
  else {
    expect(result.fixed).toBe(false)
    expect(result.messages).toMatchObject([{ ruleId: 'harness/prefer-line-wrap', severity: 1 }])
  }
})

test('短 JSX 不豁免超过 100 的整行硬上限', () => {
  const code = `const ${'x'.repeat(100)} = <Component />`
  expect(lint(code).messages).toMatchObject([{ ruleId: 'harness/max-line-length', severity: 2 }])
})
