# @violetflux/eslint-config-harness

English | [简体中文](./README.zh-CN.md)

An opinionated ESLint Flat Config based on [`@antfu/eslint-config`](https://github.com/antfu/eslint-config), with presets and integrations for TypeScript, React, Tailwind CSS, Kerros, and additional code-quality rules.

- One-line setup with practical defaults
- TypeScript, React, JSON, YAML, and Markdown support
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

Harness can detect React, Tailwind CSS, and Kerros automatically. Set an integration to `true`, `false`, or an options object whenever explicit behavior is preferred.

### TypeScript

TypeScript support is enabled by default:

```js
export default harness({ typescript: true })
```

Set `typescript: false` to disable TypeScript support.

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

<details>
<summary>Built-in rules</summary>

<br>

| Rule | strict | Fix | Purpose |
| --- | --- | --- | --- |
| `harness/short-jsx-return` | error | yes | Keeps short JSX returns on one line |
| `harness/named-import-export-layout` | error | yes | Formats named imports and exports around 120 characters |
| `harness/react-hook-order` | error | no | Orders standard React Hook stages; custom Hooks are opt-in |
| `harness/prefer-cn` | warn | partial | Replaces `filter(Boolean).join(' ')` class composition with `cn` |
| `harness/class-name-layout` | warn | no | Prevents overly long static class strings |
| `harness/cn-argument-layout` | warn | partial | Normalizes static `cn` arguments and line layout |
| `harness/prefer-property-shorthand` | warn | no | Encourages named transformations and property shorthand |
| `harness/no-redundant-field-alias` | warn | no | Reduces redundant field aliases |
| `harness/prefer-local-transformation` | warn | no | Encourages naming important derived fields before projection |

`prefer-cn` fixes simple arrays only when the configured composition function is already in scope. `cn-argument-layout` fixes uncommented long single-line calls; semantic regrouping remains diagnostic-only.

Configure rule options through top-level `rules`:

```js
export default harness({
  rules: {
    'harness/named-import-export-layout': ['error', { maxLength: 100 }],
    'harness/class-name-layout': ['warn', { maxLength: 64 }],
    'harness/cn-argument-layout': ['warn', {
      cnNames: ['cn', 'cx'],
      maxLength: 64,
      segmentDifference: 32,
    }],
  },
})
```

Available built-in rule options:

| Rule | Options |
| --- | --- |
| `short-jsx-return` | `maxLength` |
| `named-import-export-layout` | `maxLength` |
| `react-hook-order` | `barrier`, `groups`, `order` |
| `prefer-cn` | `classNames`, `cnNames` |
| `class-name-layout` | `classNames`, `maxLength` |
| `cn-argument-layout` | `cnNames`, `maxLength`, `segmentDifference` |
| `prefer-property-shorthand` | `ignoredFunctions`, `requireDestructuredSource` |
| `no-redundant-field-alias` | `checkReturnAliases`, `ignoredFunctionSuffixes`, `temporaryAliasSuffixes` |
| `prefer-local-transformation` | `contexts`, `maxProperties`, `maxTransformations`, `minShorthandProperties` |

`react-hook-order.groups` maps stage names to Hook names or `{ pattern, flags }` matchers. `order` selects the stage order, while `barrier` controls whether Hooks may appear after ordinary statements.

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
