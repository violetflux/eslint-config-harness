import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  ignores: [
    '.vscode/**',
    'coverage/**',
    'dist/**',
  ],
  rules: {
    'import/consistent-type-specifier-style': 'off',
    'jsonc/sort-array-values': 'off',
    'jsonc/sort-keys': 'off',
    'perfectionist/sort-imports': 'off',
    'perfectionist/sort-named-exports': 'off',
    'regexp/strict': 'off',
    'style/quote-props': 'off',
    'style/quotes': 'off',
    'test/consistent-test-it': [
      'error',
      {
        fn: 'test',
        withinDescribe: 'test',
      },
    ],
    'ts/explicit-function-return-type': 'off',
    'unicorn/prefer-includes': 'off',
  },
  typescript: true,
})
