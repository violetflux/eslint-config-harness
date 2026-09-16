import type { TypedFlatConfigItem } from '@antfu/eslint-config'

/** -------------------- 类型 -------------------- */
/** Strict 策略按已启用语言与集成选择规则 */
interface StrictPolicyOptions {
  /** 是否启用 React 与 JSX 策略 */
  react: boolean
  /** 是否启用 TypeScript 策略 */
  typescript: boolean
}

/** -------------------- 常量 -------------------- */
/** 通用 TypeScript 源码范围 */
const typescriptFiles = ['**/*.{ts,tsx,mts,cts}']
/** 通用 JSX 源码范围 */
const jsxFiles = ['**/*.{jsx,tsx}']

/** TypeScript 禁止的遗留与宽泛语法 */
const restrictedTypeScriptSyntax = [
  'TSEnumDeclaration[const=true]',
  'TSExportAssignment',
  {
    selector: 'ExportAllDeclaration',
    message: 'Star exports are not allowed. Export values and types explicitly.',
  },
  {
    selector: ':matches(PropertyDefinition, AccessorProperty)[accessibility="private"][key.type="Identifier"]:not([key.name=/^_/])',
    message: 'Private members must start with an underscore.',
  },
  {
    selector: ':matches(MethodDefinition, TSAbstractMethodDefinition)[accessibility="private"]:not([kind="constructor"])[key.type="Identifier"]:not([key.name=/^_/])',
    message: 'Private members must start with an underscore.',
  },
  {
    selector: 'TSParameterProperty[accessibility="private"][parameter.type="Identifier"]:not([parameter.name=/^_/])',
    message: 'Private parameter properties must start with an underscore.',
  },
  {
    selector: 'TSParameterProperty[accessibility="private"][parameter.type="AssignmentPattern"][parameter.left.type="Identifier"]:not([parameter.left.name=/^_/])',
    message: 'Private parameter properties must start with an underscore.',
  },
]

/** JSX 函数表达式限制 */
const restrictedJsxSyntax = [
  ...restrictedTypeScriptSyntax,
  {
    selector: 'FunctionExpression',
    message: 'Function expressions are not allowed in JSX files. Use function declarations for components and arrow functions for callbacks.',
  },
]

/** -------------------- 核心函数 -------------------- */
/** 创建不依赖项目目录与业务包名的严格策略 */
export function createStrictPolicyConfigs(options: StrictPolicyOptions): TypedFlatConfigItem[] {
  const configs: TypedFlatConfigItem[] = [
    {
      name: 'harness/strict-overrides',
      rules: {
        'eslint-comments/no-unlimited-disable': 'off',
        'jsdoc/no-defaults': 'off',
        'no-console': 'off',
        'node/prefer-global/process': 'off',
        'prefer-promise-reject-errors': 'off',
        'style/eol-last': 'off',
        'style/max-len': 'off',
        'test/consistent-test-it': ['error', { fn: 'test', withinDescribe: 'test' }],
        'test/prefer-lowercase-title': 'off',
        'unused-imports/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
  ]

  if (options.typescript) {
    configs.push({
      name: 'harness/typescript-overrides',
      files: ['**/*.{ts,tsx,mts,cts}'],
      rules: {
        '@typescript-eslint/ban-ts-comment': [
          'error',
          {
            'ts-check': true,
            'ts-expect-error': true,
            'ts-ignore': 'allow-with-description',
            'ts-nocheck': true,
          },
        ],
        'ts/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      },
    }, {
      name: 'harness/typescript-syntax',
      files: typescriptFiles,
      rules: {
        'no-restricted-syntax': ['error', ...restrictedTypeScriptSyntax],
      },
    }, {
      name: 'harness/interface-comments',
      files: typescriptFiles,
      rules: {
        'jsdoc/require-jsdoc': [
          'error',
          {
            contexts: [
              'TSInterfaceDeclaration',
              'TSInterfaceBody > TSCallSignatureDeclaration',
              'TSInterfaceBody > TSConstructSignatureDeclaration',
              'TSInterfaceBody > TSIndexSignature',
              'TSInterfaceBody > TSMethodSignature',
              'TSInterfaceBody > TSPropertySignature',
            ],
            enableFixer: false,
            require: { FunctionDeclaration: false },
          },
        ],
      },
    })
  }

  if (options.react) {
    configs.push({
      name: 'harness/jsx-functions',
      files: jsxFiles,
      rules: {
        'antfu/top-level-function': 'off',
        'no-restricted-syntax': ['error', ...restrictedJsxSyntax],
      },
    }, {
      name: 'harness/react-component-declarations',
      files: jsxFiles,
      ignores: ['**/*.{test,spec}.{jsx,tsx}'],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...restrictedJsxSyntax,
          {
            selector: 'VariableDeclarator[id.type="Identifier"][id.name=/^[A-Z]/][init.type="ArrowFunctionExpression"]',
            message: 'Declare React components with function declarations.',
          },
        ],
      },
    })
  }

  configs.push({
    name: 'harness/test-file-size',
    files: ['**/*.test.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    rules: {
      'max-lines': ['error', { max: 2000, skipBlankLines: false, skipComments: false }],
    },
  }, {
    name: 'harness/test-style-overrides',
    files: ['**/*.{test,spec}.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    rules: {
      'harness/react-hook-order': 'off',
    },
  })

  return configs
}
