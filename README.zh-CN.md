# @violetflux/eslint-config-harness

[English](./README.md) | 简体中文

基于 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的 ESLint Flat Config，为 TypeScript、React、Tailwind CSS、Kerros 和其他代码质量规则提供预设与集成。

- 一行配置获得实用默认值
- 支持 TypeScript、React、JSON、YAML 和 Markdown
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

Harness 可以自动检测 React、Tailwind CSS 和 Kerros。需要明确控制时，可以为对应集成传入 `true`、`false` 或配置对象。

### TypeScript

默认启用 TypeScript 支持：

```js
export default harness({ typescript: true })
```

传入 `typescript: false` 可以关闭 TypeScript 支持。

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

<details>
<summary>内置规则</summary>

<br>

| Rule | strict | 自动修复 | 作用 |
| --- | --- | --- | --- |
| `harness/short-jsx-return` | error | 支持 | 短 JSX return 保持单行 |
| `harness/named-import-export-layout` | error | 支持 | 按默认 120 字符统一命名导入导出布局 |
| `harness/react-hook-order` | error | 不支持 | 统一 React 标准 Hook 阶段顺序，自定义 Hook 按需配置 |
| `harness/prefer-cn` | warn | 部分支持 | 把 `filter(Boolean).join(' ')` class 组合改为 `cn` |
| `harness/class-name-layout` | warn | 不支持 | 限制过长的静态 class 字符串 |
| `harness/cn-argument-layout` | warn | 部分支持 | 统一 `cn` 静态参数和换行布局 |
| `harness/prefer-property-shorthand` | warn | 不支持 | 建议提前命名同源转换值并使用属性简写 |
| `harness/no-redundant-field-alias` | warn | 不支持 | 减少冗余字段别名 |
| `harness/prefer-local-transformation` | warn | 不支持 | 建议先命名关键派生字段再投影 |

`prefer-cn` 只在配置的组合函数已处于作用域中时修复简单数组；`cn-argument-layout` 只修复不含注释的长单行调用，涉及语义分组的诊断仍需手动处理。

通过顶层 `rules` 传递规则选项：

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

内置规则可用选项：

| 规则 | 选项 |
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

`react-hook-order.groups` 把阶段名映射到 Hook 名称或 `{ pattern, flags }` 匹配器，`order` 设置阶段顺序，`barrier` 控制 Hook 是否可以出现在普通语句之后。

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
