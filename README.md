# @violetflux/eslint-config-harness

English | [简体中文](./README.zh-CN.md)

An ESLint Flat Config based on [`@antfu/eslint-config`](https://github.com/antfu/eslint-config). It adds Harness code-organization rules on top of Antfu's general rules, with integrations for React, Vue, Tailwind CSS, and Kerros.

## Quick start

### 1. Install

```bash
pnpm add -D @violetflux/eslint-config-harness eslint typescript
```

### 2. Create the config

Create `eslint.config.mjs` in the project root:

```js
import harness from '@violetflux/eslint-config-harness'

export default harness()
```

### 3. Run ESLint

```bash
pnpm exec eslint .
```

That is enough to get started. With no options, Harness uses the `strict` preset, enables TypeScript, and detects React, Vue, Tailwind CSS, and Kerros in the project.

## What the default config does

`harness()` composes these layers in order:

| Source | Default behavior |
| --- | --- |
| Antfu | Enables ESLint core, TypeScript, import, style, regexp, unicorn, JSON, YAML, Markdown, and other rules |
| Harness general additions | Enables three low-noise rules: `no-return-await`, `no-void`, and `require-await` |
| Harness `strict` | Enables nine Harness rules plus stricter TypeScript, test, and code-organization policies |
| Project integrations | Detects React, Vue, Tailwind CSS, and Kerros; unused stacks are not forced on |

For the quickest setup, keep `harness()` as-is. Choose `recommended` only when you need a quieter rollout.

## Choose a preset

Harness provides two presets:

| Preset | Included | Best for |
| --- | --- | --- |
| `strict` | Antfu baseline, three general additions, nine Harness rules, and strict policies | Default; new projects or teams standardizing code style |
| `recommended` | Antfu baseline, three general additions, and recommended rules from enabled integrations | Existing projects adopting the config gradually |

```js
// Default: strict
const strictConfig = harness()

// Gradual rollout
const recommendedConfig = harness({ preset: 'recommended' })
```

`recommended` does not enable any Harness rules or apply the Harness strict policies listed below. React Hooks, Tailwind conflict checks, and Kerros recommended rules still apply when their integrations are enabled.

## Where the rules come from

Rules fall into three groups: rules implemented by Harness, rules supplied by Antfu, and changes Harness makes to Antfu's defaults.

> [Detailed rule reference with options, good patterns, warnings, and errors (简体中文)](./RULES.md)

### Rules implemented by Harness

This package implements ten rules. `strict` enables nine by default; `harness/react-hook-order` also requires React. `harness/short-jsx-return` is disabled by default and remains available for explicit opt-in.

| Rule | Default severity | Autofix | Purpose |
| --- | --- | --- | --- |
| `harness/short-jsx-return` | off by default | Yes | Keep safely collapsible JSX returns on one line (default limit: 75) |
| `harness/prefer-line-wrap` | warn | No | Suggest wrapping at 75–120 characters; `style/max-len` errors above 120 |
| `harness/named-import-export-layout` | error | Yes | Normalize named import and export layout |
| `harness/react-hook-order` | error with React | No | Keep React Hooks in a consistent phase order |
| `harness/prefer-cn` | warn | Partial | Prefer `cn` for class composition |
| `harness/class-name-layout` | warn | No | Limit overly long static class strings |
| `harness/cn-argument-layout` | warn | Partial | Normalize `cn` argument and line layout |
| `harness/prefer-property-shorthand` | warn | No | Name derived values and use property shorthand |
| `harness/no-redundant-field-alias` | warn | No | Avoid redundant field aliases |
| `harness/prefer-local-transformation` | warn | No | Name important derived fields before projection |

Line-width checks apply only to `strict`: `harness/prefer-line-wrap` warns at 75–120 characters inclusive, and `style/max-len` reports an error above 120 without a duplicate warning. Lines below 75 receive no width diagnostic and are not forced onto one line. Neither check autofixes. Length includes indentation, URLs, and strings; standalone and trailing comments are ignored, counts Unicode characters, and uses four-column tab stops. `recommended` enables neither check.

An `error` makes ESLint exit with a non-zero status and normally blocks CI. A `warn` reports the issue without blocking CI by default. `off` disables a rule. Override any severity through top-level `rules`.

### Rules supplied by Antfu

Antfu supplies much more than these nine rules. It composes ESLint core, TypeScript, import, node, style, regexp, unicorn, test, and text-file rule sets. The following `antfu/*` rules are implemented by Antfu itself and are errors by default:

| Rule | Purpose |
| --- | --- |
| `antfu/no-top-level-await` | Disallow top-level `await` |
| `antfu/import-dedupe` | Merge duplicate imports from one module |
| `antfu/no-import-dist` | Disallow direct imports from another package's build output |
| `antfu/no-import-node-modules-by-path` | Disallow accessing `node_modules` by path |
| `antfu/consistent-list-newline` | Normalize line breaks in list-like syntax |
| `antfu/consistent-chaining` | Normalize chained-call layout |
| `antfu/curly` | Normalize braces for control statements |
| `antfu/if-newline` | Normalize line breaks in `if` statements |
| `antfu/top-level-function` | Prefer function declarations at the top level; disabled by Harness in React JSX files |

### What Harness changes from Antfu

Both presets add these rules on top of Antfu:

| Rule | Severity | Purpose |
| --- | --- | --- |
| `no-return-await` | error | Disallow redundant `return await` |
| `no-void` | error | Disallow the `void` operator |
| `require-await` | error | Require `async` functions to contain `await` |

`strict` disables several Antfu defaults that do not match Harness's tradeoffs:

| Rule | Resulting behavior |
| --- | --- |
| `eslint-comments/no-unlimited-disable` | Allows ESLint disable comments without explicit rule names |
| `jsdoc/no-defaults` | Allows default values in JSDoc |
| `no-console` | Allows `console` |
| `node/prefer-global/process` | Does not restrict how `process` is referenced |
| `prefer-promise-reject-errors` | Allows rejecting non-`Error` values |
| `style/eol-last` | Does not require a final newline |
| `test/prefer-lowercase-title` | Does not require lowercase test titles |
| `antfu/top-level-function` | Disabled only in React JSX files |

`strict` also adds or changes these policies:

| Rule | Resulting behavior |
| --- | --- |
| `unused-imports/no-unused-vars` | error; variables, parameters, and catch parameters prefixed with `_` may be unused |
| `test/consistent-test-it` | error; consistently use `test` |
| `ts/ban-ts-comment` | error; `@ts-ignore` requires a description |
| `ts/consistent-type-imports` | error; normally require `import type`; disallow type imports when the nearest `package.json` declares `@nestjs/common` (including dev dependencies); nested packages are evaluated independently |
| `no-restricted-syntax` | error; disallow star exports, require `_` for private members, and add React JSX restrictions |
| `jsdoc/require-jsdoc` | error; TypeScript interfaces and their members require documentation |
| `max-lines` | error; test files may contain at most 2,000 lines |

See [RULES.md](./RULES.md) for rule options and passing/failing examples. The README keeps only the checklist needed for quick decisions.

## Configure project integrations

React, Vue, Tailwind CSS, and Kerros follow the same option pattern:

| Value | Meaning |
| --- | --- |
| omitted | Detect automatically |
| `true` | Force-enable |
| `false` | Force-disable |
| object | Enable and configure file scopes or advanced options |

### TypeScript

TypeScript is enabled by default, using rules that do not require a full type graph:

```js
export default harness({ typescript: true })
```

Harness automatically reads each directory's `tsconfig.json` and passes
`experimentalDecorators` and `emitDecoratorMetadata` to the TypeScript parser. When
a `package.json` directly depends on `@nestjs/common`, Harness completely disallows
`import type` and inline `type` imports in that package so dependency injection and
other decorator metadata always retain runtime values. Other monorepo packages are
unaffected.

Disable it in a JavaScript-only project:

```js
export default harness({ typescript: false })
```

### React

When React is detected, Harness enables the recommended `react-hooks/*` rules, including async callbacks and dependency checks for `useAsyncEffect` without manual `additionalEffectHooks` configuration. `strict` additionally enables `harness/react-hook-order` and React JSX organization policies.

```js
export default harness({
  react: {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
  },
})
```

Use `react: true` to force-enable it or `react: false` to disable it. Disabling React also explicitly disables the two React-specific Harness rules.

### Vue

Vue uses Antfu's native options. It is detected for Vue, Nuxt, VitePress, and Slidev projects, and defaults to Vue 3.

```js
// Force-enable Vue 3
const vue3Config = harness({ vue: true })

// Vue 2 project
const vue2Config = harness({
  vue: { vueVersion: 2 },
})

// Disable Vue
const noVueConfig = harness({ vue: false })
```

### Tailwind CSS

The Tailwind entry point is normally detected automatically. Enabled integrations always check conflicting classes; `strict` also checks string concatenation and canonical classes.

```js
export default harness({
  tailwind: {
    entryPoint: 'src/styles/index.css',
    files: ['src/**/*.{ts,tsx,vue}'],
    rootFontSize: 16,
    additionalSelectors: [],
  },
})
```

| Rule | recommended | strict |
| --- | --- | --- |
| `better-tailwindcss/no-conflicting-classes` | error | error |
| `better-tailwindcss/no-concatenated-classes` | off | error |
| `better-tailwindcss/enforce-canonical-classes` | off | error |

### Kerros

Project: [`violetflux/kerros`](https://github.com/violetflux/kerros).

When Kerros is detected, Harness enables the plugin's six recommended rules:

- `kerros/binding-naming`
- `kerros/factory-at-module-scope`
- `kerros/model-convention`
- `kerros/no-broad-store-access`
- `kerros/no-whole-store-selector`
- `kerros/selector-parameter-name`

You can scope the integration and override individual Kerros rules:

```js
export default harness({
  kerros: {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'kerros/selector-parameter-name': 'off',
    },
  },
})
```

## Override rules

Top-level `rules` is the simplest project-level adjustment. It is applied after Antfu, Harness presets, and integration rules.

```js
export default harness({
  rules: {
    'no-console': 'warn',
    'harness/class-name-layout': 'error',
    'harness/prefer-cn': 'off',
  },
})
```

- `'off'`: disable the rule
- `'warn'`: report a warning without blocking CI by default
- `'error'`: report an error and make ESLint exit with a non-zero status
- `['error', { ...options }]`: set severity and pass rule options

See the [detailed rule reference](./RULES.md) for options supported by each Harness rule.

## Complete configuration example

This example shows every option together. Most projects do not need to specify all of them.

```js
import harness from '@violetflux/eslint-config-harness'

export default harness({
  preset: 'strict',
  typescript: true,
  react: {
    files: ['src/**/*.{ts,tsx}'],
  },
  vue: {
    vueVersion: 2,
  },
  tailwind: {
    entryPoint: 'src/styles/index.css',
    files: ['src/**/*.{ts,tsx,vue}'],
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

## Extend with another ESLint plugin

`harness()` returns a Flat Config Composer. Register another plugin and its rules with `.append()`:

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

If a plugin already provides Flat Config, append it directly:

```js
export default harness().append(
  ...example.configs.recommended,
)
```

## Configuration order

Later entries override earlier rules with the same name:

1. Antfu base config
2. Harness preset and optional integrations
3. Harness `strict` policies
4. Top-level `rules`
5. Project `.append()` entries

<details>
<summary>Fix on save in VS Code</summary>

<br>

Install the [VS Code ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), then configure:

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

The package has one root entry. Most projects only need the default `harness` export. Shared configs and advanced composition can also use `configs`, `plugin`, `rules`, `recommendedRules`, and `strictRules`.

The config factory and composition model are based on [`@antfu/eslint-config`](https://github.com/antfu/eslint-config).
