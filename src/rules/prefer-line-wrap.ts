import { createLineWidthRule } from './line-width.js'

/** 对 50～100 个非空格、Tab 字符的行提示换行 */
export const rule = createLineWidthRule(false)
