import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { ESLint } from 'eslint'
import { expect, test, vi } from 'vitest'
import { harness } from '../../src/index.js'

test('nestJS 类型导入规则只影响最近 package 声明了 Nest 的文件', async () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'harness-nest-boundaries-'))
  const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)
  const packages = {
    '.': { devDependencies: { '@nestjs/common': '*' } },
    'packages/client': {},
    'packages/server': { dependencies: { '@nestjs/common': '*' } },
    'packages/server/contracts': {},
    'packages/client/worker': { devDependencies: { '@nestjs/common': '*' } },
    'packages/server-extra': {},
  }

  try {
    for (const [directory, manifest] of Object.entries(packages)) {
      mkdirSync(path.join(cwd, directory), { recursive: true })
      writeFileSync(path.join(cwd, directory, 'package.json'), JSON.stringify(manifest))
    }

    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: await harness({ kerros: false, react: false, tailwind: false }),
    })

    for (const [file, preference] of [
      ['tests/root.ts', 'no-type-imports'],
      ['packages/client/src/index.ts', 'type-imports'],
      ['packages/server/src/index.ts', 'no-type-imports'],
      ['packages/server/contracts/index.ts', 'type-imports'],
      ['packages/client/worker/src/index.ts', 'no-type-imports'],
      ['packages/server-extra/index.ts', 'type-imports'],
    ] as const) {
      const config = await eslint.calculateConfigForFile(path.join(cwd, file))

      expect(config.rules['ts/consistent-type-imports'], file).toEqual([
        2,
        { prefer: preference },
      ])

      const [result] = await eslint.lintText(
        `import type { Value } from './value'\nexport type Result = Value\n`,
        { filePath: path.join(cwd, file) },
      )
      const typeImportErrors = result!.messages.filter(message => message.ruleId === 'ts/consistent-type-imports')

      expect(typeImportErrors.length, file).toBe(preference === 'no-type-imports' ? 1 : 0)
    }
  }
  finally {
    cwdSpy.mockRestore()
    rmSync(cwd, { force: true, recursive: true })
  }
})
