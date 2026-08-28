import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/api/defaults'
import { MatcherType, SelectorKind } from 'eslint-plugin-better-tailwindcss/types'
import { ESLint } from 'eslint'
import { describe, expect, test } from 'vitest'
import type { HarnessTailwindSelector } from '../../src/index.js'
import { harness } from '../../src/index.js'

/**
 * 展开 Harness 配置工厂结果
 */
async function resolveConfig(options: Parameters<typeof harness>[0] = {}) {
  return await harness(options) as TypedFlatConfigItem[]
}

/** 使用指定 Harness 选项检查虚拟源码 */
async function lintFixture(
  filePath: string,
  source: string,
  options: Parameters<typeof harness>[0],
) {
  const eslint = new ESLint({
    overrideConfig: await resolveConfig(options),
    overrideConfigFile: true,
  })
  const [result] = await eslint.lintText(source, { filePath })

  return result?.messages ?? []
}

describe('harness config factory', () => {
  test('默认不注册未检测到的可选集成', async () => {
    const configs = await resolveConfig()
    const hasKerrosPlugin = configs.some(config => 'kerros' in (config.plugins ?? {}))

    expect(hasKerrosPlugin).toBe(false)
    expect(configs.some(config => config.name === 'harness/react')).toBe(false)
    expect(configs.some(config => config.name === 'harness/tailwind')).toBe(false)
    expect(configs.some(config => config.name === 'antfu/vue/rules')).toBe(false)
  })

  test('允许完全关闭 TypeScript 集成', async () => {
    const configs = await resolveConfig({
      kerros: false,
      react: false,
      tailwind: false,
      typescript: false,
      vue: false,
    })

    expect(configs.some(config => config.name?.includes('typescript'))).toBe(false)
    expect(configs.some(config => config.name === 'harness/test-file-size')).toBe(true)
  })

  test('按 Antfu 原生 vueVersion 选择 Vue 2 或 Vue 3 规则', async () => {
    const common = {
      kerros: false,
      react: false,
      tailwind: false,
      typescript: false,
    } as const
    const vue2Configs = await resolveConfig({
      ...common,
      vue: { vueVersion: 2 },
    })
    const vue3Configs = await resolveConfig({
      ...common,
      vue: { vueVersion: 3 },
    })
    const defaultVueConfigs = await resolveConfig({
      ...common,
      vue: {},
    })
    const vue2 = vue2Configs.find(config => config.name === 'antfu/vue/rules')
    const vue3 = vue3Configs.find(config => config.name === 'antfu/vue/rules')
    const defaultVue = defaultVueConfigs.find(config => config.name === 'antfu/vue/rules')

    expect(vue2?.rules?.['vue/no-v-for-template-key']).toBe('error')
    expect(vue2?.rules?.['vue/no-deprecated-v-bind-sync']).toBeUndefined()
    expect(vue3?.rules?.['vue/no-v-for-template-key-on-child']).toBe('error')
    expect(vue3?.rules?.['vue/no-deprecated-v-bind-sync']).toBe('error')
    expect(defaultVue?.rules?.['vue/no-deprecated-v-bind-sync']).toBe('error')
  })

  test('允许显式关闭 Vue 集成', async () => {
    const configs = await resolveConfig({ vue: false })

    expect(configs.some(config => config.name === 'antfu/vue/rules')).toBe(false)
  })

  test('react 关闭时不启用 React 与 JSX 策略', async () => {
    const configs = await resolveConfig({
      kerros: false,
      react: false,
      tailwind: false,
      typescript: false,
    })
    const disabled = configs.find(config => config.name === 'harness/react-disabled')

    expect(configs.some(config => config.name === 'harness/react')).toBe(false)
    expect(configs.some(config => config.name === 'harness/react-component-declarations')).toBe(false)
    expect(disabled?.rules?.['harness/react-hook-order']).toBe('off')
    expect(disabled?.rules?.['harness/short-jsx-return']).toBe('off')
  })

  test('react 开关控制 JSX 组件声明策略', async () => {
    const source = 'const Example = () => <div />\n'
    const common = {
      kerros: false,
      tailwind: false,
      typescript: false,
    } as const
    const enabled = await lintFixture('src/example.jsx', source, {
      ...common,
      react: true,
    })
    const disabled = await lintFixture('src/example.jsx', source, {
      ...common,
      react: false,
    })

    expect(enabled.map(message => message.ruleId)).toContain('no-restricted-syntax')
    expect(disabled.map(message => message.ruleId)).not.toContain('no-restricted-syntax')
  })

  test('typescript 严格策略覆盖 mts 与 cts', async () => {
    const options = {
      kerros: false,
      react: false,
      tailwind: false,
      typescript: true,
    } as const
    const source = `export * from './fixture'\n`
    const mts = await lintFixture('src/example.mts', source, options)
    const cts = await lintFixture('src/example.cts', source, options)

    expect(mts.map(message => message.ruleId)).toContain('no-restricted-syntax')
    expect(cts.map(message => message.ruleId)).toContain('no-restricted-syntax')
  })

  test('在 Antfu 默认忽略基础上追加用户路径', async () => {
    const configs = await resolveConfig({ ignores: ['generated/**'] })
    const ignores = configs.find(config => config.name === 'antfu/ignores')

    expect(ignores?.ignores).toContain('**/node_modules')
    expect(ignores?.ignores).toContain('**/dist')
    expect(ignores?.ignores).toContain('generated/**')
  })

  test('kerros true 只启用轻量预设', async () => {
    const configs = await resolveConfig({ kerros: true })
    const config = configs.find(item => item.name === 'harness/kerros')

    expect(config?.rules?.['kerros/binding-naming']).toBe('error')
    expect(configs.some(item => item.name?.includes('type-checked'))).toBe(false)
  })

  test('显式启用 Kerros 并应用文件范围与最终规则覆盖', async () => {
    const configs = await resolveConfig({
      kerros: {
        files: ['src/stores/**/*.{ts,tsx}'],
        rules: {
          'kerros/selector-parameter-name': 'off',
        },
      },
    })
    const kerrosConfigs = configs.filter(config => 'kerros' in (config.plugins ?? {}))
    const [config] = kerrosConfigs

    expect(kerrosConfigs).toHaveLength(1)
    expect(config?.name).toBe('harness/kerros')
    expect(config?.files).toEqual(['src/stores/**/*.{ts,tsx}'])
    expect(config?.rules?.['kerros/selector-parameter-name']).toBe('off')
  })

  test('strict 追加内置布局规则且用户规则最终覆盖', async () => {
    const configs = await resolveConfig({
      preset: 'strict',
      rules: {
        'harness/short-jsx-return': 'off',
      },
    })
    const strict = configs.find(config => config.name === 'harness/strict')
    const overrides = configs.find(config => config.name === 'harness/user-overrides')

    expect(strict?.rules?.['harness/short-jsx-return']).toBe('error')
    expect(strict?.rules?.['harness/prefer-local-transformation']).toBe('warn')
    expect(overrides?.rules?.['harness/short-jsx-return']).toBe('off')
    expect(configs.indexOf(overrides!)).toBeGreaterThan(configs.indexOf(strict!))
  })

  test('测试夹具不强制执行 Hook 布局规则', async () => {
    const configs = await resolveConfig()
    const overrides = configs.find(config => config.name === 'harness/test-style-overrides')

    expect(overrides?.files).toEqual(['**/*.{test,spec}.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'])
    expect(overrides?.rules?.['harness/react-hook-order']).toBe('off')
  })

  test('按参数创建 React 与 Tailwind 集成', async () => {
    const additionalSelectors = [{
      kind: SelectorKind.Variable,
      name: '^slots$',
      match: [{ type: MatcherType.ObjectValue }],
    }] satisfies HarnessTailwindSelector[]
    const configs = await resolveConfig({
      react: {
        files: ['src/**/*.tsx'],
      },
      tailwind: {
        entryPoint: 'src/styles/index.css',
        files: ['src/**/*.tsx'],
        rootFontSize: 18,
        additionalSelectors,
      },
    })
    const react = configs.find(config => config.name === 'harness/react')
    const tailwind = configs.find(config => config.name === 'harness/tailwind')
    const conflictRule = tailwind?.rules?.['better-tailwindcss/no-conflicting-classes']

    expect(react?.files).toEqual(['src/**/*.tsx'])
    expect(tailwind?.files).toEqual(['src/**/*.tsx'])
    expect(conflictRule).toEqual([
      'error',
      {
        entryPoint: 'src/styles/index.css',
        rootFontSize: 18,
        selectors: [
          ...getDefaultSelectors(),
          ...additionalSelectors,
        ],
      },
    ])
    expect(tailwind?.rules?.['better-tailwindcss/no-concatenated-classes']).toEqual([
      'error',
      expect.any(Object),
    ])
  })

  test('react 默认覆盖不含 JSX 的自定义 Hook 源码', async () => {
    const configs = await resolveConfig({ react: true })
    const react = configs.find(config => config.name === 'harness/react')

    expect(react?.files).toEqual(['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'])
  })

  test('tailwind 默认覆盖 JavaScript 与 TypeScript 源码', async () => {
    const configs = await resolveConfig({
      tailwind: {
        entryPoint: 'src/styles/index.css',
      },
    })
    const tailwind = configs.find(config => config.name === 'harness/tailwind')

    expect(tailwind?.files).toEqual(['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'])
  })
})
