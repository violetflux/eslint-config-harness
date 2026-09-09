import { Linter } from 'eslint'
import { describe, expect, test } from 'vitest'
import { createReactConfig } from '../../src/config/integrations.js'

/** 通过实际 React 集成检查依赖与 Hook 调用规则 */
async function lint(source: string) {
  const config = await createReactConfig(true)

  return new Linter().verify(source, [{
    ...config,
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  }])
}

describe('useAsyncEffect integration', () => {
  test('接受包含完整依赖的异步回调', async () => {
    expect(await lint(`
      function useData(id) {
        useAsyncEffect(async () => { await fetch(id) }, [id])
      }
    `)).toEqual([])
  })

  test('保留缺失依赖诊断及修复建议', async () => {
    const messages = await lint(`
      function useData(id) {
        useAsyncEffect(async () => { await fetch(id) }, [])
      }
    `)

    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      ruleId: 'react-hooks/exhaustive-deps',
      message: expect.stringContaining("missing dependency: 'id'"),
      suggestions: [expect.objectContaining({ fix: expect.objectContaining({ text: '[id]' }) })],
    })
  })

  test('支持通过变量传入异步回调', async () => {
    const messages = await lint(`
      function useData(id) {
        const load = async () => { await fetch(id) }
        useAsyncEffect(load, [])
      }
    `)

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain("missing dependency: 'id'")
  })

  test('继续拒绝普通 effect 的异步回调', async () => {
    const messages = await lint(`
      function useData(id) {
        useAsyncEffect(async () => { await fetch(id) }, [id])
        useEffect(async () => { await fetch(id) }, [id])
        useLayoutEffect(async () => { await fetch(id) }, [id])
      }
    `)

    expect(messages).toHaveLength(2)
    for (const message of messages)
      expect(message.message).toContain('Effect callbacks are synchronous')
  })

  test('仍然检查条件 Hook 调用', async () => {
    const messages = await lint(`
      function useData(enabled) {
        if (enabled) useAsyncEffect(async () => { await fetch('/data') }, [])
      }
    `)

    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      ruleId: 'react-hooks/rules-of-hooks',
      message: expect.stringContaining('conditionally'),
    })
  })
})
