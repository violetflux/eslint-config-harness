import { createLineWidthRule } from './line-width.js'

/** 限制单行非空格、Tab 字符数不超过 100 */
export const rule = createLineWidthRule(true)
