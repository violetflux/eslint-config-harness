import type { Rule } from 'eslint'

/** 保留上游依赖分析，仅允许 useAsyncEffect 使用异步回调 */
export function withAsyncEffect(upstream: Rule.RuleModule): Rule.RuleModule {
  return {
    ...upstream,
    create(context) {
      let visitingAsyncEffect = false
      const adaptedContext = Object.create(context) as Rule.RuleContext

      Object.defineProperty(adaptedContext, 'report', {
        value(problem: Rule.ReportDescriptor) {
          // 上游此诊断没有 messageId；严格限定到当前 Hook 和异步回调诊断。
          if (
            visitingAsyncEffect
            && 'message' in problem
            && problem.message.startsWith('Effect callbacks are synchronous to prevent race conditions.')
          ) {
            return
          }

          context.report(problem)
        },
      })

      const listeners = upstream.create(adaptedContext)

      return {
        ...listeners,
        CallExpression(node) {
          visitingAsyncEffect = node.callee.type === 'Identifier'
            && node.callee.name === 'useAsyncEffect'

          try {
            listeners.CallExpression?.(node)
          }
          finally {
            visitingAsyncEffect = false
          }
        },
      }
    },
  }
}
