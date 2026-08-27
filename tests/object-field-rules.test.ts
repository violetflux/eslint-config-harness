import { Linter as ESLintLinter, type Linter, type Rule } from 'eslint'
import { describe, expect, test } from 'vitest'
import {
  rule as noRedundantFieldAlias,
} from '../src/rules/no-redundant-field-alias.js'
import {
  rule as preferLocalTransformation,
} from '../src/rules/prefer-local-transformation.js'
import { rule as preferPropertyShorthand } from '../src/rules/prefer-property-shorthand.js'

/** -------------------- 测试工具 -------------------- */
/** 使用内存 Flat Config 执行单条自研规则 */
function lint(rule: Rule.RuleModule, code: string, options: unknown[] = []) {
  const linter = new ESLintLinter()
  const config: Linter.Config = {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: { harness: { rules: { target: rule } } },
    rules: { 'harness/target': ['warn', ...options] },
  }

  return linter.verify(code, config, 'fixture.js')
}

/** -------------------- 测试 -------------------- */
describe('object field rules', () => {
  test('prefer-property-shorthand 只提示对象解构后的同名直接转换', () => {
    const invalid = lint(preferPropertyShorthand, `
      function create(input) {
        const { value } = input
        return { value: normalize(value) }
      }
    `)
    const parameter = lint(preferPropertyShorthand, `
      function create(value) {
        return { value: normalize(value) }
      }
    `)
    const nested = lint(preferPropertyShorthand, `
      function create(input) {
        const { value } = input
        return { value: normalize({ value }) }
      }
    `)

    expect(invalid.map(item => item.messageId)).toEqual(['preferShorthand'])
    expect(parameter).toEqual([])
    expect(nested).toEqual([])
  })

  test('prefer-property-shorthand 可忽略转换函数或放宽来源限制', () => {
    const ignored = lint(preferPropertyShorthand, `
      function create(input) {
        const { value } = input
        return { value: preserve(value) }
      }
    `, [{ ignoredFunctions: ['preserve'] }])
    const relaxed = lint(preferPropertyShorthand, `
      function create(value) {
        return { value: normalize(value) }
      }
    `, [{ requireDestructuredSource: false }])

    expect(ignored).toEqual([])
    expect(relaxed.map(item => item.messageId)).toEqual(['preferShorthand'])
  })

  test('no-redundant-field-alias 按配置检查临时别名并默认检查返回字段别名', () => {
    const temporary = lint(noRedundantFieldAlias, `
      const { removeThread: removeThreadInStream } = stream
    `, [{ temporaryAliasSuffixes: ['InStream'] }])
    const returned = lint(noRedundantFieldAlias, `
      function create(input) {
        const { thread } = input
        const normalized = normalize(thread)
        return { thread: normalized }
      }
    `)

    expect(temporary.map(item => item.messageId)).toEqual(['temporaryAlias'])
    expect(returned.map(item => item.messageId)).toEqual(['returnAlias'])
  })

  test('no-redundant-field-alias 不猜测业务后缀并支持显式忽略函数', () => {
    const semanticAlias = lint(noRedundantFieldAlias, `
      const { removeThread: deleteThread } = stream
    `)
    const unconfiguredTemporary = lint(noRedundantFieldAlias, `
      const { removeThread: removeThreadInStream } = stream
    `)
    const rowMapping = lint(noRedundantFieldAlias, `
      function recordFromRow(row) {
        const { value } = row
        const parsed = Number(value)
        return { value: parsed }
      }
    `, [{ ignoredFunctionSuffixes: ['FromRow'] }])
    const disabledReturn = lint(noRedundantFieldAlias, `
      function create(input) {
        const { value } = input
        const parsed = Number(value)
        return { value: parsed }
      }
    `, [{ checkReturnAliases: false }])

    expect(semanticAlias).toEqual([])
    expect(unconfiguredTemporary).toEqual([])
    expect(rowMapping).toEqual([])
    expect(disabledReturn).toEqual([])
  })

  test('prefer-local-transformation 只提示小型混合投影中的明确派生字段', () => {
    const call = lint(preferLocalTransformation, `
      invoke({ threadId, workspaceId, payload: normalize(payload) })
    `)
    const returned = lint(preferLocalTransformation, `
      function create() {
        return { threadId, workspaceId, enabled: ready && active }
      }
    `)
    const directProjection = lint(preferLocalTransformation, `
      invoke({ threadId, workspaceId, payload: input.payload })
    `)

    expect(call.map(item => item.messageId)).toEqual(['preferLocal'])
    expect(returned.map(item => item.messageId)).toEqual(['preferLocal'])
    expect(directProjection).toEqual([])
  })

  test('prefer-local-transformation 通过阈值与上下文选项降低误报', () => {
    const tooLarge = lint(preferLocalTransformation, `
      invoke({ a, b, c, d, e, f, value: normalize(value) })
    `)
    const notMixed = lint(preferLocalTransformation, `
      invoke({ value: normalize(value) })
    `)
    const returnOnly = lint(preferLocalTransformation, `
      invoke({ threadId, workspaceId, value: normalize(value) })
    `, [{ contexts: ['return'] }])

    expect(tooLarge).toEqual([])
    expect(notMixed).toEqual([])
    expect(returnOnly).toEqual([])
  })
})
