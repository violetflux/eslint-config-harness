import type { Rule } from 'eslint'
import { rule as classNameLayout } from './class-name-layout.js'
import { rule as cnArgumentLayout } from './cn-argument-layout.js'
import { rule as namedImportExportLayout } from './named-import-export-layout.js'
import { rule as noRedundantFieldAlias } from './no-redundant-field-alias.js'
import { rule as preferCn } from './prefer-cn.js'
import { rule as preferLocalTransformation } from './prefer-local-transformation.js'
import { rule as preferLineWrap } from './prefer-line-wrap.js'
import { rule as preferPropertyShorthand } from './prefer-property-shorthand.js'
import { rule as reactHookOrder } from './react-hook-order.js'
import { rule as shortJsxReturn } from './short-jsx-return.js'

/** -------------------- 规则注册 -------------------- */
/** Harness 内置规则表 */
export const rules: Record<HarnessRuleName, Rule.RuleModule> = {
  'class-name-layout': classNameLayout,
  'cn-argument-layout': cnArgumentLayout,
  'named-import-export-layout': namedImportExportLayout,
  'no-redundant-field-alias': noRedundantFieldAlias,
  'prefer-cn': preferCn,
  'prefer-local-transformation': preferLocalTransformation,
  'prefer-line-wrap': preferLineWrap,
  'prefer-property-shorthand': preferPropertyShorthand,
  'react-hook-order': reactHookOrder,
  'short-jsx-return': shortJsxReturn,
}

/** Harness 内置规则短名称 */
export type HarnessRuleName
  = | 'class-name-layout'
    | 'cn-argument-layout'
    | 'named-import-export-layout'
    | 'no-redundant-field-alias'
    | 'prefer-cn'
    | 'prefer-local-transformation'
    | 'prefer-line-wrap'
    | 'prefer-property-shorthand'
    | 'react-hook-order'
    | 'short-jsx-return'
