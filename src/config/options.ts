import type { OptionsVue } from '@antfu/eslint-config'
import type { Linter } from 'eslint'
import type { Selector } from 'eslint-plugin-better-tailwindcss/types'

/** -------------------- 类型 -------------------- */
/** Harness 内置预设 */
export type HarnessPreset = 'recommended' | 'strict'

/** React 配置 */
export interface HarnessReactOptions {
  /** 应用 React 规则的源码范围 */
  files?: string[]
}

/** Vue 配置，沿用 Antfu 原生选项 */
export type HarnessVueOptions = OptionsVue

/** Tailwind class 表达式选择器 */
export type HarnessTailwindSelector = Selector

/** Tailwind 配置 */
export interface HarnessTailwindOptions {
  /** Tailwind 主题 CSS 或配置入口 */
  entryPoint?: string
  /** 追加到 better-tailwindcss 默认识别位置后的 Tailwind class 选择器 */
  additionalSelectors?: HarnessTailwindSelector[]
  /** 应用 Tailwind 规则的源码范围 */
  files?: string[]
  /** rem 换算使用的根字号 */
  rootFontSize?: number
}

/** Kerros 配置 */
export interface HarnessKerrosOptions {
  /** 应用 Kerros 规则的源码范围 */
  files?: string[]
  /** 最终覆盖的 Kerros 规则 */
  rules?: Linter.RulesRecord
}

/** Harness 配置工厂参数 */
export interface HarnessOptions {
  /** 全局忽略路径 */
  ignores?: string[]
  /** 是否启用 Kerros 轻量规则及其覆盖配置，省略时自动检测 */
  kerros?: boolean | HarnessKerrosOptions
  /** 启用的 Harness 预设 */
  preset?: HarnessPreset
  /** 是否启用 React 规则及其配置，省略时自动检测 */
  react?: boolean | HarnessReactOptions
  /** 最终覆盖的 ESLint 规则 */
  rules?: Linter.RulesRecord
  /** 是否启用 Tailwind 规则及其配置，省略时自动检测 */
  tailwind?: boolean | HarnessTailwindOptions
  /** 是否启用不含类型图的 TypeScript 规则 */
  typescript?: boolean
  /** 是否启用 Vue 规则及其配置，省略时自动检测 */
  vue?: boolean | HarnessVueOptions
}
