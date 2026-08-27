import { ruleTester } from './support/rule-tester.js'
import { rule } from '../src/rules/named-import-export-layout.js'

/** -------------------- 常量 -------------------- */
/** 默认 120 字符上限的导出边界模块名 */
const boundaryModuleName = 'x'.repeat(120 - `export { Alpha } from ''`.length)

/** -------------------- 测试 -------------------- */
ruleTester.run('named-import-export-layout', rule, {
  valid: [
    `import type { Alpha, Beta as Gamma } from './types'`,
    `export { Alpha, type Beta as Gamma } from './types'`,
    `export type { Alpha as Beta }`,
    `export { Alpha } from '${boundaryModuleName}'`,
    {
      code: `export { Alpha } from './module-name'`,
      options: [{ maxLength: 37 }],
    },
    {
      code: `export {
  Alpha,
} from './module-name'`,
      options: [{ maxLength: 36 }],
    },
  ],
  invalid: [
    {
      code: `export { Alpha } from '${boundaryModuleName}x'`,
      errors: [{ messageId: 'shouldBeMultiline' }],
      output: `export {
  Alpha,
} from '${boundaryModuleName}x'`,
    },
    {
      code: `import type {
  Alpha,
  Beta as Gamma,
} from './types'`,
      errors: [{ messageId: 'shouldBeSingleLine' }],
      output: `import type { Alpha, Beta as Gamma } from './types'`,
    },
    {
      code: `export {
  Alpha,
  type Beta as Gamma,
};`,
      errors: [{ messageId: 'shouldBeSingleLine' }],
      output: `export { Alpha, type Beta as Gamma };`,
    },
    {
      code: `import DefaultValue, { Alpha, type Beta as Gamma } from './types';`,
      errors: [{ messageId: 'shouldBeMultiline' }],
      options: [{ maxLength: 50 }],
      output: `import DefaultValue, {
  Alpha,
  type Beta as Gamma,
} from './types';`,
    },
    {
      code: `export type { Alpha, Beta as Gamma } from './types';`,
      errors: [{ messageId: 'shouldBeMultiline' }],
      options: [{ maxLength: 35 }],
      output: `export type {
  Alpha,
  Beta as Gamma,
} from './types';`,
    },
    {
      code: `function load() {
  return import('./runtime')
}

  export { Alpha, Beta as Gamma } from './types'`,
      errors: [{ messageId: 'shouldBeMultiline' }],
      options: [{ maxLength: 30 }],
      output: `function load() {
  return import('./runtime')
}

  export {
    Alpha,
    Beta as Gamma,
  } from './types'`,
    },
    {
      code: `import {
  // 请保留分组说明
  Alpha,
  Beta,
} from './types'`,
      errors: [{ messageId: 'shouldBeSingleLine' }],
      output: null,
    },
    {
      code: `export { Alpha, Beta as Gamma } from './types'\r\n`,
      errors: [{ messageId: 'shouldBeMultiline' }],
      options: [{ maxLength: 30 }],
      output: `export {\r\n  Alpha,\r\n  Beta as Gamma,\r\n} from './types'\r\n`,
    },
  ],
})
