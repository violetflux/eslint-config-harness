import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/api/defaults'
import { MatcherType, SelectorKind } from 'eslint-plugin-better-tailwindcss/types'
import { ESLint } from 'eslint'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, test, vi } from 'vitest'
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

  test('自动识别 NestJS package 并完全禁止类型导入', async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'harness-factory-'))
    const serverDir = path.join(cwd, 'projects/server')
    const clientDir = path.join(cwd, 'projects/client')
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)

    mkdirSync(serverDir, { recursive: true })
    mkdirSync(clientDir, { recursive: true })
    writeFileSync(path.join(cwd, 'package.json'), '{}')
    writeFileSync(path.join(serverDir, 'package.json'), JSON.stringify({
      dependencies: { '@nestjs/common': '^11.0.0' },
    }))
    writeFileSync(path.join(clientDir, 'package.json'), JSON.stringify({
      dependencies: { react: '^19.0.0' },
    }))
    writeFileSync(path.join(serverDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      },
      files: [],
    }))

    try {
      const configs = await resolveConfig({
        kerros: false,
        react: false,
        tailwind: false,
      })
      const parserConfig = configs.find(config => config.name === 'harness/typescript-parser-options/0')
      const nestjsConfig = configs.find(config => config.name === 'harness/nestjs-no-type-imports/0')
      const eslint = new ESLint({
        overrideConfig: configs,
        overrideConfigFile: true,
      })
      const [result] = await eslint.lintText(
        `import { Dependency } from './dependency'\nfunction Injectable(): ClassDecorator { return () => {} }\n@Injectable()\nclass Service { constructor(readonly dependency: Dependency) {} }\n`,
        { filePath: path.join(serverDir, 'service.ts') },
      )
      const [plainResult] = await eslint.lintText(
        `import { Dependency } from './dependency'\ntype Value = Dependency\nexport type { Value }\n`,
        { filePath: path.join(serverDir, 'plain.ts') },
      )
      const [typeImportResult] = await eslint.lintText(
        `import type { Dependency } from './dependency'\ntype Value = Dependency\nexport type { Value }\n`,
        { filePath: path.join(serverDir, 'type-import.ts') },
      )
      const [inlineTypeImportResult] = await eslint.lintText(
        `import { type Dependency } from './dependency'\ntype Value = Dependency\nexport type { Value }\n`,
        { filePath: path.join(serverDir, 'inline-type-import.ts') },
      )
      const [clientResult] = await eslint.lintText(
        `import { Dependency } from './dependency'\ntype Value = Dependency\nexport type { Value }\n`,
        { filePath: path.join(clientDir, 'plain.ts') },
      )

      expect(parserConfig?.files).toEqual(['projects/server/**/*.{ts,tsx,mts,cts}'])
      expect(parserConfig?.languageOptions?.parserOptions).toMatchObject({
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      })
      expect(nestjsConfig?.files).toEqual(['projects/server/**/*.{ts,tsx,mts,cts}'])
      expect(result?.messages.map(message => message.ruleId)).not.toContain('ts/consistent-type-imports')
      expect(plainResult?.messages.map(message => message.ruleId)).not.toContain('ts/consistent-type-imports')
      expect(typeImportResult?.messages.map(message => message.ruleId)).toContain('ts/consistent-type-imports')
      expect(inlineTypeImportResult?.messages.map(message => message.ruleId)).toContain('ts/consistent-type-imports')
      expect(clientResult?.messages.map(message => message.ruleId)).toContain('ts/consistent-type-imports')
    }
    finally {
      cwdSpy.mockRestore()
      rmSync(cwd, { force: true, recursive: true })
    }
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

test.each(['strict', 'recommended'] as const)('%s 行宽策略不依赖 React', async (preset) => {
  const lines = [49, 50, 99, 100, 101].map(length => 'x'.repeat(length))
  const messages = await lintFixture('line-width.js', lines.join('\n'), {
    preset,
    react: false,
    kerros: false,
    tailwind: false,
    typescript: false,
  })
  expect(messages.filter(message => ['harness/prefer-line-wrap', 'harness/max-line-length'].includes(message.ruleId ?? '')))
    .toMatchObject(preset === 'recommended'
      ? []
      : [
          { line: 2, severity: 1, ruleId: 'harness/prefer-line-wrap' },
          { line: 3, severity: 1, ruleId: 'harness/prefer-line-wrap' },
          { line: 4, severity: 1, ruleId: 'harness/prefer-line-wrap' },
          { line: 5, severity: 2, ruleId: 'harness/max-line-length' },
        ])
})

test('严格行宽检查忽略注释但保留行尾注释前的代码检查', async () => {
  const lines = [
    `//${'x'.repeat(160)}`,
    `/*${'x'.repeat(160)}*/`,
    `const x = 1 //${'x'.repeat(160)}`,
    `${'x'.repeat(50)} //${'x'.repeat(160)}`,
    `${'x'.repeat(101)} //${'x'.repeat(160)}`,
  ]
  const messages = await lintFixture('comments.js', lines.join('\n'), {
    react: false,
    kerros: false,
    tailwind: false,
    typescript: false,
  })
  expect(messages.filter(message => ['harness/prefer-line-wrap', 'harness/max-line-length'].includes(message.ruleId ?? '')))
    .toMatchObject([
      { line: 4, severity: 1, ruleId: 'harness/prefer-line-wrap' },
      { line: 5, severity: 2, ruleId: 'harness/max-line-length' },
    ])
})

test('行宽与导入导出、列表换行和 JSX 折叠兼容', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    fix: true,
    overrideConfig: await resolveConfig({
      react: true,
      kerros: false,
      tailwind: false,
      rules: { 'harness/short-jsx-return': 'error' },
    }),
  })
  const longName = 'x'.repeat(80)
  const samples = [
    `import type { ThreadContextBudget, ThreadContextBudgetEstimation } from '@qygent/protocol'\nexport type { ThreadContextBudget, ThreadContextBudgetEstimation }`,
    `const ${longName} = 1\nexport { ${longName} }`,
    `processData(\n  firstArgumentWithLongName,\n  secondArgumentWithLongName,\n  thirdArgumentWithLongName,\n)`,
    `export const url = 'https://${'x'.repeat(140)}'`,
    `export const pattern = /${'x'.repeat(140)}/`,
    `export const template = \`${'x'.repeat(140)}\``,
    ...[45, 49].map(length => `export function View() {\n  return (\n    <Component value={${'x'.repeat(length - '  return <Component value={} />'.length)}} />\n  )\n}`),
  ]
  for (const source of samples) {
    const [result] = await eslint.lintText(source, { filePath: 'layout.tsx' })
    const conflicts = result!.messages.filter(message => [
      'harness/prefer-line-wrap',
      'harness/max-line-length',
      'harness/short-jsx-return',
      'harness/named-import-export-layout',
      'antfu/consistent-list-newline',
    ].includes(message.ruleId ?? ''))
    // 普通长变量声明仍应提示；命名导出行不提示。
    expect(conflicts).toHaveLength(source.startsWith('const ') ? 1 : 0)
  }
})

test.each(['strict', 'recommended'] as const)('%s 短 JSX 默认启用范围与自动修复', async (preset) => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    fix: true,
    overrideConfig: await resolveConfig({ preset, react: true, tailwind: false, kerros: false }),
  })
  const code = 'export function View() {\n  return (\n    <Component\n      value={value}\n    />\n  )\n}'
  const [result] = await eslint.lintText(code, { filePath: 'short-layout.tsx' })
  const output = result!.output ?? code
  expect(output.includes('return <Component value={value} />')).toBe(preset === 'strict')
  expect(result!.messages.filter(message => /short-jsx-return|prefer-line-wrap|max-len|consistent-list-newline/.test(message.ruleId ?? ''))).toEqual([])
  const [second] = await eslint.lintText(output, { filePath: 'short-layout.tsx' })
  expect(second!.output ?? output).toBe(output)
})

test('strict 关闭包含缩进的原始 max-len，统一使用非空格字符计数', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: await resolveConfig({ react: false, kerros: false, tailwind: false }),
  })
  const config = await eslint.calculateConfigForFile('width.ts')
  expect(config.rules['style/max-len'][0]).toBe(0)
  const [result] = await eslint.lintText(`${' '.repeat(160)}call(value)`, { filePath: 'width.ts' })
  expect(result!.messages.filter(message => ['style/max-len', 'harness/max-line-length', 'harness/prefer-line-wrap'].includes(message.ruleId ?? ''))).toEqual([])
})
