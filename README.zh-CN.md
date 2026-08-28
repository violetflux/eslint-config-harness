# @violetflux/eslint-config-harness

[English](./README.md) | 简体中文

基于 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的 ESLint Flat Config，为 TypeScript、React、Vue、Tailwind CSS、Kerros 和其他代码质量规则提供预设与集成。

- 一行配置获得实用默认值
- 支持 TypeScript、React、Vue 2、Vue 3、JSON、YAML 和 Markdown
- 可选的 Tailwind CSS 与 Kerros 集成
- `recommended` 和 `strict` 两套预设
- 支持规则覆盖与 Flat Config 组合

## 使用

```bash
pnpm add -D @violetflux/eslint-config-harness eslint typescript
```

```js
// eslint.config.mjs
import harness from '@violetflux/eslint-config-harness'

export default harness()
```

默认使用 `strict`，启用 TypeScript，并自动配置项目中可用的集成。

大部分项目只需要记住这些规则：

- 不传集成参数时自动检测
- 传 `true` 或 `false` 强制启用或关闭
- 传对象配置文件范围和高级选项
- 用顶层 `rules` 最终覆盖规则
- 用 `.append()` 注册其他 ESLint 插件

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

## 自定义

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `preset` | `'strict'` | 渐进接入可改为 `'recommended'` |
| `typescript` | `true` | 启用 TypeScript 支持 |
| `react` | 自动检测 | 启用 React Hooks 规则 |
| `vue` | 自动检测 | 启用 Vue 规则，沿用 Antfu 原生选项，可通过 `vueVersion` 选择 Vue 2 或 Vue 3 |
| `tailwind` | 自动检测 | 启用 Tailwind 冲突、规范化和拼接检查 |
| `kerros` | 自动检测 | 启用 Kerros 规则 |
| `ignores` | `[]` | 在 `.gitignore` 和 Antfu 默认值基础上追加忽略路径 |
| `rules` | 无 | 在 Harness 策略之后最终覆盖规则 |

<details>
<summary>完整配置示例</summary>

<br>

```js
export default harness({
  // 选择预设
  preset: 'strict',

  // 启用 TypeScript 支持
  typescript: true,

  // true / false / 对象，省略则自动检测
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

## 启用规则

默认 `strict` 由 Antfu 基线、Harness 策略和自动检测到的集成共同组成。下面把始终解析的基础规则与条件集成分开展示，便于判断每条规则为什么会启用。

> [完整规则参考：配置参数、警告、错误和推荐写法](./RULES.md)

### Harness 内置规则

两个预设都会注册内置插件，但只有 `strict` 会启用其中的规则；关闭 React 集成时，两条 React 专用规则也会关闭。

| 规则 | recommended | strict | 适用文件 | 自动修复 | 作用 |
| --- | --- | --- | --- | --- | --- |
| `harness/short-jsx-return` | off | React 下 error | JSX/TSX | 支持 | 短 JSX return 保持单行 |
| `harness/named-import-export-layout` | off | error | JS/JSX/TS/TSX | 支持 | 按默认 120 字符统一命名导入导出布局 |
| `harness/react-hook-order` | off | React 下 error | JS/JSX/TS/TSX | 不支持 | 统一 React 标准 Hook 阶段顺序，自定义 Hook 按需配置 |
| `harness/prefer-cn` | off | warn | JS/JSX/TS/TSX | 部分支持 | 把 `filter(Boolean).join(' ')` class 组合改为 `cn` |
| `harness/class-name-layout` | off | warn | JS/JSX/TS/TSX | 不支持 | 限制过长的静态 class 字符串 |
| `harness/cn-argument-layout` | off | warn | JS/JSX/TS/TSX | 部分支持 | 统一 `cn` 静态参数和换行布局 |
| `harness/prefer-property-shorthand` | off | warn | JS/JSX/TS/TSX | 不支持 | 建议提前命名同源转换值并使用属性简写 |
| `harness/no-redundant-field-alias` | off | warn | JS/JSX/TS/TSX | 不支持 | 减少冗余字段别名 |
| `harness/prefer-local-transformation` | off | warn | JS/JSX/TS/TSX | 不支持 | 建议先命名关键派生字段再投影 |

`prefer-cn` 只在配置的组合函数已处于作用域中时修复简单数组；`cn-argument-layout` 只修复不含注释的长单行调用，涉及语义分组的诊断仍需手动处理。

### Antfu 的规则

下面 9 条是 `@antfu/eslint-config` 自己提供的 `antfu/*` 规则，默认均为 `error`：

| 规则 | 作用 |
| --- | --- |
| `antfu/no-top-level-await` | 禁止顶层 `await` |
| `antfu/import-dedupe` | 合并同一模块的重复导入 |
| `antfu/no-import-dist` | 禁止直接导入其他包的构建产物 |
| `antfu/no-import-node-modules-by-path` | 禁止通过路径直接访问 `node_modules` |
| `antfu/consistent-list-newline` | 统一列表结构的换行方式 |
| `antfu/consistent-chaining` | 统一链式调用布局 |
| `antfu/curly` | 统一控制语句的大括号 |
| `antfu/if-newline` | 统一 `if` 语句换行 |
| `antfu/top-level-function` | 顶层函数优先使用函数声明；React JSX 文件中会被 Harness `strict` 关闭 |

Antfu 还会启用它预设中的 ESLint 核心、TypeScript、import、node、style、regexp、unicorn、JSON、YAML 和 Markdown 规则。除下表明确列出的改动外，Harness 保持 Antfu 的默认配置。

### Harness 对 Antfu 做的调整

Harness 在两个预设中都会额外开启：

| 规则 | 级别 | 作用 |
| --- | --- | --- |
| `no-return-await` | error | 禁止多余的 `return await` |
| `no-void` | error | 禁止使用 `void` |
| `require-await` | error | async 函数必须包含 `await` |

`strict` 会关闭这些 Antfu 默认规则：

| 规则 | 条件或原因 |
| --- | --- |
| `eslint-comments/no-unlimited-disable` | 允许不带规则名的 ESLint disable |
| `jsdoc/no-defaults` | 允许 JSDoc 默认值 |
| `no-console` | 允许 console |
| `node/prefer-global/process` | 不限制 `process` 的使用方式 |
| `prefer-promise-reject-errors` | 允许 reject 非 Error 值 |
| `style/eol-last` | 不强制文件末尾换行 |
| `test/prefer-lowercase-title` | 不强制测试标题小写 |
| `antfu/top-level-function` | 仅 React JSX 文件关闭 |

`strict` 还会调整或增加这些策略：

| 规则 | 最终行为 |
| --- | --- |
| `unused-imports/no-unused-vars` | error；以 `_` 开头的变量、参数和 catch 参数可忽略 |
| `test/consistent-test-it` | error；统一使用 `test` |
| `ts/ban-ts-comment` | error；只允许带说明的 `@ts-ignore` |
| `ts/consistent-type-imports` | error；类型使用 `import type` |
| `no-restricted-syntax` | error；禁止星号导出，并要求私有成员以 `_` 开头；React JSX 另限制函数表达式和箭头函数组件 |
| `jsdoc/require-jsdoc` | error；TypeScript interface 及其成员必须有注释 |
| `max-lines` | error；测试文件最多 2000 行 |

React、Vue、Tailwind CSS 和 Kerros 的条件规则见后面的“集成细节”。

## 扩展其他插件

`harness()` 返回 Flat Config Composer。项目临时使用的插件直接通过 `.append()` 注册：

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

也可以直接追加插件提供的 Flat Config：

```js
export default harness().append(
  ...example.configs.recommended,
)
```

<details>
<summary>集成细节</summary>

<br>

### 自动检测

Harness 可以自动检测 React、Vue、Tailwind CSS 和 Kerros。需要明确控制时，可以为对应集成传入 `true`、`false` 或配置对象。

### TypeScript

默认启用 TypeScript 支持：

```js
export default harness({ typescript: true })
```

传入 `typescript: false` 可以关闭 TypeScript 支持。

### React

React 集成会启用推荐的 `react-hooks/*` 规则；在 `strict` 下还会启用 `harness/react-hook-order`、`harness/short-jsx-return`，并应用上表列出的 JSX 声明限制。

### Vue

检测到 Vue、Nuxt、VitePress 或 Slidev 时会自动启用 Vue 3 规则。Vue 2 项目需要显式指定版本：

```js
export default harness({
  vue: { vueVersion: 2 },
})
```

使用 `vue: true` 可显式启用默认的 Vue 3 规则，使用 `vue: false` 可关闭 Vue 支持。

### Tailwind CSS

Tailwind 入口通常可以自动检测。项目存在多个样式入口或使用自定义结构时，可以显式设置 `entryPoint`。

Tailwind 集成启用：

- `better-tailwindcss/no-conflicting-classes`
- strict 下的 `better-tailwindcss/no-concatenated-classes`
- strict 下的 `better-tailwindcss/enforce-canonical-classes`
- 插件默认 class 选择器及用户传入的 `additionalSelectors`

### Kerros

Kerros 集成包含：

- `kerros/binding-naming`
- `kerros/factory-at-module-scope`
- `kerros/model-convention`
- `kerros/no-broad-store-access`
- `kerros/no-whole-store-selector`
- `kerros/selector-parameter-name`

</details>

## 配置优先级

后出现的配置覆盖前面的同名规则：

1. Antfu 基础配置
2. Harness 预设和可选集成
3. Harness strict 策略
4. 顶层 `rules`
5. 消费项目的 `.append()`

<details>
<summary>VS Code 保存时自动修复</summary>

<br>

安装 [VS Code ESLint 扩展](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)，然后配置：

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

## 包导出

包只提供一个根入口。常规项目只需要默认导出的 `harness`；共享配置和高级组合还可以使用 `configs`、`plugin`、`rules`、`recommendedRules` 和 `strictRules`。

配置工厂和组合模型参考了 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config)。
