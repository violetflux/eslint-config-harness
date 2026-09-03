import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import {
  detectIntegrations,
  detectNestJsScopes,
  detectTailwindEntryPoint,
  detectTypeScriptParserScopes,
  readCssDependencyFiles,
} from '../../src/config/detection.js'

/** -------------------- 常量 -------------------- */
/** 当前测试创建的隔离项目目录 */
const temporaryDirs: string[] = []

/** -------------------- 测试 -------------------- */
afterEach(() => {
  for (const dir of temporaryDirs.splice(0))
    rmSync(dir, { force: true, recursive: true })
})

test('自动检测根项目与 Workspace 的直接集成依赖', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))
  const stylesDir = path.join(cwd, 'design/system')
  const workspaceDir = path.join(cwd, 'packages/ui')

  temporaryDirs.push(cwd)
  mkdirSync(stylesDir, { recursive: true })
  mkdirSync(workspaceDir, { recursive: true })
  writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
    dependencies: {
      react: '^19.0.0',
      tailwindcss: '^4.0.0',
    },
  }))
  writeFileSync(path.join(workspaceDir, 'package.json'), JSON.stringify({
    dependencies: {
      '@violetflux/kerros': '^0.3.3',
    },
  }))
  writeFileSync(path.join(stylesDir, 'index.css'), '@import "./theme.css";\n')
  writeFileSync(path.join(stylesDir, 'theme.css'), '@import "tailwindcss";\n')

  expect(detectIntegrations(cwd)).toEqual({
    kerros: true,
    react: true,
    tailwind: true,
  })
  expect(detectTailwindEntryPoint(cwd)).toBe('design/system/index.css')
})

test('多个 Tailwind 根入口存在时不猜测默认入口', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))

  temporaryDirs.push(cwd)
  mkdirSync(path.join(cwd, 'styles'), { recursive: true })
  writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
    dependencies: { tailwindcss: '^4.0.0' },
  }))
  writeFileSync(path.join(cwd, 'styles/app.css'), '@import "tailwindcss";\n')
  writeFileSync(path.join(cwd, 'styles/admin.css'), '@import "tailwindcss";\n')

  expect(detectTailwindEntryPoint(cwd)).toBeUndefined()
  expect(detectIntegrations(cwd).tailwind).toBe(false)
})

test('自动检测遵循根项目 .gitignore', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))
  const generatedDir = path.join(cwd, 'generated')

  temporaryDirs.push(cwd)
  mkdirSync(generatedDir, { recursive: true })
  writeFileSync(path.join(cwd, '.gitignore'), 'generated/\n')
  writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
    dependencies: { tailwindcss: '^4.0.0' },
  }))
  writeFileSync(path.join(generatedDir, 'package.json'), JSON.stringify({
    dependencies: {
      '@violetflux/kerros': '^0.3.3',
      react: '^19.0.0',
    },
  }))
  writeFileSync(path.join(generatedDir, 'index.css'), '@import "tailwindcss";\n')

  expect(detectIntegrations(cwd)).toEqual({
    kerros: false,
    react: false,
    tailwind: false,
  })
  expect(detectTailwindEntryPoint(cwd)).toBeUndefined()
})

test('自动检测与 Antfu 默认忽略范围保持一致', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))
  const outputDir = path.join(cwd, 'dist')

  temporaryDirs.push(cwd)
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(path.join(cwd, 'package.json'), '{}')
  writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify({
    dependencies: {
      '@violetflux/kerros': '^0.3.3',
      react: '^19.0.0',
      tailwindcss: '^4.0.0',
    },
  }))
  writeFileSync(path.join(outputDir, 'index.css'), '@import "tailwindcss";\n')

  expect(detectIntegrations(cwd)).toEqual({
    kerros: false,
    react: false,
    tailwind: false,
  })
})

test('可显式跳过 Tailwind 样式入口检测', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))

  temporaryDirs.push(cwd)
  writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
    dependencies: { tailwindcss: '^4.0.0' },
  }))
  writeFileSync(path.join(cwd, 'index.css'), '@import "tailwindcss";\n')

  expect(detectIntegrations(cwd, { tailwind: false }).tailwind).toBe(false)
})

test('从继承后的 TSConfig 选项推导装饰器解析范围', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))
  const serverDir = path.join(cwd, 'projects/server')

  temporaryDirs.push(cwd)
  mkdirSync(serverDir, { recursive: true })
  writeFileSync(path.join(cwd, 'tsconfig.base.json'), JSON.stringify({
    compilerOptions: {
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
    },
  }))
  writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      emitDecoratorMetadata: false,
      experimentalDecorators: false,
    },
    files: [],
  }))
  writeFileSync(path.join(serverDir, 'tsconfig.json'), JSON.stringify({
    extends: '../../tsconfig.base.json',
    files: [],
  }))

  expect(detectTypeScriptParserScopes(cwd)).toEqual([
    {
      emitDecoratorMetadata: false,
      experimentalDecorators: false,
      files: ['**/*.{ts,tsx,mts,cts}'],
    },
    {
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      files: ['projects/server/**/*.{ts,tsx,mts,cts}'],
    },
  ])
})

test('从直接依赖推导 NestJS package 范围', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))
  const serverDir = path.join(cwd, 'projects/server')
  const clientDir = path.join(cwd, 'projects/client')

  temporaryDirs.push(cwd)
  mkdirSync(serverDir, { recursive: true })
  mkdirSync(clientDir, { recursive: true })
  writeFileSync(path.join(cwd, 'package.json'), '{}')
  writeFileSync(path.join(serverDir, 'package.json'), JSON.stringify({
    dependencies: { '@nestjs/common': '^11.0.0' },
  }))
  writeFileSync(path.join(clientDir, 'package.json'), JSON.stringify({
    dependencies: { react: '^19.0.0' },
  }))

  expect(detectNestJsScopes(cwd)).toEqual([
    { files: ['projects/server/**/*.{ts,tsx,mts,cts}'] },
  ])
})

test('只读取入口 CSS 可达的本地依赖', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-detection-'))
  const stylesDir = path.join(cwd, 'styles')

  temporaryDirs.push(cwd)
  mkdirSync(stylesDir, { recursive: true })
  writeFileSync(path.join(stylesDir, 'index.css'), '@import "./theme.css";\n')
  writeFileSync(path.join(stylesDir, 'theme.css'), '@import "./tokens";\n')
  writeFileSync(path.join(stylesDir, 'tokens.css'), ':root { color: black; }\n')
  writeFileSync(path.join(stylesDir, 'unrelated.css'), ':root { color: red; }\n')

  expect(readCssDependencyFiles('styles/index.css', cwd)).toEqual([
    path.join(stylesDir, 'index.css'),
    path.join(stylesDir, 'theme.css'),
    path.join(stylesDir, 'tokens.css'),
  ])
})
