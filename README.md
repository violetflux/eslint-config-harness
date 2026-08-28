# @violetflux/eslint-config-harness

English | [简体中文](./README.zh-CN.md)

An opinionated ESLint Flat Config based on [`@antfu/eslint-config`](https://github.com/antfu/eslint-config), with presets and integrations for TypeScript, React, Vue, Tailwind CSS, Kerros, and additional code-quality rules.

- One-line setup with practical defaults
- TypeScript, React, Vue 2, Vue 3, JSON, YAML, and Markdown support
- Optional Tailwind CSS and Kerros integrations
- `recommended` and `strict` presets
- Rule overrides and Flat Config composition

## Usage

```bash
pnpm add -D @violetflux/eslint-config-harness eslint typescript
```

```js
// eslint.config.mjs
import harness from '@violetflux/eslint-config-harness'

export default harness()
```

The default `strict` preset enables TypeScript and automatically configures integrations available in the project.

Most projects only need to know these rules:

- omit an integration to auto-detect it
- pass `true` or `false` to force it on or off
- pass an object for advanced options
- use top-level `rules` for final rule overrides
- use `.append()` to register another ESLint plugin

```js
export default harness({
  react: true,
  kerros: false,
  tailwind: {
    entryPoint: 'src/styles/index.css',
  },
  rules: {
    'harness/short-jsx-return': 'off',
  },
})
```

## Customization

| Option | Default | Purpose |
| --- | --- | --- |
| `preset` | `'strict'` | Use `'recommended'` for a lower-noise rollout |
| `typescript` | `true` | Enable TypeScript support |
| `react` | auto | Enable React Hooks rules |
| `vue` | auto | Enable Vue rules with native Antfu options; set `vueVersion` for Vue 2 or Vue 3 |
| `tailwind` | auto | Enable Tailwind conflict, canonicalization, and concatenation checks |
| `kerros` | auto | Enable Kerros rules |
| `ignores` | `[]` | Add patterns on top of `.gitignore` and Antfu defaults |
| `rules` | none | Override registered rules after Harness policies |

<details>
<summary>Complete options example</summary>

<br>

```js
export default harness({
  // Select a preset
  preset: 'strict',

  // Enable TypeScript support
  typescript: true,

  // true / false / object, or omit to auto-detect
  react: {
    files: ['src/**/*.{ts,tsx}'],
  },
  vue: {
    vueVersion: 2,
  },
  tailwind: {
    entryPoint: 'src/styles/index.css',
    files: ['src/**/*.tsx'],
    rootFontSize: 16,
    additionalSelectors: [],
  },
  kerros: {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'kerros/selector-parameter-name': 'off',
    },
  },
  ignores: ['generated/**'],
  rules: {
    'no-console': 'warn',
  },
})
```

</details>

## Enabled rules

The default `strict` preset combines the Antfu baseline, Harness policies, and any auto-detected integrations. The summary below separates the always-resolved baseline from conditional integrations so it is clear why a rule is active.

> [Detailed rule reference: options, warnings, errors, and examples (简体中文)](./RULES.md)

### Harness built-in rules

The built-in plugin is registered in both presets, but its rules are enabled by `strict`. React-specific rules are disabled when the React integration is off.

| Rule | recommended | strict | Applies to | Fix | Purpose |
| --- | --- | --- | --- | --- | --- |
| `harness/short-jsx-return` | off | error with React | JSX/TSX | yes | Keeps short JSX returns on one line |
| `harness/named-import-export-layout` | off | error | JS/JSX/TS/TSX | yes | Formats named imports and exports around 120 characters |
| `harness/react-hook-order` | off | error with React | JS/JSX/TS/TSX | no | Orders standard React Hook stages; custom Hooks are opt-in |
| `harness/prefer-cn` | off | warn | JS/JSX/TS/TSX | partial | Replaces `filter(Boolean).join(' ')` class composition with `cn` |
| `harness/class-name-layout` | off | warn | JS/JSX/TS/TSX | no | Prevents overly long static class strings |
| `harness/cn-argument-layout` | off | warn | JS/JSX/TS/TSX | partial | Normalizes static `cn` arguments and line layout |
| `harness/prefer-property-shorthand` | off | warn | JS/JSX/TS/TSX | no | Encourages named transformations and property shorthand |
| `harness/no-redundant-field-alias` | off | warn | JS/JSX/TS/TSX | no | Reduces redundant field aliases |
| `harness/prefer-local-transformation` | off | warn | JS/JSX/TS/TSX | no | Encourages naming important derived fields before projection |

`prefer-cn` fixes simple arrays only when the configured composition function is already in scope. `cn-argument-layout` fixes uncommented long single-line calls; semantic regrouping remains diagnostic-only.

### Antfu rules

These 9 rules come from the `antfu/*` namespace in `@antfu/eslint-config`. They are all `error` by default:

| Rule | Purpose |
| --- | --- |
| `antfu/no-top-level-await` | Disallows top-level `await` |
| `antfu/import-dedupe` | Merges duplicate imports from the same module |
| `antfu/no-import-dist` | Prevents direct imports from another package's build output |
| `antfu/no-import-node-modules-by-path` | Prevents path-based access to `node_modules` |
| `antfu/consistent-list-newline` | Normalizes newlines in list-like structures |
| `antfu/consistent-chaining` | Normalizes chained-call layout |
| `antfu/curly` | Normalizes braces around control statements |
| `antfu/if-newline` | Normalizes `if` statement newlines |
| `antfu/top-level-function` | Prefers function declarations at the top level; Harness `strict` disables it in React JSX files |

Antfu also enables its standard ESLint core, TypeScript, import, node, style, regexp, unicorn, JSON, YAML, and Markdown presets. Harness keeps those defaults except for the explicit changes below.

### What Harness changes in Antfu

Harness enables these rules in both presets:

| Rule | Level | Purpose |
| --- | --- | --- |
| `no-return-await` | error | Disallows redundant `return await` |
| `no-void` | error | Disallows `void` expressions |
| `require-await` | error | Requires async functions to contain `await` |

`strict` disables these Antfu defaults:

| Rule | Condition or reason |
| --- | --- |
| `eslint-comments/no-unlimited-disable` | Allows ESLint disable comments without rule names |
| `jsdoc/no-defaults` | Allows defaults in JSDoc |
| `no-console` | Allows console calls |
| `node/prefer-global/process` | Does not restrict how `process` is referenced |
| `prefer-promise-reject-errors` | Allows rejecting non-Error values |
| `style/eol-last` | Does not require a final newline |
| `test/prefer-lowercase-title` | Does not require lowercase test titles |
| `antfu/top-level-function` | Disabled only in React JSX files |

`strict` also changes or adds these policies:

| Rule | Final behavior |
| --- | --- |
| `unused-imports/no-unused-vars` | error; ignores variables, arguments, and caught errors prefixed with `_` |
| `test/consistent-test-it` | error; consistently uses `test` |
| `ts/ban-ts-comment` | error; only described `@ts-ignore` comments are allowed |
| `ts/consistent-type-imports` | error; types use `import type` |
| `no-restricted-syntax` | error; disallows star exports and requires private members to start with `_`; React JSX also restricts function expressions and arrow-function components |
| `jsdoc/require-jsdoc` | error; TypeScript interfaces and their members require documentation |
| `max-lines` | error; test files are limited to 2000 lines |

See “Integration details” below for conditional React, Vue, Tailwind CSS, and Kerros rules.

## Extending with another plugin

`harness()` returns a Flat Config Composer. Register one-off project plugins with `.append()`:

```js
import harness from '@violetflux/eslint-config-harness'
import unicorn from 'eslint-plugin-unicorn'

export default harness().append({
  name: 'project/unicorn',
  plugins: {
    unicorn,
  },
  rules: {
    'unicorn/prefer-node-protocol': 'error',
  },
})
```

Flat Config presets can also be appended directly:

```js
export default harness().append(
  ...example.configs.recommended,
)
```

<details>
<summary>Integration details</summary>

<br>

### Automatic detection

Harness can detect React, Vue, Tailwind CSS, and Kerros automatically. Set an integration to `true`, `false`, or an options object whenever explicit behavior is preferred.

### TypeScript

TypeScript support is enabled by default:

```js
export default harness({ typescript: true })
```

Set `typescript: false` to disable TypeScript support.

### React

The React integration enables the recommended `react-hooks/*` rules. Under `strict`, it also enables `harness/react-hook-order` and `harness/short-jsx-return`, and applies the JSX declaration restrictions listed above.

### Vue

Vue 3 rules are enabled automatically when Vue, Nuxt, VitePress, or Slidev is detected. Vue 2 projects should select their version explicitly:

```js
export default harness({
  vue: { vueVersion: 2 },
})
```

Set `vue: true` to explicitly enable the default Vue 3 rules, or `vue: false` to disable Vue support.

### Tailwind CSS

The Tailwind entry point can usually be detected automatically. Set `entryPoint` explicitly for projects with multiple style entry points or a custom setup.

The integration enables:

- `better-tailwindcss/no-conflicting-classes`
- `better-tailwindcss/no-concatenated-classes` in `strict`
- `better-tailwindcss/enforce-canonical-classes` in `strict`
- the plugin's default class selectors plus user-provided `additionalSelectors`

### Kerros

The Kerros integration enables:

- `kerros/binding-naming`
- `kerros/factory-at-module-scope`
- `kerros/model-convention`
- `kerros/no-broad-store-access`
- `kerros/no-whole-store-selector`
- `kerros/selector-parameter-name`

</details>

## Config order

Later configs win:

1. Antfu base config
2. Harness preset and optional integrations
3. Harness strict policies
4. top-level `rules`
5. consumer `.append()` calls

<details>
<summary>VS Code auto-fix on save</summary>

<br>

With the [VS Code ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint):

```jsonc
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  }
}
```

</details>

## Exports

The package exposes one root entry. Most consumers only need the default export; advanced config authors can also import `configs`, `plugin`, `rules`, `recommendedRules`, and `strictRules`.

The factory and composition model are inspired by [`@antfu/eslint-config`](https://github.com/antfu/eslint-config).
