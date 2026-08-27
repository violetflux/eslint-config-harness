import parser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import { describe, test } from 'vitest'

/** -------------------- 测试框架 -------------------- */
RuleTester.describe = describe
RuleTester.it = test
RuleTester.itOnly = test.only

/** 使用 TypeScript ESTree 与 Flat Config 的统一规则测试器 */
export const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    parser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
    sourceType: 'module',
  },
})
