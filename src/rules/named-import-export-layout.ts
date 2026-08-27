import type { Rule } from 'eslint'

/** -------------------- 类型 -------------------- */
/** 命名导入导出布局配置 */
interface NamedImportExportLayoutOptions {
  /** 声明保持单行的最大字符数 */
  maxLength?: number
}

/** 带 TypeScript 扩展字段的命名导入导出声明 */
type NamedDeclarationNode = Rule.Node & {
  /** import attributes 或旧 assertions */
  assertions?: readonly unknown[]
  /** import attributes */
  attributes?: readonly unknown[]
  /** export 携带的本地声明 */
  declaration?: Rule.Node | null
  /** 整体 export type 修饰 */
  exportKind?: 'type' | 'value'
  /** 整体 import type 修饰 */
  importKind?: 'type' | 'value'
  /** 导入导出成员 */
  specifiers: Rule.Node[]
  /** 模块来源 */
  source?: Rule.Node | null
  /** 声明类型 */
  type: 'ExportNamedDeclaration' | 'ImportDeclaration'
}

/** 可安全重建的命名导入导出文本 */
interface DeclarationLayout {
  /** 声明种类文案 */
  kind: 'named export' | 'named import'
  /** 命名成员数量 */
  memberCount: number
  /** 生成指定缩进的多行声明 */
  multiline: ((baseIndent: string) => string) | undefined
  /** 折叠后的单行声明 */
  singleLine: string
}

/** -------------------- 常量 -------------------- */
/** 默认单行字符数上限 */
const defaultMaxLength = 120

/** -------------------- 内部函数 -------------------- */
/** 将声明文本折叠为稳定单行 */
function collapseDeclaration(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/,\s*}/g, ' }')
    .trim()
}

/** 读取节点的原始成员文本 */
function readMemberText(sourceCode: Rule.RuleContext['sourceCode'], node: Rule.Node) {
  return collapseDeclaration(sourceCode.getText(node))
}

/** 判断声明是否携带无法保守重建的语法 */
function hasUncertainSyntax(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: NamedDeclarationNode,
) {
  return sourceCode.getCommentsInside(node).length > 0
    || (node.assertions?.length ?? 0) > 0
    || (node.attributes?.length ?? 0) > 0
}

/** 读取声明所在行的前导缩进 */
function readBaseIndent(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: Rule.Node,
) {
  const [start] = sourceCode.getRange(node)
  const lineStart = sourceCode.text.lastIndexOf('\n', start - 1) + 1
  const indent = sourceCode.text.slice(lineStart, start)

  return /^[\t ]*$/.test(indent) ? indent : undefined
}

/** 读取声明末尾是否保留分号 */
function readSemicolon(sourceCode: Rule.RuleContext['sourceCode'], node: Rule.Node) {
  return /;\s*$/.test(sourceCode.getText(node)) ? ';' : ''
}

/** 读取源码沿用的换行符 */
function readEol(sourceCode: Rule.RuleContext['sourceCode']) {
  return sourceCode.text.includes('\r\n') ? '\r\n' : '\n'
}

/** 建立标准命名导入的单行与多行文本 */
function readImportLayout(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: NamedDeclarationNode,
): DeclarationLayout | undefined {
  const members = node.specifiers.filter(specifier => specifier.type === 'ImportSpecifier')

  if (members.length === 0 || !node.source)
    return

  const remaining = node.specifiers.filter(specifier => specifier.type !== 'ImportSpecifier')

  if (remaining.some(specifier => specifier.type !== 'ImportDefaultSpecifier'))
    return

  const memberTexts = members.map(member => readMemberText(sourceCode, member))
  const defaultImport = remaining[0]
    ? `${sourceCode.getText(remaining[0])}, `
    : ''
  const typeKeyword = node.importKind === 'type' ? 'type ' : ''
  const source = sourceCode.getText(node.source)
  const semicolon = readSemicolon(sourceCode, node)
  const eol = readEol(sourceCode)
  const singleLine = `import ${typeKeyword}${defaultImport}{ ${memberTexts.join(', ')} } from ${source}${semicolon}`

  return {
    kind: 'named import',
    memberCount: members.length,
    multiline: hasUncertainSyntax(sourceCode, node)
      ? undefined
      : (baseIndent) => {
          const itemIndent = `${baseIndent}  `
          const lines = memberTexts.map(member => `${itemIndent}${member},`)

          return `import ${typeKeyword}${defaultImport}{${eol}${lines.join(eol)}${eol}${baseIndent}} from ${source}${semicolon}`
        },
    singleLine,
  }
}

/** 建立标准命名导出的单行与多行文本 */
function readExportLayout(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: NamedDeclarationNode,
): DeclarationLayout | undefined {
  if (node.declaration)
    return

  const members = node.specifiers.filter(specifier => specifier.type === 'ExportSpecifier')

  if (
    members.length === 0
    || members.length !== node.specifiers.length
  ) {
    return
  }

  const memberTexts = members.map(member => readMemberText(sourceCode, member))
  const typeKeyword = node.exportKind === 'type' ? 'type ' : ''
  const source = node.source ? ` from ${sourceCode.getText(node.source)}` : ''
  const semicolon = readSemicolon(sourceCode, node)
  const eol = readEol(sourceCode)
  const singleLine = `export ${typeKeyword}{ ${memberTexts.join(', ')} }${source}${semicolon}`

  return {
    kind: 'named export',
    memberCount: members.length,
    multiline: hasUncertainSyntax(sourceCode, node)
      ? undefined
      : (baseIndent) => {
          const itemIndent = `${baseIndent}  `
          const lines = memberTexts.map(member => `${itemIndent}${member},`)

          return `export ${typeKeyword}{${eol}${lines.join(eol)}${eol}${baseIndent}}${source}${semicolon}`
        },
    singleLine,
  }
}

/** 读取命名导入导出的可比较布局 */
function readDeclarationLayout(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: NamedDeclarationNode,
) {
  return node.type === 'ImportDeclaration'
    ? readImportLayout(sourceCode, node)
    : readExportLayout(sourceCode, node)
}

/** -------------------- 规则 -------------------- */
/** 根据单行长度统一命名导入与导出布局 */
export const rule: Rule.RuleModule = {
  meta: {
    docs: {
      description: 'Normalize named import and export layout by line length',
    },
    fixable: 'code',
    messages: {
      shouldBeMultiline: 'This {{kind}} is {{length}} characters when collapsed, exceeding the {{maxLength}} character limit. Split it across multiple lines.',
      shouldBeSingleLine: 'This {{kind}} has {{memberCount}} members and is only {{length}} characters when collapsed. Keep it on one line.',
    },
    schema: [{
      additionalProperties: false,
      properties: {
        maxLength: {
          default: defaultMaxLength,
          minimum: 1,
          type: 'integer',
        },
      },
      type: 'object',
    }],
    type: 'layout',
  },
  create(context) {
    const options = (context.options[0] ?? {}) as NamedImportExportLayoutOptions
    const maxLength = options.maxLength ?? defaultMaxLength
    const { sourceCode } = context

    /** 检查单个命名导入导出声明 */
    const inspect = (rawNode: Rule.Node) => {
      const node = rawNode as NamedDeclarationNode
      const layout = readDeclarationLayout(sourceCode, node)

      if (!layout)
        return

      const text = sourceCode.getText(node)
      const isMultiline = text.includes('\n')
      const shouldBeMultiline = layout.singleLine.length > maxLength

      if (isMultiline === shouldBeMultiline)
        return

      const baseIndent = readBaseIndent(sourceCode, node)
      const output = shouldBeMultiline
        ? baseIndent === undefined ? undefined : layout.multiline?.(baseIndent)
        : hasUncertainSyntax(sourceCode, node) ? undefined : layout.singleLine

      context.report({
        data: {
          kind: layout.kind,
          length: layout.singleLine.length,
          maxLength,
          memberCount: layout.memberCount,
        },
        fix: output === undefined
          ? undefined
          : fixer => fixer.replaceText(node, output),
        messageId: shouldBeMultiline ? 'shouldBeMultiline' : 'shouldBeSingleLine',
        node,
      })
    }

    return {
      ExportNamedDeclaration: inspect,
      ImportDeclaration: inspect,
    }
  },
}
