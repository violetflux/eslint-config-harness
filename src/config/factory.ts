import type { OptionsConfig, TypedFlatConfigItem } from '@antfu/eslint-config'
import antfu from '@antfu/eslint-config'
import type { HarnessOptions } from './options.js'
import {
  detectIntegrations,
  detectNestJsScopes,
  detectTypeScriptParserScopes,
} from './detection.js'
import {
  createKerrosConfig,
  createReactConfig,
  createTailwindConfig,
} from './integrations.js'
import { createStrictPolicyConfigs } from './policies.js'
import { createPresetConfig } from './presets.js'

/** -------------------- 常量 -------------------- */
/** Harness 在 Antfu 基础上启用的低争议规则 */
const recommendedConfig = {
  name: 'harness/general-recommended',
  rules: {
    'no-return-await': 'error',
    'no-void': 'error',
    'require-await': 'error',
  },
} satisfies TypedFlatConfigItem

/** -------------------- 核心函数 -------------------- */
/** 创建 Antfu 风格的 Harness Flat Config */
export function harness(options: HarnessOptions = {}): ReturnType<typeof antfu> {
  const typescript = options.typescript ?? true
  const needsDetection = options.kerros === undefined
    || options.react === undefined
    || options.tailwind === undefined
  const detected = needsDetection
    ? detectIntegrations(undefined, { tailwind: options.tailwind === undefined })
    : { kerros: false, react: false, tailwind: false }
  const {
    ignores = [],
    kerros = detected.kerros,
    preset = 'strict',
    react = detected.react,
    rules,
    tailwind = detected.tailwind,
    vue,
  } = options
  const antfuOptions: OptionsConfig = {
    ignores,
    react: false,
    typescript,
    ...(vue === undefined ? {} : { vue }),
  }
  const additions: Array<TypedFlatConfigItem | Promise<TypedFlatConfigItem>> = [
    recommendedConfig,
  ]

  if (react)
    additions.push(createReactConfig(react))
  additions.push(...createPresetConfig(preset))
  if (preset === 'strict' && !react) {
    additions.push({
      name: 'harness/react-disabled',
      rules: {
        'harness/react-hook-order': 'off',
        'harness/short-jsx-return': 'off',
      },
    })
  }
  if (tailwind)
    additions.push(createTailwindConfig(tailwind, preset))
  if (kerros)
    additions.push(createKerrosConfig(kerros))
  const composer = antfu(antfuOptions).append(...additions)

  if (typescript) {
    for (const [index, scope] of detectTypeScriptParserScopes().entries()) {
      composer.append({
        name: `harness/typescript-parser-options/${index}`,
        files: scope.files,
        languageOptions: {
          parserOptions: {
            emitDecoratorMetadata: scope.emitDecoratorMetadata,
            experimentalDecorators: scope.experimentalDecorators,
          },
        },
      })
    }
  }

  if (preset === 'strict') {
    composer.append(...createStrictPolicyConfigs({
      react: Boolean(react),
      typescript: typescript !== false,
    }))
  }
  if (typescript) {
    for (const [index, scope] of detectNestJsScopes().entries()) {
      composer.append({
        name: `harness/nestjs-no-type-imports/${index}`,
        files: scope.files,
        ignores: scope.ignores,
        rules: {
          'ts/consistent-type-imports': ['error', { prefer: 'no-type-imports' }],
        },
      })
    }
  }
  if (rules) {
    composer.append({
      name: 'harness/user-overrides',
      rules,
    })
  }

  return composer
}
