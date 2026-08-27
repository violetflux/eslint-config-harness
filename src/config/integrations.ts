import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type {
  HarnessKerrosOptions,
  HarnessPreset,
  HarnessReactOptions,
  HarnessTailwindOptions,
} from './options.js'
import {
  detectTailwindEntryPoint,
  readCssDependencyFiles,
} from './detection.js'

/** -------------------- 常量 -------------------- */
/** 默认 JavaScript 与 TypeScript 源码范围 */
const sourceFiles = ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}']
/** -------------------- 核心函数 -------------------- */
/** 创建 React Hooks 推荐配置 */
export async function createReactConfig(options: true | HarnessReactOptions) {
  const files = options === true ? sourceFiles : options.files ?? sourceFiles
  const { default: reactHooks } = await import('eslint-plugin-react-hooks')

  return {
    ...reactHooks.configs.flat.recommended,
    name: 'harness/react',
    files,
  } as TypedFlatConfigItem
}

/** 创建 Tailwind 正确性与严格风格配置 */
export async function createTailwindConfig(
  options: true | HarnessTailwindOptions,
  preset: HarnessPreset,
) {
  const [
    { default: betterTailwindcss },
    { getDefaultSelectors },
  ] = await Promise.all([
    import('eslint-plugin-better-tailwindcss'),
    import('eslint-plugin-better-tailwindcss/api/defaults'),
  ])
  const tailwindOptions = options === true ? {} : options
  const {
    additionalSelectors = [],
    files = sourceFiles,
    rootFontSize = 16,
  } = tailwindOptions
  const entryPoint = tailwindOptions.entryPoint ?? detectTailwindEntryPoint()
  const selectors = [
    ...getDefaultSelectors(),
    ...additionalSelectors,
  ]
  const ruleOptions = {
    ...(entryPoint ? { entryPoint } : {}),
    rootFontSize,
    selectors,
  }
  const cacheKey = entryPoint ? createTailwindCacheKey(entryPoint) : undefined

  return {
    name: 'harness/tailwind',
    files,
    plugins: {
      'better-tailwindcss': betterTailwindcss,
    },
    ...(cacheKey
      ? { settings: { 'harness/tailwind-cache-key': cacheKey } }
      : {}),
    rules: {
      'better-tailwindcss/enforce-canonical-classes': preset === 'strict'
        ? ['error', { ...ruleOptions, collapse: false, logical: false }]
        : 'off',
      'better-tailwindcss/no-concatenated-classes': preset === 'strict'
        ? ['error', ruleOptions]
        : 'off',
      'better-tailwindcss/no-conflicting-classes': ['error', ruleOptions],
    },
  } satisfies TypedFlatConfigItem
}

/** 创建不依赖类型图的 Kerros 轻量配置 */
export async function createKerrosConfig(options: true | HarnessKerrosOptions) {
  const kerrosOptions = options === true ? {} : options
  const { default: kerrosPlugin } = await import('@violetflux/eslint-plugin-kerros')
  const rawPreset = kerrosPlugin.configs?.recommended

  if (!rawPreset || Array.isArray(rawPreset))
    throw new Error('The Kerros ESLint plugin does not provide a recommended flat config')

  const preset = rawPreset as TypedFlatConfigItem

  return {
    ...preset,
    name: 'harness/kerros',
    files: kerrosOptions.files ?? preset.files,
    rules: {
      ...preset.rules,
      ...kerrosOptions.rules,
    },
  } as TypedFlatConfigItem
}

/** -------------------- 内部函数 -------------------- */
/** 把入口实际加载的 CSS 内容纳入 ESLint 缓存键 */
function createTailwindCacheKey(entryPoint: string) {
  const cwd = process.cwd()
  const hash = createHash('sha256')

  for (const file of readCssDependencyFiles(entryPoint, cwd)) {
    hash.update(path.relative(cwd, file))
    hash.update(readFileSync(file))
  }

  return hash.digest('hex')
}
