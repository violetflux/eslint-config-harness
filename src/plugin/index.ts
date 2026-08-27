import type { ESLint } from 'eslint'
import { rules } from '../rules/index.js'

/** -------------------- 常量 -------------------- */
/** Flat Config 中使用的 Harness 插件命名空间 */
export const pluginNamespace = 'harness'

/** -------------------- 插件出口 -------------------- */
/** Harness 内部 ESLint 插件 */
export const plugin: ESLint.Plugin = {
  meta: {
    name: '@violetflux/eslint-config-harness',
  },
  rules,
}
