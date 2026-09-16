import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { Linter } from 'eslint'
import { plugin } from '../plugin/index.js'
import type { HarnessPreset } from './options.js'

/** -------------------- 规则预设 -------------------- */
/** 低争议规则由 Antfu 与按需第三方集成提供 */
export const recommendedRules = {} satisfies Linter.RulesRecord

/** 严格预设追加的布局与代码组织规则 */
export const strictRules = {
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
} satisfies Linter.RulesRecord

/** -------------------- 配置预设 -------------------- */
/** 低争议 Harness 预设及内置 plugin 注册配置 */
const recommendedConfig = {
  name: 'harness/recommended',
  plugins: {
    harness: plugin,
  },
  rules: recommendedRules,
} satisfies TypedFlatConfigItem

/** 严格 Harness 预设 */
const strictConfig = {
  name: 'harness/strict',
  rules: strictRules,
} satisfies TypedFlatConfigItem

/** 可直接组合的 Harness Flat Config */
export const configs: Record<HarnessPreset, TypedFlatConfigItem[]> = {
  recommended: [recommendedConfig],
  strict: [recommendedConfig, strictConfig],
}

/** -------------------- 内部函数 -------------------- */
/** 返回指定 Harness 预设 */
export function createPresetConfig(preset: HarnessPreset): TypedFlatConfigItem[] {
  return configs[preset]
}
