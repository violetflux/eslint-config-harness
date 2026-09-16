# Harness 规则参考

[返回中文 README](./README.zh-CN.md) · [English README](./README.md)

本文档说明：

- Harness 自己实现的 10 条 `harness/*` 规则
- `@antfu/eslint-config` 提供的 9 条 `antfu/*` 规则
- Harness 在 Antfu 基础上新增、关闭或调整的规则
- 规则级别、配置参数、诊断信息、触发示例和符合示例

React、Vue、Tailwind CSS、Kerros 等集成是否生效，仍由项目检测结果或 `harness()` 参数决定。

## 规则级别与配置写法

规则可以配置为以下三个级别：

| 写法 | 含义 | ESLint 结果 |
| --- | --- | --- |
| `'off'` | 关闭规则 | 不产生诊断 |
| `'warn'` | 警告 | 显示黄色警告；默认不让 ESLint 以失败状态退出 |
| `'error'` | 错误 | 显示红色错误，并让 ESLint 以失败状态退出 |

如果 CI 使用 `eslint --max-warnings=0`，任何 `warn` 也会让检查失败。

### 只修改级别

```js
export default harness({
  rules: {
    'harness/class-name-layout': 'error',
    'harness/prefer-local-transformation': 'off',
  },
})
```

### 同时传入参数

规则参数写在数组第二项：

```js
export default harness({
  rules: {
    'harness/named-import-export-layout': [
      'error',
      { maxLength: 100 },
    ],
  },
})
```

顶层 `rules` 位于 Harness 策略之后，因此可以最终覆盖 Harness、Antfu 和集成插件的规则。

### 自动修复

运行以下命令应用安全修复：

```bash
eslint . --fix
```

只有文档明确标记“支持自动修复”的场景才会被改写。包含注释、spread、复杂语义或无法安全判断的代码只会报告，不会自动修改。

## Harness 自己实现的规则

默认 `strict` 级别如下；`recommended` 只注册插件，不启用任何 Harness 内置规则，也不启用 `style/max-len` 行宽策略。

| 规则 | strict | 自动修复 |
| --- | --- | --- |
| `harness/short-jsx-return` | off（可手动启用） | 支持 |
| `harness/prefer-line-wrap` | warn | 不支持 |
| `harness/named-import-export-layout` | error | 支持 |
| `harness/react-hook-order` | error，仅 React | 不支持 |
| `harness/prefer-cn` | warn | 部分支持 |
| `harness/class-name-layout` | warn | 不支持 |
| `harness/cn-argument-layout` | warn | 部分支持 |
| `harness/prefer-property-shorthand` | warn | 不支持 |
| `harness/no-redundant-field-alias` | warn | 不支持 |
| `harness/prefer-local-transformation` | warn | 不支持 |

### 统一行宽检查

`strict` 对所有适用源码逐行检查，不依赖 React：

- 小于 60 字符：不产生行宽诊断，不要求折叠为单行。
- 60～120 字符（包含边界）：`harness/prefer-line-wrap` 报 `warn`，建议换行。
- 超过 120 字符：`style/max-len` 报 `error`，不重复产生行宽警告。

两条规则都不自动修复。长度包含缩进、注释、字符串和分号，按 Unicode 字符计数，Tab 使用 4 列制表位。默认没有 URL、注释或字符串豁免。
`harness/prefer-line-wrap` 无配置项；`style/max-len` 配置为 `['error', { code: 120, tabWidth: 4 }]`，由 Harness 工厂的 strict 策略启用。修改硬上限时应同时调整或关闭警告规则。

### `harness/short-jsx-return`

短 JSX 能放在一行时，不要只为 JSX 添加一层多行括号。

- 默认级别：`off`，仅供手动启用
- 默认参数：`maxLength: 120`
- 自动修复：支持
- 诊断：`useSingleLine`，提示折叠后的实际字符数

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `maxLength` | 正整数 | `120` | `return JSX` 折叠为一行后的最大长度 |

会触发规则：

```jsx
function Message() {
  return (
    <MessageListContent key={threadId} />
  )
}
```

符合规则：

```jsx
function Message() {
  return <MessageListContent key={threadId} />
}
```

以下情况不会折叠：JSX 自身需要多行、包含注释、存在额外嵌套括号，或折叠后超过 `maxLength`。

### `harness/named-import-export-layout`

命名导入和命名导出较短时保持单行，过长时每个成员独占一行。

- 默认级别：`error`
- 默认参数：`maxLength: 120`
- 自动修复：支持
- 诊断：
  - `shouldBeMultiline`：折叠后超过长度限制
  - `shouldBeSingleLine`：多行声明其实足够短

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `maxLength` | 正整数 | `120` | 声明折叠为单行后的最大长度 |

会触发规则：

```ts
import type {
  Alpha,
  Beta as Gamma,
} from './types'
```

符合规则：

```ts
import type { Alpha, Beta as Gamma } from './types'
```

过长时的符合写法：

```ts
import DefaultValue, {
  Alpha,
  Delta,
  Beta as Gamma,
} from './types'
```

包含成员注释、import attributes 或其他无法保守重建的语法时，规则仍可能报告，但不会自动修复。

### `harness/react-hook-order`

统一组件和自定义 Hook 内部的组织顺序。

- 默认级别：React 项目下 `error`
- 自动修复：不支持
- 默认顺序：`common → state → memo → event → effectEvent → effect`
- 诊断：
  - `wrongOrder`：后面的 Hook 阶段应该出现在前面
  - `afterBarrier`：Hook 出现在 return 或命令式逻辑之后

默认分组：

| 阶段 | Hook 或声明 |
| --- | --- |
| `common` | `use`、`useContext`、`useSyncExternalStore` |
| `state` | `useActionState`、`useDeferredValue`、`useId`、`useImperativeHandle`、`useOptimistic`、`useReducer`、`useRef`、`useState`、`useTransition` |
| `memo` | `useCallback`、`useMemo` |
| `event` | 当前函数顶层声明的事件函数 |
| `effectEvent` | `useEffectEvent` |
| `effect` | `useAsyncEffect`、`useDebugValue`、`useEffect`、`useInsertionEffect`、`useLayoutEffect` |

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `barrier` | boolean | `true` | 是否禁止 Hook 出现在 return 或普通命令式语句之后 |
| `groups` | `Record<string, Matcher[]>` | 默认分组 | 向已有或自定义阶段追加 Hook 匹配器 |
| `order` | `string[]` | 默认顺序 | 设置阶段顺序；未列出的自定义阶段会追加到末尾 |

匹配器可以是精确名称，也可以是 `{ pattern, flags }` 正则配置：

```js
export default harness({
  rules: {
    'harness/react-hook-order': ['error', {
      groups: {
        common: [
          'useAccountStore',
          { pattern: '^use[A-Z].*Model$' },
        ],
        query: ['useQuery'],
      },
      order: [
        'common',
        'state',
        'query',
        'memo',
        'event',
        'effectEvent',
        'effect',
      ],
    }],
  },
})
```

会触发规则：

```tsx
function Profile() {
  const value = useMemo(() => 'value', [])
  const [state] = useState(value)
  return <div>{state}</div>
}
```

符合规则：

```tsx
function Profile() {
  const [state] = useState('value')
  const value = useMemo(() => state.trim(), [state])
  return <div>{value}</div>
}
```

未配置的自定义 Hook 不参与排序，避免对业务 Hook 做错误推断。普通辅助函数和 Hook 回调内部的调用也不会参与当前组件的排序。

### `harness/prefer-cn`

class 字段中的 `filter(Boolean).join(' ')` 应改用项目的 class 合并函数。

- 默认级别：`warn`
- 自动修复：部分支持
- 诊断：`preferCn`

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `classNames` | `string[]` | `['className']` | 要检查的 JSX 属性或对象字段 |
| `cnNames` | 非空 `string[]` | `['cn']` | 推荐函数名称；第一项用于诊断和修复 |

会触发规则：

```tsx
<div className={['base', active && 'active'].filter(Boolean).join(' ')} />
```

符合规则：

```tsx
<div className={cn('base', active && 'active')} />
```

只有 `cn` 已在当前或上层作用域声明，且数组不含注释、空项和 spread 时才会自动修复；否则只报告。

### `harness/class-name-layout`

过长的静态 class 字符串应改为可读的多行 class 组合。

- 默认级别：`warn`
- 自动修复：不支持
- 诊断：`longStaticClass`

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `classNames` | `string[]` | `['className']` | 要检查的 JSX 属性或对象字段 |
| `maxLength` | 正整数 | `56` | 静态 class 字符串最大长度 |

会触发规则：

```tsx
<div className="flex items-center justify-between gap-2 rounded-lg border px-4 py-2" />
```

符合规则：

```tsx
<div
  className={cn(
    'flex items-center justify-between',
    'gap-2 rounded-lg border px-4 py-2',
  )}
/>
```

规则只检查包含多个 class 的静态字符串或无表达式模板字符串，不检查普通说明文本和动态表达式。

### `harness/cn-argument-layout`

统一 `cn()` 的静态参数长度、换行方式和语义分组。

- 默认级别：`warn`
- 自动修复：仅自动展开无注释的长单行调用
- 诊断：
  - `shortStatic`：所有参数都是短静态字符串，应直接使用普通字符串
  - `longSingleLine`：静态 class 太长，应改为多行
  - `unbalancedSegments`：简单静态分组长度差异过大

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `cnNames` | 非空 `string[]` | `['cn']` | 要检查的 class 合并函数 |
| `maxLength` | 正整数 | `56` | 静态 class 总长度阈值 |
| `segmentDifference` | 非负整数 | `32` | 最长与最短静态分组允许的最大字符差 |

会触发规则的短静态调用：

```ts
const className = cn('flex', 'items-center')
```

符合规则：

```ts
const className = 'flex items-center'
```

会触发规则的长单行调用：

```ts
const className = cn('flex items-center justify-between rounded-lg border px-4 py-2 gap-2', active && 'active')
```

符合规则：

```ts
const className = cn(
  'flex items-center justify-between rounded-lg border px-4 py-2 gap-2',
  active && 'active',
)
```

包含 variant、冒号或任意值语法（如 `hover:`、`data-[state=open]:`）的复杂 utility 不参与“分组长度是否均衡”的判断。

### `harness/prefer-property-shorthand`

对象字段对同名来源做直接转换时，先命名最终值，再使用属性简写。

- 默认级别：`warn`
- 自动修复：不支持
- 诊断：`preferShorthand`

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `ignoredFunctions` | `string[]` | `[]` | 不检查的转换函数名称 |
| `requireDestructuredSource` | boolean | `true` | 是否只检查当前作用域内由对象解构得到的同名来源 |

会触发规则：

```ts
function create(input) {
  const { value } = input
  return { value: normalize(value) }
}
```

符合规则：

```ts
function create(input) {
  const { value: rawValue } = input
  const value = normalize(rawValue)
  return { value }
}
```

如果某个函数的内联调用本身具有明确语义，可以通过 `ignoredFunctions` 排除。

### `harness/no-redundant-field-alias`

避免临时领域后缀和返回对象中的冗余字段映射。

- 默认级别：`warn`
- 自动修复：不支持
- 诊断：
  - `temporaryAlias`：解构别名命中了配置的临时后缀
  - `returnAlias`：返回对象把已有同名绑定映射到另一个变量

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `checkReturnAliases` | boolean | `true` | 是否检查返回对象中的字段别名 |
| `ignoredFunctionSuffixes` | `string[]` | `[]` | 跳过名称以指定后缀结尾的函数 |
| `temporaryAliasSuffixes` | `string[]` | `[]` | 视为临时别名的业务后缀 |

会触发规则：

```ts
const { removeThread: removeThreadInStream } = stream
```

配置 `temporaryAliasSuffixes: ['InStream']` 后的符合写法：

```ts
const { removeThread: _removeThread } = stream
```

会触发规则的返回字段写法：

```ts
function create(input) {
  const { thread } = input
  const normalized = normalize(thread)
  return { thread: normalized }
}
```

符合规则：

```ts
function create(input) {
  const { thread: rawThread } = input
  const thread = normalize(rawThread)
  return { thread }
}
```

`temporaryAliasSuffixes` 默认为空，规则不会猜测消费项目的业务命名。

### `harness/prefer-local-transformation`

小型调用参数或返回对象中已经有多个属性简写时，少量派生字段也应先命名，再使用简写。

- 默认级别：`warn`
- 自动修复：不支持
- 诊断：`preferLocal`

| 参数 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `contexts` | `('call' \| 'return')[]` | `['call', 'return']` | 检查调用参数、返回对象或两者 |
| `maxProperties` | 正整数 | `6` | 参与检查的对象最大字段数 |
| `maxTransformations` | 正整数 | `4` | 参与检查的派生字段最大数量 |
| `minShorthandProperties` | 非负整数 | `2` | 对象中至少已有多少个属性简写才检查 |

派生表达式包括调用、`await`、二元表达式、逻辑表达式和条件表达式。

会触发规则：

```ts
invoke({
  threadId,
  workspaceId,
  payload: normalize(rawPayload),
})
```

符合规则：

```ts
const payload = normalize(rawPayload)

invoke({
  threadId,
  workspaceId,
  payload,
})
```

字段很多、没有混合属性简写，或派生字段数量超过阈值时不会报告，以降低误报。

## Antfu 提供的 `antfu/*` 规则

这些规则来自 `@antfu/eslint-config`，普通源码中默认均为 `error`。

| 规则 | 触发示例 | 符合示例 |
| --- | --- | --- |
| `antfu/no-top-level-await` | 模块顶层直接 `await load()` | 放入 `async function main()`，或按项目需要覆盖规则 |
| `antfu/import-dedupe` | 从同一模块写多条 import | 合并为一条 import |
| `antfu/no-import-dist` | `import x from 'pkg/dist/x'` | 使用包公开导出：`import { x } from 'pkg'` |
| `antfu/no-import-node-modules-by-path` | `import x from '../node_modules/pkg'` | `import x from 'pkg'` |
| `antfu/consistent-list-newline` | 同一列表中随意混合单行和多行 | 短列表单行，长列表每项一行 |
| `antfu/consistent-chaining` | 链式调用断行不一致 | 保持整条链布局一致 |
| `antfu/curly` | `if (ready) run()` | `if (ready) { run() }` 或交由自动修复格式化 |
| `antfu/if-newline` | 条件和主体挤在不一致的位置 | 按统一布局换行 |
| `antfu/top-level-function` | `const load = () => {}` | 顶层使用 `function load() {}` |

`harness({ preset: 'strict', react: true })` 会在 JSX/TSX 中关闭 `antfu/top-level-function`，因为 Harness 要求 React 组件使用函数声明，同时允许回调使用箭头函数。

Antfu 还组合了 ESLint 核心、TypeScript、import、node、style、regexp、unicorn、JSON、YAML 和 Markdown 等规则。Harness 沿用这些预设，不在本文复制数百条上游规则；下节只记录 Harness 明确改变的部分。

## Harness 对 Antfu 的改动

### 两个预设都会新增

| 规则 | 级别 | 符合写法 |
| --- | --- | --- |
| `no-return-await` | error | 没有特殊错误处理时直接 `return promise` |
| `no-void` | error | 正常调用异步函数并显式处理返回值或错误 |
| `require-await` | error | 不需要 `await` 时移除 `async` |

### `strict` 会关闭

以下规则最终为 `off`，不会产生警告或错误：

| 规则 | Harness 的决定 |
| --- | --- |
| `eslint-comments/no-unlimited-disable` | 允许不带规则名的 ESLint disable |
| `jsdoc/no-defaults` | 允许 JSDoc 默认值 |
| `no-console` | 允许 console |
| `node/prefer-global/process` | 不限制 `process` 的引用方式 |
| `prefer-promise-reject-errors` | 允许 reject 非 Error 值 |
| `style/eol-last` | 不强制文件末尾换行 |
| `test/prefer-lowercase-title` | 不强制测试标题小写 |
| `antfu/top-level-function` | 仅在 React JSX/TSX 文件关闭 |

### `strict` 会调整或新增

| 规则 | 级别 | 具体要求 |
| --- | --- | --- |
| `unused-imports/no-unused-vars` | error | 以 `_` 开头的变量、参数和 catch 参数允许未使用 |
| `test/consistent-test-it` | error | 测试声明统一使用 `test` |
| `ts/ban-ts-comment` | error | `@ts-check`、`@ts-expect-error`、`@ts-nocheck` 被禁止；`@ts-ignore` 必须带说明 |
| `ts/consistent-type-imports` | error | 通常要求类型使用 `import type`；按最近一层 `package.json` 判断：声明了 `@nestjs/common`（包括开发依赖）的包内完全禁止类型导入，保护依赖注入及其他装饰器元数据；嵌套子包独立判断，不继承父包的 NestJS 规则 |
| `no-restricted-syntax` | error | 禁止 const enum、`export =`、星号导出；私有成员以 `_` 开头；React JSX 另限制函数表达式和箭头函数组件 |
| `jsdoc/require-jsdoc` | error | TypeScript interface 及其属性、方法、调用签名、构造签名和索引签名必须有注释 |
| `max-lines` | error | `*.test.*` 文件最多 2000 行 |

示例：

```ts
// 错误：星号导出
export * from './types'

// 正确：显式导出
export { User, type UserOptions } from './types'

// 错误：私有成员缺少 _ 前缀
class Service {
  private cache = new Map()
}

// 正确
class Service {
  private _cache = new Map()
}
```

React JSX/TSX 中：

```tsx
// 错误：组件使用箭头函数
const Profile = () => <div />

// 正确：组件使用函数声明
function Profile() {
  return <div />
}

// 正确：回调继续使用箭头函数
items.map(item => <Item key={item.id} item={item} />)
```

## 条件集成规则

### React

启用 React 后会加载 `eslint-plugin-react-hooks` 的 recommended Flat Config。默认将 `useAsyncEffect` 纳入依赖检查，并允许其异步回调；缺失依赖和条件调用仍会报告，普通 `useEffect` 的异步回调仍会报错。此适配按直接调用名称 `useAsyncEffect` 匹配，不追踪导入别名或任意命名空间调用。其中 `react-hooks/exhaustive-deps`、`react-hooks/incompatible-library`、`react-hooks/unsupported-syntax` 为 `warn`，其他启用的 `react-hooks/*` 规则为 `error`。`strict` 还会启用：

- `harness/react-hook-order`
- JSX 组件声明与函数表达式限制

### Vue

- `vue: true` 或 `vue: { version: 3 }`：使用 Antfu Vue 3 规则
- `vue: { version: 2 }`：使用 Antfu Vue 2 规则
- `vue: false`：关闭 Vue 支持

Vue 规则由 Antfu 对应版本预设提供，Harness 只负责把简洁的版本参数传给 Antfu。

### Tailwind CSS

| 规则 | recommended | strict |
| --- | --- | --- |
| `better-tailwindcss/no-conflicting-classes` | error | error |
| `better-tailwindcss/no-concatenated-classes` | off | error |
| `better-tailwindcss/enforce-canonical-classes` | off | error |

Tailwind 参数：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `entryPoint` | 自动检测 | Tailwind 主题 CSS 或配置入口 |
| `files` | JS/JSX/TS/TSX 等源码 | 应用规则的文件范围 |
| `rootFontSize` | `16` | rem 换算使用的根字号 |
| `additionalSelectors` | `[]` | 在插件默认选择器后追加 class 识别位置 |

### Kerros

启用 Kerros 后，以下规则默认均为 `error`：

- `kerros/binding-naming`
- `kerros/factory-at-module-scope`
- `kerros/model-convention`
- `kerros/no-broad-store-access`
- `kerros/no-whole-store-selector`
- `kerros/selector-parameter-name`

可以通过集成内部的 `rules` 单独覆盖：

```js
export default harness({
  kerros: {
    rules: {
      'kerros/selector-parameter-name': 'off',
    },
  },
})
```

## 推荐的接入方式

新项目直接使用默认 `strict`：

```js
export default harness()
```

已有项目可以先使用 `recommended`，再逐条启用需要的 Harness 规则：

```js
export default harness({
  preset: 'recommended',
  rules: {
    'harness/named-import-export-layout': 'error',
    'harness/prefer-cn': 'warn',
  },
})
```

团队确定规则后再把 `warn` 提升为 `error`。不建议为了让 CI 通过而大范围使用 `eslint-disable`；优先调整代码、缩小规则文件范围，或通过规则参数表达项目约定。
