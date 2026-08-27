import { Linter as ESLintLinter, type Linter, type Rule } from 'eslint'
import { describe, expect, test } from 'vitest'
import { rule as classNameLayout } from '../src/rules/class-name-layout.js'
import { rule as cnArgumentLayout } from '../src/rules/cn-argument-layout.js'
import { rule as preferCn } from '../src/rules/prefer-cn.js'

/** -------------------- 测试工具 -------------------- */
/** 使用内存 Flat Config 执行单条自研规则 */
function lint(rule: Rule.RuleModule, code: string, options: unknown[] = []) {
  const linter = new ESLintLinter()
  const config: Linter.Config = {
    files: ['**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: { ecmaFeatures: { jsx: true } },
      sourceType: 'module',
    },
    plugins: { harness: { rules: { target: rule } } },
    rules: { 'harness/target': ['error', ...options] },
  }

  return linter.verify(code, config, 'fixture.jsx')
}

/** 使用内存 Flat Config 执行规则并应用安全修复 */
function fix(rule: Rule.RuleModule, code: string, options: unknown[] = []) {
  const linter = new ESLintLinter()
  const config: Linter.Config = {
    files: ['**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: { ecmaFeatures: { jsx: true } },
      sourceType: 'module',
    },
    plugins: { harness: { rules: { target: rule } } },
    rules: { 'harness/target': ['error', ...options] },
  }

  return linter.verifyAndFix(code, config, 'fixture.jsx')
}

/** -------------------- 测试 -------------------- */
describe('className rules', () => {
  test('prefer-cn 只检查 className 中明确的 filter(Boolean).join 组合', () => {
    const invalid = lint(
      preferCn,
      `<div className={['base', active && 'active'].filter(Boolean).join(' ')} />`,
    )
    const valid = lint(
      preferCn,
      `const value = ['a', active && 'b'].filter(Boolean).join(' '); <div className={cn('base', 'active')} />`,
    )
    const removedClassNames = lint(
      preferCn,
      `const options = { classNames: ['base', active && 'active'].filter(Boolean).join(' ') }`,
    )

    expect(invalid.map(item => item.messageId)).toEqual(['preferCn'])
    expect(valid).toEqual([])
    expect(removedClassNames).toEqual([])
  })

  test('prefer-cn 支持配置 class 字段与推荐函数名称', () => {
    const messages = lint(
      preferCn,
      `const options = { classes: ['base', active && 'active'].filter(Boolean).join(' ') }`,
      [{ classNames: ['classes'], cnNames: ['cx'] }],
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain('cx')
  })

  test('prefer-cn 仅在推荐函数已有绑定时自动替换简单数组组合', () => {
    const fixed = fix(
      preferCn,
      `import { cn } from './utils'; <div className={['base', active && 'active'].filter(Boolean).join(' ')} />`,
    )
    const missingBinding = fix(
      preferCn,
      `<div className={['base', active && 'active'].filter(Boolean).join(' ')} />`,
    )
    const spread = fix(
      preferCn,
      `import { cn } from './utils'; <div className={['base', ...classes].filter(Boolean).join(' ')} />`,
    )

    expect(fixed.fixed).toBe(true)
    expect(fixed.output).toContain(`className={cn('base', active && 'active')}`)
    expect(missingBinding.fixed).toBe(false)
    expect(missingBinding.messages.map(item => item.messageId)).toEqual(['preferCn'])
    expect(spread.fixed).toBe(false)
    expect(spread.messages.map(item => item.messageId)).toEqual(['preferCn'])
  })

  test('class-name-layout 只限制配置 class 字段中的长静态字符串', () => {
    const longClass = 'flex items-center justify-between gap-2 rounded-lg border px-4 py-2'
    const invalid = lint(classNameLayout, `<div className="${longClass}" />`)
    const valid = lint(classNameLayout, `<div className="flex items-center" />`)
    const unrelated = lint(classNameLayout, `const description = '${longClass}'`)

    expect(invalid.map(item => item.messageId)).toEqual(['longStaticClass'])
    expect(valid).toEqual([])
    expect(unrelated).toEqual([])
  })

  test('class-name-layout 支持配置字段名称和长度阈值', () => {
    const messages = lint(
      classNameLayout,
      `const options = { classes: 'flex items-center gap-2' }`,
      [{ classNames: ['classes'], maxLength: 10 }],
    )

    expect(messages.map(item => item.messageId)).toEqual(['longStaticClass'])
  })

  test('cn-argument-layout 区分短静态、长单行与不均衡分组', () => {
    const shortStatic = lint(cnArgumentLayout, `const value = cn('flex', 'items-center')`)
    const longSingleLine = lint(
      cnArgumentLayout,
      `const value = cn('flex items-center justify-between rounded-lg border px-4 py-2 gap-2', active && 'active')`,
    )
    const unbalanced = lint(
      cnArgumentLayout,
      `const value = cn('abcdefghijklmnopqrstuvwxyz1234567890', 'x', active && 'active')`,
      [{ segmentDifference: 10 }],
    )

    expect(shortStatic.map(item => item.messageId)).toEqual(['shortStatic'])
    expect(longSingleLine.map(item => item.messageId)).toEqual(['longSingleLine'])
    expect(unbalanced.map(item => item.messageId)).toEqual(['unbalancedSegments'])
  })

  test('cn-argument-layout 放行动态短调用、复杂 utility 与多行长调用', () => {
    const messages = lint(cnArgumentLayout, `
      const dynamic = cn('base', active && 'active')
      const complex = cn('data-[state=open]:block', 'x', active && 'active')
      const multiline = cn(
        'flex items-center justify-between rounded-lg border px-4 py-2 gap-2',
        active && 'active',
      )
    `)
    const custom = lint(
      cnArgumentLayout,
      `const value = cx('flex', 'items-center')`,
      [{ cnNames: ['cx'] }],
    )

    expect(messages).toEqual([])
    expect(custom.map(item => item.messageId)).toEqual(['shortStatic'])
  })

  test('cn-argument-layout 自动展开无注释的长单行调用', () => {
    const fixed = fix(
      cnArgumentLayout,
      `const value = cn('flex items-center justify-between rounded-lg border px-4 py-2 gap-2', active && 'active')`,
    )
    const commented = fix(
      cnArgumentLayout,
      `const value = cn('flex items-center justify-between rounded-lg border px-4 py-2 gap-2', /* state */ active && 'active')`,
    )

    expect(fixed.fixed).toBe(true)
    expect(fixed.output).toBe(`const value = cn(\n  'flex items-center justify-between rounded-lg border px-4 py-2 gap-2',\n  active && 'active',\n)`)
    expect(commented.fixed).toBe(false)
    expect(commented.messages.map(item => item.messageId)).toEqual(['longSingleLine'])
  })
})
