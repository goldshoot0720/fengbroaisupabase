import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, sep } from 'node:path'

// Build/docs/agent/static — not product app source.
const SKIP_DIRS = new Set([
  '.agents',
  '.git',
  '.impeccable',
  '.netlify',
  '.nuxt',
  '.output',
  'dist',
  'docs',
  'node_modules',
  'public',
  'face-api-models',
  // Maintenance / upload helpers — not shipped product UI/API.
  'scripts'
])

// Product source only — Vue app, composables, server API, utils, CSS.
const CODE_EXTS = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.vue',
  '.css',
  '.scss'
])

const SKIP_FILES = new Set([
  'package-lock.json',
  'deno.lock',
  'skills-lock.json',
  // One-off maintenance scripts at repo root.
  'fix-duplicates.cjs'
])

/**
 * Latest commit author date (YYYY-MM-DD), or today if git is unavailable.
 */
export function getLastUpdateDate() {
  try {
    const raw = execSync('git log -1 --format=%ci', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    if (raw) return raw.slice(0, 10)
  } catch {
    // Fall through when git is missing (e.g. some CI snapshots).
  }
  return new Date().toISOString().slice(0, 10)
}

function walkCodeFiles(dir, files = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walkCodeFiles(fullPath, files)
      continue
    }
    if (!entry.isFile()) continue
    if (SKIP_FILES.has(entry.name)) continue
    if (!CODE_EXTS.has(extname(entry.name).toLowerCase())) continue
    try {
      if (statSync(fullPath).size > 2 * 1024 * 1024) continue
    } catch {
      continue
    }
    files.push(fullPath)
  }
  return files
}

/**
 * Count non-empty product source lines under the repo root.
 * Excludes node_modules/dist/docs/public/scripts and blank lines.
 */
function countSourceLines(rootDir) {
  const testDirectory = join(rootDir, 'tests') + sep
  let productLinesOfCode = 0
  let testLinesOfCode = 0
  for (const file of walkCodeFiles(rootDir)) {
    try {
      const text = readFileSync(file, 'utf8')
      let lines = 0
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) lines += 1
      }
      if (file.startsWith(testDirectory)) testLinesOfCode += lines
      else productLinesOfCode += lines
    } catch {
      // Skip unreadable files.
    }
  }
  return { productLinesOfCode, testLinesOfCode, linesOfCode: productLinesOfCode + testLinesOfCode }
}

export function countLinesOfCode(rootDir = process.cwd()) {
  return countSourceLines(rootDir).linesOfCode
}

export function getRepoStats(rootDir = process.cwd()) {
  return {
    lastUpdateDate: getLastUpdateDate(),
    ...countSourceLines(rootDir)
  }
}
