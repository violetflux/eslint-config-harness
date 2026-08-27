import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** 可配置的 Hook 名称匹配方式 */
type HookMatcher = string | {
  /** 正则表达式标志 */
  flags?: string
  /** 正则表达式源码 */
  pattern: string
}

/** React Hook 组织规则配置 */
interface ReactHookOrderOptions {
  /** 是否禁止 Hook 出现在普通命令式语句之后 */
  barrier?: boolean
  /** 追加到各组织阶段的 Hook 名称匹配器 */
  groups?: Record<string, HookMatcher[]>
  /** 组织阶段顺序 */
  order?: string[]
}

/** 带父节点的通用 ESTree 节点 */
type Node = Rule.Node
/** 函数节点 */
type FunctionNode = Extract<Node, {
  type: 'ArrowFunctionExpression' | 'FunctionDeclaration' | 'FunctionExpression'
}>
/** 块级函数体 */
type BlockNode = Extract<Node, { type: 'BlockStatement' }>
/** 函数体顶层语句 */
type StatementNode = BlockNode['body'][number] & Node

/** 单个源码组织项 */
interface OrderItem {
  /** 所属组织阶段 */
  group: string
  /** Hook 或事件函数名称 */
  name: string
  /** 对应源码节点 */
  node: Node
}

/** 编译后的 Hook 匹配器 */
type CompiledMatcher = string | RegExp

/** -------------------- 常量 -------------------- */
/** 默认源码组织顺序 */
const defaultOrder = [
  'common',
  'state',
  'memo',
  'event',
  'effectEvent',
  'effect',
] as const

/** React 标准 Hook 的默认组织阶段 */
const defaultGroups: Record<string, HookMatcher[]> = {
  common: [
    'use',
    'useContext',
    'useSyncExternalStore',
  ],
  state: [
    'useActionState',
    'useDeferredValue',
    'useId',
    'useImperativeHandle',
    'useOptimistic',
    'useReducer',
    'useRef',
    'useState',
    'useTransition',
  ],
  memo: [
    'useCallback',
    'useMemo',
  ],
  event: [],
  effectEvent: [
    'useEffectEvent',
  ],
  effect: [
    'useDebugValue',
    'useEffect',
    'useInsertionEffect',
    'useLayoutEffect',
  ],
}

/** 判断调用名称是否符合 React Hook 命名约定 */
function isHookName(name: string) {
  return name === 'use' || /^use[A-Z0-9]/.test(name)
}

/** ESLint 配置中的单个 Hook 匹配器结构 */
const matcherSchema = {
  anyOf: [
    { type: 'string' },
    {
      additionalProperties: false,
      properties: {
        flags: { type: 'string' },
        pattern: { type: 'string' },
      },
      required: ['pattern'],
      type: 'object',
    },
  ],
} as const

/** -------------------- 内部函数 -------------------- */
/** 判断名称是否代表组件或自定义 Hook */
function isInspectedScopeName(name: string) {
  return /^[A-Z]/.test(name) || /^use[A-Z0-9]/.test(name)
}

/** 返回调用表达式使用的最终属性名 */
function readCallName(node: Node): string | undefined {
  if (node.type !== 'CallExpression')
    return

  const { callee } = node

  if (callee.type === 'Identifier')
    return callee.name

  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier')
    return callee.property.name
}

/** 读取 memo 与 forwardRef 包装器名称 */
function readWrapperName(node: Node): string | undefined {
  if (node.type !== 'CallExpression')
    return

  const { callee } = node

  if (callee.type === 'Identifier')
    return callee.name

  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier')
    return callee.property.name
}

/** 读取函数声明、变量函数或组件包装器的作用域名称 */
function readScopeName(node: FunctionNode) {
  if (node.type === 'FunctionDeclaration')
    return node.id?.name

  let current: Node = node

  while (current.parent) {
    const parent: Node = current.parent

    if (
      parent.type === 'VariableDeclarator'
      && parent.init === current
      && parent.id.type === 'Identifier'
    ) {
      return parent.id.name
    }

    if (
      parent.type === 'CallExpression'
      && parent.arguments[0] === current
      && ['forwardRef', 'memo'].includes(readWrapperName(parent) ?? '')
    ) {
      current = parent
      continue
    }

    if (
      ['ChainExpression', 'TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'TypeCastExpression']
        .includes(parent.type)
        && 'expression' in parent
        && parent.expression === current
    ) {
      current = parent
      continue
    }

    break
  }
}

/** 编译调用方配置的精确名称或正则表达式 */
function compileMatcher(matcher: HookMatcher): CompiledMatcher {
  return typeof matcher === 'string'
    ? matcher
    : new RegExp(matcher.pattern, matcher.flags)
}

/** 判断 Hook 名称是否命中一个配置匹配器 */
function matchesHook(name: string, matcher: CompiledMatcher) {
  if (typeof matcher === 'string')
    return name === matcher

  matcher.lastIndex = 0
  return matcher.test(name)
}

/** 创建默认阶段与调用方扩展合并后的匹配表 */
function createGroups(options: ReactHookOrderOptions) {
  const groups = new Map<string, CompiledMatcher[]>()

  for (const group in defaultGroups)
    groups.set(group, defaultGroups[group]!.map(compileMatcher))

  for (const group in options.groups ?? {}) {
    const matchers = options.groups![group]!

    groups.set(group, [
      ...(groups.get(group) ?? []),
      ...matchers.map(compileMatcher),
    ])
  }

  return groups
}

/** 创建包含自定义阶段的稳定组织顺序 */
function createOrder(options: ReactHookOrderOptions, groups: ReadonlyMap<string, unknown>) {
  const order = [...(options.order ?? defaultOrder)]

  for (const group of groups.keys()) {
    if (!order.includes(group))
      order.push(group)
  }

  if (!order.includes('event'))
    order.push('event')

  return order
}

/** 按精确阶段优先级解析已配置的 Hook */
function readHookGroup(
  name: string,
  order: readonly string[],
  groups: ReadonlyMap<string, readonly CompiledMatcher[]>,
) {
  // common 仍在其他精确阶段之后匹配，避免用户追加的宽泛模式覆盖标准 Hook
  const candidates = order.filter(group => group !== 'common')

  for (const group of candidates) {
    if (groups.get(group)?.some(matcher => matchesHook(name, matcher)))
      return group
  }

  if (groups.get('common')?.some(matcher => matchesHook(name, matcher)))
    return 'common'

  return undefined
}

/** 判断节点是否引入新的执行函数或 class 边界 */
function isNestedExecutionBoundary(node: Node) {
  return node.type === 'ArrowFunctionExpression'
    || node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ClassDeclaration'
    || node.type === 'ClassExpression'
}

/** 遍历当前语句执行层，不进入回调、局部函数或 class */
function visitStatement(
  root: StatementNode,
  visitorKeys: Readonly<Record<string, readonly string[]>>,
  visit: (node: Node) => void,
) {
  const traverse = (node: Node) => {
    if (node !== root && isNestedExecutionBoundary(node))
      return

    visit(node)

    for (const key of visitorKeys[node.type] ?? []) {
      const value = (node as unknown as Record<string, unknown>)[key]

      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && 'type' in child)
            traverse(child as Node)
        }
      }
      else if (value && typeof value === 'object' && 'type' in value) {
        traverse(value as Node)
      }
    }
  }

  traverse(root)
}

/** 收集单条语句当前执行层的 Hook 调用 */
function readStatementHooks(
  statement: StatementNode,
  order: readonly string[],
  groups: ReadonlyMap<string, readonly CompiledMatcher[]>,
  visitorKeys: Readonly<Record<string, readonly string[]>>,
) {
  const items: OrderItem[] = []

  if (statement.type === 'FunctionDeclaration')
    return items

  visitStatement(statement, visitorKeys, (node) => {
    const name = readCallName(node)
    const group = name && readHookGroup(name, order, groups)

    if (name && group)
      items.push({ group, name, node })
  })

  return items
}

/** 判断语句是否包含未分类的自定义 Hook 调用 */
function statementContainsHook(
  statement: StatementNode,
  visitorKeys: Readonly<Record<string, readonly string[]>>,
) {
  let containsHook = false

  visitStatement(statement, visitorKeys, (node) => {
    const name = readCallName(node)

    if (name && isHookName(name))
      containsHook = true
  })

  return containsHook
}

/** 收集当前语句直接声明的事件函数 */
function readStatementEvents(statement: StatementNode): OrderItem[] {
  if (statement.type === 'FunctionDeclaration') {
    return [{
      group: 'event',
      name: statement.id?.name ?? '<anonymous>',
      node: statement,
    }]
  }

  if (statement.type !== 'VariableDeclaration')
    return []

  return statement.declarations.flatMap((declaration) => {
    const { id, init } = declaration

    if (
      id.type !== 'Identifier'
      || (init?.type !== 'ArrowFunctionExpression' && init?.type !== 'FunctionExpression')
    ) {
      return []
    }

    return [{ group: 'event', name: id.name, node: declaration as Node }]
  })
}

/** 判断没有组织项的语句是否开始了普通命令式逻辑 */
function isBarrierStatement(statement: StatementNode) {
  const type: string = statement.type

  return type !== 'VariableDeclaration'
    && type !== 'EmptyStatement'
    && type !== 'TSInterfaceDeclaration'
    && type !== 'TSTypeAliasDeclaration'
}

/** 检查单个组件或自定义 Hook 的顶层组织顺序 */
function inspectBody(
  body: BlockNode,
  context: Rule.RuleContext,
  options: ReactHookOrderOptions,
  order: readonly string[],
  groups: ReadonlyMap<string, readonly CompiledMatcher[]>,
) {
  const ranks = new Map(order.map((group, index) => [group, index]))
  const visitorKeys = context.sourceCode.visitorKeys
  let barrier: StatementNode | undefined
  let latest: OrderItem | undefined

  for (const rawStatement of body.body) {
    const statement = rawStatement as StatementNode
    const items = [
      ...readStatementHooks(statement, order, groups, visitorKeys),
      ...readStatementEvents(statement),
    ].sort((left, right) => (
      context.sourceCode.getRange(left.node)[0] - context.sourceCode.getRange(right.node)[0]
    ))

    for (const item of items) {
      if (barrier && options.barrier !== false && item.group !== 'event') {
        context.report({
          data: {
            barrier: barrier.type === 'ReturnStatement' ? 'return' : 'imperative logic',
            name: item.name,
          },
          messageId: 'afterBarrier',
          node: item.node,
        })
        continue
      }

      if (
        latest
        && (ranks.get(item.group) ?? Number.MAX_SAFE_INTEGER)
        < (ranks.get(latest.group) ?? Number.MAX_SAFE_INTEGER)
      ) {
        context.report({
          data: {
            currentGroup: item.group,
            currentName: item.name,
            previousGroup: latest.group,
            previousName: latest.name,
          },
          messageId: 'wrongOrder',
          node: item.node,
        })
        continue
      }

      latest = item
    }

    if (
      !barrier
      && items.length === 0
      && isBarrierStatement(statement)
      && !statementContainsHook(statement, visitorKeys)
    ) {
      barrier = statement
    }
  }
}

/** -------------------- 规则 -------------------- */
/** 约束组件与自定义 Hook 内部的 Hook 组织阶段 */
export const rule: Rule.RuleModule = {
  meta: {
    docs: {
      description: 'Enforce Hook organization in React components and custom Hooks',
    },
    messages: {
      afterBarrier: '{{name}} must not appear after {{barrier}}.',
      wrongOrder: '{{currentGroup}} Hook {{currentName}} must appear before {{previousGroup}} {{previousName}}.',
    },
    schema: [{
      additionalProperties: false,
      properties: {
        barrier: { type: 'boolean' },
        groups: {
          additionalProperties: {
            items: matcherSchema,
            type: 'array',
            uniqueItems: true,
          },
          type: 'object',
        },
        order: {
          items: { minLength: 1, type: 'string' },
          minItems: 1,
          type: 'array',
          uniqueItems: true,
        },
      },
      type: 'object',
    }],
    type: 'suggestion',
  },
  create(context) {
    const options = (context.options[0] ?? {}) as ReactHookOrderOptions
    const groups = createGroups(options)
    const order = createOrder(options, groups)
    const inspectedBodies = new WeakSet<object>()

    /** 检查唯一的具名组件或自定义 Hook 函数体 */
    const inspect = (node: FunctionNode) => {
      const name = readScopeName(node)
      const { body } = node

      if (
        !name
        || !isInspectedScopeName(name)
        || body.type !== 'BlockStatement'
        || inspectedBodies.has(body)
      ) {
        return
      }

      inspectedBodies.add(body)
      inspectBody(body as BlockNode, context, options, order, groups)
    }

    return {
      ArrowFunctionExpression: node => inspect(node as FunctionNode),
      FunctionDeclaration: node => inspect(node as FunctionNode),
      FunctionExpression: node => inspect(node as FunctionNode),
    }
  },
}
