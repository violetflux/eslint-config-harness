import type { Linter } from 'eslint'
import { describe, expect, test } from 'vitest'
import { configs, plugin, rules } from '../src/index.js'

describe('harness plugin exports', () => {
  test('注册全部稳定规则 ID', () => {
    expect(plugin.rules).toBe(rules)
    expect(Object.keys(rules)).toEqual([
      'class-name-layout',
      'cn-argument-layout',
      'max-line-length',
      'named-import-export-layout',
      'no-redundant-field-alias',
      'prefer-cn',
      'prefer-local-transformation',
      'prefer-line-wrap',
      'prefer-property-shorthand',
      'react-hook-order',
      'short-jsx-return',
    ])
  })

  test('recommended 与 strict 都注册同一个内置 plugin', () => {
    const recommended = configs.recommended.find(config => config.name === 'harness/recommended') as Linter.Config
    const strict = configs.strict.find(config => config.name === 'harness/recommended') as Linter.Config

    expect(recommended.plugins?.harness).toBe(plugin)
    expect(strict.plugins?.harness).toBe(plugin)
    expect(recommended.rules).toEqual({})
    expect(configs.strict[1]?.rules).toEqual({
      'harness/class-name-layout': 'warn',
      'harness/cn-argument-layout': 'warn',
      'harness/max-line-length': 'off',
      'harness/named-import-export-layout': 'error',
      'harness/no-redundant-field-alias': 'warn',
      'harness/prefer-cn': 'warn',
      'harness/prefer-local-transformation': 'warn',
      'harness/prefer-line-wrap': 'off',
      'harness/prefer-property-shorthand': 'warn',
      'harness/react-hook-order': 'error',
      'harness/short-jsx-return': 'error',
    })
  })
})
