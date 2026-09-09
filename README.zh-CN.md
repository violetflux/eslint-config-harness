# @violetflux/eslint-config-harness

[English](./README.md) | 简体中文

基于 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的 ESLint Flat Config。在 Antfu 的通用规则之上，增加 Harness 自己的代码组织规则，并集成 React、Vue、Tailwind CSS 和 Kerros。

## 快速开始

### 1. 安装

```bash
pnpm add -D @violetflux/eslint-config-harness eslint typescript
```

### 2. 创建配置

在项目根目录创建 `eslint.config.mjs`：

```js
import harness from '@violetflux/eslint-config-harness'

export default harness()
```

### 3. 运行 ESLint

```bash
pnpm exec eslint .
```

到这里就可以用了。零配置默认采用 `strict` 预设、启用 TypeScript，并自动识别项目中的 React、Vue、Tailwind CSS 和 Kerros。

## 默认会做什么

`harness()` 会依次组合这些配置：

| 来源 | 默认行为 |
| --- | --- |
| Antfu | 启用 ESLint 核心、TypeScript、import、style、regexp、unicorn、JSON、YAML、Markdown 等规则 |
| Harness 通用补充 | 启用 3 条低争议规则：`no-return-await`、`no-void`、`require-await` |
| Harness `strict` | 启用 9 条 Harness 内置规则，并补充更严格的 TypeScript、测试和代码组织策略 |
| 项目集成 | 自动识别 React、Vue、Tailwind CSS 和 Kerros；没有安装或使用的技术栈不会强行启用 |

如果你只想快速开始，保持 `harness()` 即可。需要降低接入噪音时，再选择 `recommended`。

## 选择规则强度

Harness 提供两个预设：

| 预设 | 包含内容 | 适合场景 |
| --- | --- | --- |
| `strict` | Antfu 基线、3 条通用补充规则、9 条 Harness 内置规则和严格策略 | 默认值；新项目或希望统一代码风格的项目 |
| `recommended` | Antfu 基线、3 条通用补充规则和已启用集成的推荐规则 | 旧项目渐进接入，先减少新增警告和错误 |

```js
// 默认：严格模式
const strictConfig = harness()

// 渐进接入
const recommendedConfig = harness({ preset: 'recommended' })
```

`recommended` 不启用 9 条 Harness 内置规则，也不会应用后文列出的 Harness 严格策略。React Hooks、Tailwind 冲突检查和 Kerros 推荐规则仍会在对应集成启用时生效。

## 规则从哪里来

规则分成三部分：Harness 自己写的规则、Antfu 提供的规则，以及 Harness 对 Antfu 默认行为的调整。

> [查看完整规则参考：每条规则的配置参数、触发示例、符合示例和规则级别](./RULES.md)

### Harness 自己写的规则

这些规则由本包实现。它们只在 `strict` 中启用；其中两条 React 规则还要求 React 集成处于启用状态。

| 规则 | 默认级别 | 自动修复 | 作用 |
| --- | --- | --- | --- |
| `harness/short-jsx-return` | React 下 error | 支持 | 短 JSX return 保持单行 |
| `harness/named-import-export-layout` | error | 支持 | 统一命名导入和导出的布局 |
| `harness/react-hook-order` | React 下 error | 不支持 | 统一 React Hook 的阶段顺序 |
| `harness/prefer-cn` | warn | 部分支持 | class 组合优先使用 `cn` |
| `harness/class-name-layout` | warn | 不支持 | 限制过长的静态 class 字符串 |
| `harness/cn-argument-layout` | warn | 部分支持 | 统一 `cn` 参数和换行布局 |
| `harness/prefer-property-shorthand` | warn | 不支持 | 建议命名同源转换值并使用属性简写 |
| `harness/no-redundant-field-alias` | warn | 不支持 | 减少冗余字段别名 |
| `harness/prefer-local-transformation` | warn | 不支持 | 建议先命名关键派生字段再投影 |

这里的 `error` 会让 ESLint 以非零状态退出，通常会阻止 CI；`warn` 会显示问题但默认不阻止 CI；`off` 表示关闭规则。项目可以在顶层 `rules` 中修改级别。

### Antfu 提供的规则

Antfu 不只是下面 9 条规则。它还组合了 ESLint 核心、TypeScript、import、node、style、regexp、unicorn、测试及各类文本文件规则。下面是 Antfu 自己实现的 `antfu/*` 规则，默认均为 `error`：

| 规则 | 作用 |
| --- | --- |
| `antfu/no-top-level-await` | 禁止顶层 `await` |
| `antfu/import-dedupe` | 合并同一模块的重复导入 |
| `antfu/no-import-dist` | 禁止直接导入其他包的构建产物 |
| `antfu/no-import-node-modules-by-path` | 禁止通过路径访问 `node_modules` |
| `antfu/consistent-list-newline` | 统一列表结构的换行方式 |
| `antfu/consistent-chaining` | 统一链式调用布局 |
| `antfu/curly` | 统一控制语句的大括号 |
| `antfu/if-newline` | 统一 `if` 语句换行 |
| `antfu/top-level-function` | 顶层函数优先使用函数声明；Harness 在 React JSX 文件中将其关闭 |

### Harness 对 Antfu 做了什么

两个预设都会在 Antfu 基础上增加：

| 规则 | 级别 | 作用 |
| --- | --- | --- |
| `no-return-await` | error | 禁止多余的 `return await` |
| `no-void` | error | 禁止使用 `void` |
| `require-await` | error | `async` 函数必须包含 `await` |

`strict` 会关闭几条不符合 Harness 取舍的 Antfu 默认规则：

| 规则 | 调整后的行为 |
| --- | --- |
| `eslint-comments/no-unlimited-disable` | 允许不写具体规则名的 ESLint disable |
| `jsdoc/no-defaults` | 允许 JSDoc 默认值 |
| `no-console` | 允许 `console` |
| `node/prefer-global/process` | 不限制 `process` 的使用方式 |
| `prefer-promise-reject-errors` | 允许 reject 非 `Error` 值 |
| `style/eol-last` | 不强制文件末尾换行 |
| `test/prefer-lowercase-title` | 不强制测试标题小写 |
| `antfu/top-level-function` | 仅在 React JSX 文件中关闭 |

`strict` 还会增加或改写这些策略：

| 规则 | 最终行为 |
| --- | --- |
| `unused-imports/no-unused-vars` | error；以 `_` 开头的变量、参数和 catch 参数可以不使用 |
| `test/consistent-test-it` | error；统一使用 `test` |
| `ts/ban-ts-comment` | error；`@ts-ignore` 必须带说明 |
| `ts/consistent-type-imports` | error；通常要求类型使用 `import type`；NestJS package 内完全禁止类型导入 |
| `no-restricted-syntax` | error；禁止星号导出，私有成员以 `_` 开头；React JSX 另有限制 |
| `jsdoc/require-jsdoc` | error；TypeScript interface 及其成员必须有注释 |
| `max-lines` | error；测试文件最多 2000 行 |

所有规则的参数和通过/失败示例都集中在 [RULES.md](./RULES.md)，README 只保留便于快速判断的清单。

## 配置项目技术栈

React、Vue、Tailwind CSS 和 Kerros 都遵循相同的配置方式：

| 写法 | 含义 |
| --- | --- |
| 省略 | 自动检测 |
| `true` | 强制启用 |
| `false` | 强制关闭 |
| 对象 | 启用，并设置文件范围或高级参数 |

### TypeScript

TypeScript 默认启用，规则不依赖完整类型图：

```js
export default harness({ typescript: true })
```

Harness 会自动读取各目录的 `tsconfig.json`，并把 `experimentalDecorators` 和
`emitDecoratorMetadata` 传给 TypeScript 解析器。检测到某个 `package.json` 直接依赖
`@nestjs/common` 时，该 package 范围内会完全禁止 `import type` 和行内 `type` 导入，
确保依赖注入及其他装饰器元数据始终能取得运行时值；monorepo 中的其他 package 不受影响。

纯 JavaScript 项目可以关闭：

```js
export default harness({ typescript: false })
```

### React

检测到 React 时会启用 `react-hooks/*` 推荐规则，默认支持 `useAsyncEffect` 的异步回调和依赖检查，无需手动配置 `additionalEffectHooks`。`strict` 还会启用 `harness/react-hook-order`、`harness/short-jsx-return` 和 React JSX 代码组织策略。

```js
export default harness({
  react: {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
  },
})
```

使用 `react: true` 强制启用，使用 `react: false` 关闭。关闭后，两条 Harness React 专用规则也会明确关闭。

### Vue

Vue 沿用 Antfu 的原生配置。检测到 Vue、Nuxt、VitePress 或 Slidev 时会自动启用，默认按 Vue 3 处理。

```js
// 强制启用 Vue 3
const vue3Config = harness({ vue: true })

// Vue 2 项目
const vue2Config = harness({
  vue: { vueVersion: 2 },
})

// 关闭 Vue
const noVueConfig = harness({ vue: false })
```

### Tailwind CSS

Tailwind 入口通常可以自动检测。启用后始终检查冲突 class；`strict` 还会检查字符串拼接和 class 规范化。

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

| 规则 | recommended | strict |
| --- | --- | --- |
| `better-tailwindcss/no-conflicting-classes` | error | error |
| `better-tailwindcss/no-concatenated-classes` | off | error |
| `better-tailwindcss/enforce-canonical-classes` | off | error |

### Kerros

项目地址：[`violetflux/kerros`](https://github.com/violetflux/kerros)。

检测到 Kerros 时会启用插件的 6 条推荐规则：

- `kerros/binding-naming`
- `kerros/factory-at-module-scope`
- `kerros/model-convention`
- `kerros/no-broad-store-access`
- `kerros/no-whole-store-selector`
- `kerros/selector-parameter-name`

可以限定文件范围，并覆盖单条 Kerros 规则：

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

## 覆盖规则

顶层 `rules` 是最直接的项目级调整方式。它在 Antfu、Harness 预设和集成规则之后生效。

```js
export default harness({
  rules: {
    'no-console': 'warn',
    'harness/class-name-layout': 'error',
    'harness/prefer-cn': 'off',
  },
})
```

- `'off'`：关闭规则
- `'warn'`：报告警告，默认不阻止 CI
- `'error'`：报告错误，并让 ESLint 以非零状态退出
- `['error', { ...options }]`：设置级别并传入规则参数

每条 Harness 规则支持哪些参数，请查看 [完整规则参考](./RULES.md)。

## 完整配置示例

下面的示例集中展示所有选项；一般项目不需要全部填写。

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

## 扩展其他 ESLint 插件

`harness()` 返回 Flat Config Composer。需要使用其他插件时，通过 `.append()` 注册插件和规则：

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

如果插件已经提供 Flat Config，也可以直接追加：

```js
export default harness().append(
  ...example.configs.recommended,
)
```

## 配置优先级

后出现的配置覆盖前面的同名规则：

1. Antfu 基础配置
2. Harness 预设和可选集成
3. Harness `strict` 策略
4. 顶层 `rules`
5. 项目的 `.append()`

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
