/**
 * yt-dlp + ffmpeg helpers for YouTube / Bilibili → MP3 / MP4.
 * Mirrors https://github.com/huang1988pioneer/YoutubeBilibiliMP4MP3Converter
 */

import { spawn } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { access, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, delimiter, dirname, join } from 'node:path'
import { platform } from 'node:os'
import JSZip from 'jszip'

const URL_INPUT_COUNTS = [1, 3, 7]
const OUTPUT_FORMATS = ['mp3', 'mp4']
const MP4_QUALITIES = ['1080p', '4k']

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be'
])

const BILIBILI_HOSTS = new Set([
  'bilibili.com',
  'www.bilibili.com',
  'm.bilibili.com',
  'b23.tv',
  'www.b23.tv'
])

export function normalizeUrlInputCount(n) {
  const v = Number(n)
  return URL_INPUT_COUNTS.includes(v) ? v : 1
}

export function normalizeOutputFormat(fmt) {
  const s = String(fmt || 'mp3').toLowerCase()
  return OUTPUT_FORMATS.includes(s) ? s : 'mp3'
}

export function normalizeMp4Quality(q) {
  const s = String(q || '1080p').toLowerCase()
  if (s === '4k' || s === '2160p') return '4k'
  return '1080p'
}

export function isAllowedMediaUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim())
    if (!/^https?:$/i.test(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (YOUTUBE_HOSTS.has(host)) return true
    if (BILIBILI_HOSTS.has(host)) return true
    if (host.endsWith('.youtube.com') || host.endsWith('.bilibili.com')) return true
    return false
  } catch {
    return false
  }
}

export function normalizeMediaUrl(raw) {
  const url = String(raw || '').trim()
  try {
    const uri = new URL(url)
    if (!isBilibiliHost(uri.hostname)) return url
    const tracking = new Set([
      'spm_id_from',
      'from_spmid',
      'vd_source',
      'share_source',
      'share_medium',
      'share_plat',
      'share_session_id',
      'unique_k'
    ])
    const kept = []
    uri.searchParams.forEach((value, key) => {
      if (!tracking.has(key.toLowerCase())) kept.push([key, value])
    })
    uri.search = ''
    for (const [k, v] of kept) uri.searchParams.append(k, v)
    return uri.toString()
  } catch {
    return url
  }
}

function isBilibiliHost(host) {
  const h = String(host || '').toLowerCase()
  return h === 'b23.tv' || h.endsWith('bilibili.com')
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function candidateNames(name) {
  if (platform() === 'win32' && !/\.[a-z0-9]+$/i.test(name)) {
    return [`${name}.exe`, name]
  }
  return [name]
}

function pathDirs() {
  const fromEnv = (process.env.PATH || '').split(delimiter).filter(Boolean)
  const extras =
    platform() === 'win32'
      ? [
          join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links'),
          join(process.env.ProgramFiles || 'C:\\Program Files', 'yt-dlp'),
          join(process.env.ProgramFiles || 'C:\\Program Files', 'ffmpeg', 'bin'),
          'C:\\ffmpeg\\bin'
        ]
      : ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin']
  return [...new Set([...fromEnv, ...extras])]
}

/**
 * Resolve executable: env override → PATH search.
 * @param {'yt-dlp'|'ffmpeg'|'ffprobe'} name
 * @param {string} [envKey]
 */
export async function findExecutable(name, envKey) {
  if (envKey && process.env[envKey]) {
    const p = process.env[envKey]
    if (await fileExists(p)) return p
  }
  for (const dir of pathDirs()) {
    for (const bin of candidateNames(name)) {
      const full = join(dir, bin)
      if (existsSync(full)) return full
    }
  }
  return null
}

export async function getToolStatus() {
  const ytDlp = await findExecutable('yt-dlp', 'YT_DLP_PATH')
  const ffmpeg = await findExecutable('ffmpeg', 'FFMPEG_PATH')
  const ffprobe = await findExecutable('ffprobe', 'FFPROBE_PATH')
  const ready = Boolean(ytDlp && ffmpeg && ffprobe)
  return {
    ready,
    ytDlp: ytDlp || null,
    ffmpeg: ffmpeg || null,
    ffprobe: ffprobe || null,
    installHint:
      platform() === 'win32'
        ? 'Windows：以系統管理員開啟終端機後執行 winget install yt-dlp.yt-dlp Gyan.FFmpeg，再重啟本站服務。'
        : platform() === 'darwin'
          ? 'macOS：brew install yt-dlp ffmpeg'
          : 'Linux：用套件管理器安裝 yt-dlp 與 ffmpeg，並確認在 PATH 中。',
    note: ready
      ? '本機已偵測到 yt-dlp 與 ffmpeg，可直接轉換。'
      : '目前伺服器找不到 yt-dlp / ffmpeg。Netlify 等無伺服器環境通常無法內建；請本機或自架 Docker 安裝工具後使用，或改用桌面版。'
  }
}

function getMp4FormatSelector(quality) {
  const maxHeight = quality === '4k' ? 2160 : 1080
  return `bestvideo*[height<=${maxHeight}]+bestaudio/best[height<=${maxHeight}]/best`
}

/**
 * @param {string[]} args
 * @param {{ onLog?: (line: string) => void, timeoutMs?: number }} [opts]
 */
function runProcess(file, args, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1'
      }
    })

    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        child.kill('SIGKILL')
      } catch {
        /* ignore */
      }
      reject(new Error(`逾時（>${Math.round(timeoutMs / 60000)} 分鐘）`))
    }, timeoutMs)

    const pump = (stream) => {
      let buf = ''
      stream.setEncoding('utf8')
      stream.on('data', (chunk) => {
        buf += chunk
        const parts = buf.split(/\r?\n/)
        buf = parts.pop() || ''
        for (const line of parts) {
          if (line.trim()) opts.onLog?.(line.trim())
        }
      })
      stream.on('end', () => {
        if (buf.trim()) opts.onLog?.(buf.trim())
      })
    }

    pump(child.stdout)
    pump(child.stderr)

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(err)
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(code ?? 1)
    })
  })
}

/**
 * Convert one media URL with yt-dlp into outDir.
 * @returns {Promise<{ code: number, files: string[] }>}
 */
export async function convertOneUrl({
  url,
  outDir,
  format,
  mp4Quality,
  ytDlpPath,
  ffmpegPath,
  onLog
}) {
  const outputFormat = normalizeOutputFormat(format)
  const quality = normalizeMp4Quality(mp4Quality)
  const mediaUrl = normalizeMediaUrl(url)
  const ffmpegDir = dirname(ffmpegPath)

  /** @type {string[]} */
  const args = []

  if (outputFormat === 'mp4') {
    args.push('--format', getMp4FormatSelector(quality), '--merge-output-format', 'mp4')
  } else {
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0')
  }

  args.push('--encoding', 'utf-8')
  args.push('--ffmpeg-location', ffmpegDir)
  args.push('--write-subs', '--write-auto-subs')
  args.push('--sub-langs', 'zh.*,zh-Hans,zh-Hant,zh-CN,zh-TW,zh')
  args.push('--convert-subs', 'srt')

  // Single video by default; playlists allowed when URL looks like a list
  if (!/[?&]list=|\/playlist|\/lists\//i.test(mediaUrl)) {
    args.push('--no-playlist')
  }

  if (outputFormat === 'mp3') {
    args.push('--embed-thumbnail')
  }
  args.push('--add-metadata')
  args.push('--paths', outDir)
  args.push('--output', '%(title).180B [%(id)s].%(ext)s')
  args.push('--restrict-filenames')

  if (isBilibiliHost(new URL(mediaUrl).hostname)) {
    args.push(
      '--add-headers',
      'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    )
    args.push('--add-headers', 'Referer:https://www.bilibili.com/')
    args.push('--add-headers', 'Accept-Language:zh-CN,zh-TW;q=0.9,zh;q=0.8,en;q=0.7')
  }

  args.push(mediaUrl)

  onLog?.(`$ yt-dlp ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`)

  const before = new Set(await listFilesRecursive(outDir))
  const code = await runProcess(ytDlpPath, args, { onLog })
  const after = await listFilesRecursive(outDir)
  const files = after.filter((f) => !before.has(f) && isMediaOrSubFile(f))

  return { code, files }
}

function isMediaOrSubFile(path) {
  return /\.(mp3|mp4|m4a|webm|mkv|srt|vtt|jpg|png|webp)$/i.test(path)
}

async function listFilesRecursive(dir) {
  /** @type {string[]} */
  const out = []
  const walk = async (d) => {
    let entries
    try {
      entries = await readdir(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const full = join(d, ent.name)
      if (ent.isDirectory()) await walk(full)
      else out.push(full)
    }
  }
  await walk(dir)
  return out
}

/**
 * Convert multiple URLs; returns a single downloadable artifact.
 * @param {{
 *   urls: string[],
 *   format?: string,
 *   mp4Quality?: string,
 *   onLog?: (line: string) => void,
 * }} options
 */
export async function convertMediaUrls(options) {
  const status = await getToolStatus()
  if (!status.ready) {
    const err = new Error(status.note)
    err.code = 'TOOLS_MISSING'
    err.status = status
    throw err
  }

  const format = normalizeOutputFormat(options.format)
  const mp4Quality = normalizeMp4Quality(options.mp4Quality)
  const urls = [...new Set((options.urls || []).map((u) => String(u || '').trim()).filter(Boolean))]
    .map(normalizeMediaUrl)
    .filter(isAllowedMediaUrl)

  if (!urls.length) {
    throw new Error('請至少輸入一個有效的 YouTube 或 Bilibili 網址')
  }
  if (urls.length > 7) {
    throw new Error('一次最多 7 個網址')
  }

  const workDir = await mkdtemp(join(tmpdir(), 'fengbro-ytdlp-'))
  const logs = []
  const onLog = (line) => {
    logs.push(line)
    options.onLog?.(line)
  }

  onLog(`yt-dlp: ${status.ytDlp}`)
  onLog(`ffmpeg: ${status.ffmpeg}`)
  onLog(`ffprobe: ${status.ffprobe}`)
  onLog(`輸出格式: ${format.toUpperCase()}`)
  if (format === 'mp4') onLog(`MP4 畫質: ${mp4Quality === '4k' ? '4K' : '1080p'}`)
  onLog(`準備轉換 ${urls.length} 個項目`)

  /** @type {string[]} */
  const allFiles = []
  let success = 0

  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      onLog('')
      onLog(`[${i + 1}/${urls.length}] ${url}`)
      const itemDir = join(workDir, `item-${i + 1}`)
      await mkdir(itemDir, { recursive: true })

      try {
        const { code, files } = await convertOneUrl({
          url,
          outDir: itemDir,
          format,
          mp4Quality,
          ytDlpPath: status.ytDlp,
          ffmpegPath: status.ffmpeg,
          onLog
        })
        if (code === 0 && files.length) {
          success += 1
          allFiles.push(...files)
          onLog(`[${i + 1}/${urls.length}] 完成（${files.length} 個檔案）`)
        } else {
          onLog(`[${i + 1}/${urls.length}] 轉換失敗，結束碼 ${code}`)
        }
      } catch (err) {
        onLog(`[${i + 1}/${urls.length}] 錯誤：${err?.message || err}`)
      }
    }

    if (!allFiles.length) {
      const err = new Error('全部轉換失敗，請查看記錄。部分影片可能有地區／登入／防爬限制。')
      err.logs = logs
      throw err
    }

    // Prefer main media files for packaging
    const mediaFiles = allFiles.filter((f) => /\.(mp3|mp4)$/i.test(f))
    const packFiles = mediaFiles.length ? mediaFiles : allFiles

    if (packFiles.length === 1) {
      const filePath = packFiles[0]
      const st = await stat(filePath)
      const filename = basename(filePath)
      return {
        kind: 'file',
        filePath,
        filename,
        mime: /\.mp3$/i.test(filename) ? 'audio/mpeg' : 'video/mp4',
        size: st.size,
        workDir,
        successCount: success,
        total: urls.length,
        logs
      }
    }

    const zip = new JSZip()
    const used = new Set()
    for (const f of packFiles) {
      let name = basename(f)
      if (used.has(name)) {
        const base = name.replace(/\.[^.]+$/, '')
        const ext = name.includes('.') ? name.split('.').pop() : 'bin'
        let n = 2
        while (used.has(`${base}_${n}.${ext}`)) n += 1
        name = `${base}_${n}.${ext}`
      }
      used.add(name)
      zip.file(name, await readFile(f))
    }
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer' })
    const zipPath = join(workDir, `fengbro-media-${format}.zip`)
    await writeFile(zipPath, zipBuf)
    return {
      kind: 'zip',
      filePath: zipPath,
      filename: `fengbro-ytbili-${format}-${Date.now()}.zip`,
      mime: 'application/zip',
      size: zipBuf.length,
      workDir,
      successCount: success,
      total: urls.length,
      logs
    }
  } catch (err) {
    await cleanupWorkDir(workDir)
    throw err
  }
}

export async function cleanupWorkDir(workDir) {
  if (!workDir) return
  try {
    await rm(workDir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}

export function openFileStream(filePath) {
  return createReadStream(filePath)
}
