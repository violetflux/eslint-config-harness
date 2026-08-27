import { Linter } from 'eslint'
import { describe, expect, test } from 'vitest'
import { rule } from '../src/rules/react-hook-order'

/** -------------------- 测试工具 -------------------- */
/** 使用独立 flat config 执行 React Hook 组织规则 */
function lint(code: string, options?: unknown) {
  const linter = new Linter()

  return linter.verify(code, [{
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: { ecmaFeatures: { jsx: true } },
      sourceType: 'module',
    },
    plugins: {
      harness: { rules: { 'react-hook-order': rule } },
    },
    rules: {
      'harness/react-hook-order': ['error', ...(options === undefined ? [] : [options])],
    },
  }])
}

/** -------------------- 测试 -------------------- */
describe('react-hook-order', () => {
  test('接受 React 标准 Hook 的默认组织顺序', () => {
    const messages = lint(`
      function Profile() {
        const theme = useContext(ThemeContext)
        const [name, setName] = useState('')
        const inputRef = useRef(null)
        const normalized = useMemo(() => name.trim(), [name])
        const submit = useCallback(() => setName(normalized), [normalized])
        function handleReset() {
          setName('')
        }
        const onSave = useEffectEvent(() => submit())
        useEffect(() => onSave(), [onSave])
        return <input ref={inputRef} value={theme + normalized} />
      }
    `)

    expect(messages).toEqual([])
  })

  test('报告倒序的标准 Hook 阶段', () => {
    const messages = lint(`
      function Profile() {
        const value = useMemo(() => 'value', [])
        const [state] = useState(value)
        return <div>{state}</div>
      }
    `)

    expect(messages).toMatchObject([{
      messageId: 'wrongOrder',
      severity: 2,
    }])
  })

  test('未配置的自定义 Hook 不参与阶段排序', () => {
    const messages = lint(`
      function useProfile() {
        const [state] = useState(null)
        const account = useAccount()
        return { account, state }
      }
    `)

    expect(messages).toEqual([])
  })

  test('未配置的自定义 Hook 调用不会形成普通逻辑 barrier', () => {
    const messages = lint(`
      function useProfile() {
        useSubscription()
        useEffect(() => subscribe(), [])
      }
    `)

    expect(messages).toEqual([])
  })

  test('支持用字符串和正则扩展 Store 与 common Hook', () => {
    const valid = lint(`
      const Profile = memo(() => {
        const account = useAccountStore()
        const settings = useSettingsModel()
        const [open] = useState(false)
        return <div>{account.name + settings.theme + open}</div>
      })
    `, {
      groups: {
        common: [
          'useAccountStore',
          { pattern: '^use[A-Z].*Model$' },
        ],
      },
    })
    const invalid = lint(`
      const Profile = memo(() => {
        const [open] = useState(false)
        const account = useAccountStore()
        return <div>{account.name + open}</div>
      })
    `, {
      groups: { common: ['useAccountStore'] },
    })

    expect(valid).toEqual([])
    expect(invalid).toMatchObject([{ messageId: 'wrongOrder' }])
  })

  test('支持自定义阶段和组织顺序', () => {
    const messages = lint(`
      function Dashboard() {
        const resource = useResource()
        const query = useQuery()
        return <div>{resource.data + query.data}</div>
      }
    `, {
      groups: {
        query: ['useQuery'],
        resource: ['useResource'],
      },
      order: ['query', 'resource', 'common', 'state', 'memo', 'event', 'effectEvent', 'effect'],
    })

    expect(messages).toMatchObject([{ messageId: 'wrongOrder' }])
  })

  test('普通函数调用形成 barrier 并允许后续事件函数声明', () => {
    const invalid = lint(`
      function Profile() {
        prepareProfile()
        useEffect(() => subscribe(), [])
        return null
      }
    `)
    const valid = lint(`
      function Profile() {
        const [state] = useState(null)
        prepareProfile()
        const handleClick = () => update(state)
        function handleReset() {
          update(null)
        }
        return null
      }
    `)

    expect(invalid).toMatchObject([{ messageId: 'afterBarrier' }])
    expect(valid).toEqual([])
  })

  test('可以关闭命令式 barrier', () => {
    const messages = lint(`
      function Profile() {
        prepareProfile()
        useEffect(() => subscribe(), [])
        return null
      }
    `, { barrier: false })

    expect(messages).toEqual([])
  })

  test('分别检查嵌套组件和嵌套自定义 Hook', () => {
    const messages = lint(`
      function Page() {
        const [page] = useState(0)

        function NestedPanel() {
          const value = useMemo(() => page, [page])
          const [open] = useState(false)
          return <div>{value + Number(open)}</div>
        }

        const useNestedValue = () => {
          useEffect(() => subscribe(), [])
          const value = useMemo(() => page, [page])
          return value
        }

        return <NestedPanel value={page} />
      }
    `)

    expect(messages.map(message => ({
      message: message.message,
      messageId: message.messageId,
    }))).toEqual([
      {
        message: 'state Hook useState must appear before memo useMemo.',
        messageId: 'wrongOrder',
      },
      {
        message: 'memo Hook useMemo must appear before effect useEffect.',
        messageId: 'wrongOrder',
      },
    ])
  })

  test('忽略普通辅助函数及 Hook 回调内部调用', () => {
    const messages = lint(`
      function Profile() {
        const value = useMemo(() => {
          useInternalHelper()
          return readValue()
        }, [])

        function normalize() {
          useInternalHelper()
          return value
        }

        return <div>{normalize()}</div>
      }
    `)

    expect(messages).toEqual([])
  })

  test('变量声明中的普通调用不会提前形成 barrier', () => {
    const messages = lint(`
      const useProfile = function useProfile() {
        const prepared = prepareProfile()
        const [state] = useState(prepared)
        return state
      }
    `)

    expect(messages).toEqual([])
  })
})
