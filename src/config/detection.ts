import { existsSync, globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { GLOB_EXCLUDE } from '@antfu/eslint-config'
import createIgnore from 'ignore'

/** -------------------- 类型 -------------------- */
/** 自动检测到的可选集成 */
export interface DetectedIntegrations {
  /** 项目是否直接使用 Kerros */
  kerros: boolean
  /** 项目是否直接使用 React */
  react: boolean
  /** 项目是否包含 Tailwind 依赖与样式入口 */
  tailwind: boolean
}

/** package.json 中可能声明直接依赖的字段 */
interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/** 自动检测时可按调用方需要跳过昂贵集成 */
interface DetectionOptions {
  /** 是否检测 Tailwind 样式入口 */
  tailwind?: boolean
}

/** -------------------- 核心函数 -------------------- */
/** 根据直接依赖与真实样式源码检测可选集成 */
export function detectIntegrations(
  cwd = process.cwd(),
  options: DetectionOptions = {},
): DetectedIntegrations {
  const dependencies = readProjectDependencies(cwd)
  const hasTailwind = dependencies.has('tailwindcss')
  const tailwind = options.tailwind !== false
    && hasTailwind
    && detectTailwindEntryPoint(cwd) !== undefined

  return {
    kerros: dependencies.has('@violetflux/kerros'),
    react: dependencies.has('react'),
    tailwind,
  }
}

/** 从 CSS import 图中推导唯一 Tailwind 根入口 */
export function detectTailwindEntryPoint(cwd = process.cwd()) {
  const files = discoverProjectFiles(cwd, '**/*.css')
  const sources = new Map(files.map(file => [
    file,
    readFileSync(path.join(cwd, file), 'utf8'),
  ]))
  const imports = new Map(files.map(file => [
    file,
    readRelativeCssImports(file, sources.get(file) ?? '', sources),
  ]))
  const reachability = new Map<string, boolean>()

  /** 判断当前 CSS 是否直接或间接加载 Tailwind */
  const reachesTailwind = (file: string, visiting = new Set<string>()): boolean => {
    const cached = reachability.get(file)

    if (cached !== undefined)
      return cached
    if (hasTailwindDirective(sources.get(file) ?? '')) {
      reachability.set(file, true)
      return true
    }
    if (visiting.has(file))
      return false

    visiting.add(file)
    const result = (imports.get(file) ?? [])
      .some(imported => reachesTailwind(imported, visiting))

    visiting.delete(file)
    reachability.set(file, result)
    return result
  }

  const candidates = files.filter(file => reachesTailwind(file))
  const importedCandidates = new Set(
    candidates.flatMap(file => imports.get(file) ?? [])
      .filter(file => reachability.get(file) === true),
  )
  const roots = candidates.filter(file => !importedCandidates.has(file))

  return roots.length === 1 ? roots[0] : undefined
}

/** -------------------- 内部函数 -------------------- */
/** 递归聚合项目源码树中的直接依赖 */
function readProjectDependencies(cwd: string) {
  const dependencies = new Set<string>()

  for (const file of discoverProjectFiles(cwd, '**/package.json')) {
    const manifest = JSON.parse(
      readFileSync(path.join(cwd, file), 'utf8'),
    ) as PackageManifest

    for (const records of [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.optionalDependencies,
      manifest.peerDependencies,
    ]) {
      for (const dependency of Object.keys(records ?? {}))
        dependencies.add(dependency)
    }
  }

  return dependencies
}

/** 按根项目 .gitignore 语义递归发现候选文件 */
export function discoverProjectFiles(cwd: string, pattern: string) {
  const matcher = createIgnore().add(['.git/', 'node_modules/'])
  const gitignorePath = path.join(cwd, '.gitignore')

  if (existsSync(gitignorePath))
    matcher.add(readFileSync(gitignorePath, 'utf8'))

  return globSync(pattern, {
    cwd,
    exclude: [...GLOB_EXCLUDE, '**/.git/**'],
  })
    .map(normalizePath)
    .filter(file => !matcher.ignores(file))
    .sort()
}

/** 读取 CSS 入口直接或间接导入的本地文件 */
export function readCssDependencyFiles(entryPoint: string, cwd = process.cwd()) {
  const pending = [path.resolve(cwd, entryPoint)]
  const visited = new Set<string>()

  while (pending.length > 0) {
    const file = pending.pop()!

    if (visited.has(file) || !existsSync(file))
      continue

    const source = readFileSync(file, 'utf8')

    visited.add(file)
    for (const specifier of readRelativeCssSpecifiers(source)) {
      const resolved = path.resolve(path.dirname(file), specifier)
      const imported = existsSync(resolved)
        ? resolved
        : existsSync(`${resolved}.css`) ? `${resolved}.css` : undefined

      if (imported)
        pending.push(imported)
    }
  }

  return [...visited].sort()
}

/** 读取 CSS 文件中的本地相对导入 */
function readRelativeCssImports(
  file: string,
  source: string,
  sources: ReadonlyMap<string, string>,
) {
  const imports: string[] = []
  for (const specifier of readRelativeCssSpecifiers(source)) {
    const resolved = normalizePath(path.join(path.dirname(file), specifier))
    const imported = sources.has(resolved)
      ? resolved
      : sources.has(`${resolved}.css`) ? `${resolved}.css` : undefined

    if (imported)
      imports.push(imported)
  }

  return imports
}

/** 读取 CSS 源码中的本地相对导入路径 */
function readRelativeCssSpecifiers(source: string) {
  const imports: string[] = []
  const pattern = /@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?/gu

  for (const match of source.matchAll(pattern)) {
    const specifier = match[1]?.split(/[?#]/u)[0]

    if (specifier?.startsWith('.'))
      imports.push(specifier)
  }

  return imports
}

/** 判断 CSS 是否直接加载 Tailwind */
function hasTailwindDirective(source: string) {
  return /@import\s+["']tailwindcss(?:\/[^"']*)?["']|@tailwind\s+(?:base|components|utilities)/u.test(source)
}

/** 统一文件路径分隔符供 import 图匹配 */
function normalizePath(file: string) {
  return file.split(path.sep).join('/')
}
