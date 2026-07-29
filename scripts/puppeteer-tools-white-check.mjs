/**
 * Feedback loop: open 鋒兄工具 and sub-tools; fail if content area is white / empty / errors.
 * Exit 1 on blank tools page or pageerror.
 *
 * Requires: npm i -D puppeteer-core
 * Optional: CHROME_PATH / EDGE_PATH / CHECK_URL
 *
 * Example:
 *   CHECK_URL=http://localhost:3456/ node scripts/puppeteer-tools-white-check.mjs
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let puppeteer
try {
  puppeteer = require('puppeteer-core')
} catch {
  console.error('Missing puppeteer-core. Install with: npm i -D puppeteer-core')
  process.exit(1)
}

const BASE = process.env.CHECK_URL || 'http://localhost:3000/'
const EDGE =
  process.env.CHROME_PATH ||
  process.env.EDGE_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

async function snapshot(page) {
  return page.evaluate(() => {
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim()
    const nuxt = document.querySelector('#__nuxt')
    const toolsPage = document.querySelector('.feng-tools-page')
    const toolPanel = document.querySelector('.tool-panel, .ifc-panel, .ybc-panel, .vm-panel')
    const main =
      document.querySelector('main') ||
      document.querySelector('.page-container') ||
      document.querySelector('.content-area')
    return {
      title: document.title,
      textLen: text.length,
      textSample: text.slice(0, 500),
      nuxtLen: nuxt?.innerHTML?.length || 0,
      mainLen: main?.innerHTML?.length || 0,
      mainText: (main?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      hasToolsPage: Boolean(toolsPage),
      toolsPageHtmlLen: toolsPage?.innerHTML?.length || 0,
      toolsPageText: (toolsPage?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      hasToolPanel: Boolean(toolPanel),
      toolPanelText: (toolPanel?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
      activeTab: (document.querySelector('.nav-tab.active')?.textContent || '').trim(),
      activeSub: (document.querySelector('.nav-sub-tab.active, .nav-child-btn.active')?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
    }
  })
}

async function clickSelectorContaining(page, selector, label) {
  return page.evaluate(
    ({ selector, label }) => {
      const nodes = [...document.querySelectorAll(selector)]
      const el = nodes.find((n) => (n.textContent || '').replace(/\s+/g, ' ').includes(label))
      if (!el) {
        return {
          clicked: false,
          label,
          selector,
          candidates: nodes.slice(0, 20).map((n) => (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60))
        }
      }
      el.click()
      return {
        clicked: true,
        label,
        selector,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
      }
    },
    { selector, label }
  )
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1400,900']
})

const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
const pageErrors = []
const consoleErrors = []
const failedRequests = []
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err)))
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('requestfailed', (req) => {
  failedRequests.push(`${req.failure()?.errorText || 'fail'} ${req.url()}`)
})
page.on('response', (res) => {
  if (res.status() >= 400 && res.url().includes('_nuxt')) {
    failedRequests.push(`HTTP ${res.status()} ${res.url()}`)
  }
})

const results = { base: BASE, pageErrors, consoleErrors, failedRequests: [] }

try {
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 90000 })
  await new Promise((r) => setTimeout(r, 1200))
  results.home = await snapshot(page)

  results.clickTools = await clickSelectorContaining(page, '.nav-tab, .nav-btn', '鋒兄工具')
  await new Promise((r) => setTimeout(r, 1500))
  results.afterTools = await snapshot(page)

  // Sub-tools row may appear after parent is active
  results.clickYt = await clickSelectorContaining(
    page,
    '.nav-sub-tab, .nav-child-btn',
    'YT/B站轉檔'
  )
  await new Promise((r) => setTimeout(r, 2500))
  results.afterYt = await snapshot(page)

  results.clickConvert = await clickSelectorContaining(
    page,
    '.nav-sub-tab, .nav-child-btn',
    '圖片格式轉換'
  )
  await new Promise((r) => setTimeout(r, 2500))
  results.afterConvert = await snapshot(page)

  results.clickMerge = await clickSelectorContaining(page, '.nav-sub-tab, .nav-child-btn', '影片合併')
  await new Promise((r) => setTimeout(r, 2500))
  results.afterMerge = await snapshot(page)

  results.clickBiggo = await clickSelectorContaining(page, '.nav-sub-tab, .nav-child-btn', '鋒兄比價')
  await new Promise((r) => setTimeout(r, 1500))
  results.afterBiggo = await snapshot(page)

  results.failedRequests = failedRequests.slice(0, 40)

  // White if tools page never mounts, or mounts empty, or errors while on tools
  const toolsSteps = [results.afterTools, results.afterYt, results.afterConvert, results.afterMerge, results.afterBiggo]
  const anyToolsMounted = toolsSteps.some((s) => s?.hasToolsPage)
  const anyPanel = toolsSteps.some((s) => s?.hasToolPanel || (s?.toolsPageHtmlLen || 0) > 200)
  const white =
    pageErrors.length > 0 ||
    !anyToolsMounted ||
    !anyPanel ||
    (results.afterTools?.hasToolsPage && results.afterTools.toolsPageHtmlLen < 50)

  results.verdict = {
    white,
    pageErrorCount: pageErrors.length,
    consoleErrorCount: consoleErrors.length,
    anyToolsMounted,
    anyPanel,
    failedRequestCount: failedRequests.length
  }

  fs.writeFileSync('tmp-white-check.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
  process.exit(white ? 1 : 0)
} catch (err) {
  results.fatal = String(err?.stack || err)
  results.failedRequests = failedRequests.slice(0, 40)
  fs.writeFileSync('tmp-white-check.json', JSON.stringify(results, null, 2))
  console.error(JSON.stringify(results, null, 2))
  try {
    await browser.close()
  } catch {
    // ignore
  }
  process.exit(1)
}
