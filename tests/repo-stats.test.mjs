import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { countLinesOfCode, getRepoStats } from '../utils/repoStats.js'

test('build statistics split product and test lines and preserve the combined count', t => {
  const root = mkdtempSync(join(tmpdir(), 'fengbro-stats-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const fixtures = {
    'app/index.ts': '// comment\r\n  \r\nexport default 1',
    'tests/unit/example.mjs': '// test\n\ncheck()\n',
    'tests/notes.md': 'outside the source file types',
    'public/vendor.js': 'outside the product',
    'scripts/tool.js': 'maintenance',
  }
  for (const [path, content] of Object.entries(fixtures)) {
    const file = join(root, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  const { productLinesOfCode, testLinesOfCode, linesOfCode } = getRepoStats(root)
  assert.deepEqual([productLinesOfCode, testLinesOfCode, linesOfCode], [2, 2, 4])
  assert.equal(countLinesOfCode(root), 4)

  writeFileSync(join(root, 'tests/unit/example.mjs'), '\n')
  const nextBuild = getRepoStats(root)
  assert.equal(nextBuild.testLinesOfCode, 0)
  assert.equal(nextBuild.linesOfCode, 2)
})
