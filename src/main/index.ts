import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { execFile, execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, dirname, extname, join, parse } from 'node:path'
import { promisify } from 'node:util'
import icon from '../../resources/icon.png?asset'
import type { ConvertPayload, ConvertProgressEvent, ConvertResult, JobStatus } from '../shared/types'

const execFileAsync = promisify(execFile)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 840,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function parseSpeed(speed: number): number {
  if (!Number.isFinite(speed)) {
    throw new Error('Speed must be a number.')
  }
  if (speed <= 0) {
    throw new Error('Speed must be greater than 0.')
  }
  return speed
}

function buildAtempoFilter(speed: number): string {
  const validSpeed = parseSpeed(speed)
  const factors: number[] = []
  let remaining = validSpeed
  const eps = 1e-9

  while (remaining > 2 + eps) {
    factors.push(2)
    remaining /= 2
  }
  while (remaining < 0.5 - eps) {
    factors.push(0.5)
    remaining /= 0.5
  }

  if (factors.length === 0 || Math.abs(remaining - 1) > eps) {
    factors.push(remaining)
  }

  return factors.map((factor) => `atempo=${factor}`).join(',')
}

function defaultOutputPath(inputPath: string, speed: number): string {
  const ext = extname(inputPath)
  const base = basename(inputPath, ext)
  const speedToken = String(speed).replace('.', '_')
  return join(dirname(inputPath), `${base}_x${speedToken}${ext}`)
}

function commandFromPath(fullPath: string): string | null {
  try {
    const parsed = parse(fullPath)
    return parsed.base || null
  } catch {
    return null
  }
}

function detectCommandPath(command: string, envVarName: string, candidates: string[]): string | null {
  const envPath = process.env[envVarName]?.trim()
  if (envPath && existsSync(envPath)) {
    return envPath
  }

  try {
    if (process.platform === 'win32') {
      return execFileSync('where', [command], { encoding: 'utf8' }).split(/\r?\n/).find(Boolean) ?? null
    }
    return execFileSync('which', [command], { encoding: 'utf8' }).trim()
  } catch {
    // Ignore and fallback to fixed candidates.
  }

  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function detectFfmpegPath(): string | null {
  const command = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const candidates =
    process.platform === 'darwin'
      ? ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']
      : process.platform === 'win32'
        ? ['C:\\ffmpeg\\bin\\ffmpeg.exe', 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe', 'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe']
        : ['/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']

  return detectCommandPath(command, 'FFMPEG_PATH', candidates)
}

function detectFfprobePath(ffmpegPath?: string): string | null {
  const command = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  const candidates =
    process.platform === 'darwin'
      ? ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe', '/usr/bin/ffprobe']
      : process.platform === 'win32'
        ? ['C:\\ffmpeg\\bin\\ffprobe.exe', 'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe', 'C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe']
        : ['/usr/local/bin/ffprobe', '/usr/bin/ffprobe']

  const explicit = process.env['FFPROBE_PATH']?.trim()
  if (explicit && existsSync(explicit)) {
    return explicit
  }

  if (ffmpegPath) {
    const siblingName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
    const sibling = join(dirname(ffmpegPath), siblingName)
    if (existsSync(sibling)) {
      return sibling
    }
  }

  return detectCommandPath(command, 'FFPROBE_PATH', candidates)
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value <= 0) {
    return 0
  }
  if (value >= 100) {
    return 100
  }
  return Math.round(value * 100) / 100
}

function parseClockToMs(value: string): number | null {
  const parts = value.split(':')
  if (parts.length !== 3) {
    return null
  }
  const h = Number(parts[0])
  const m = Number(parts[1])
  const s = Number(parts[2])
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) {
    return null
  }
  return (h * 3600 + m * 60 + s) * 1000
}

function extractProgressMs(key: string, value: string): number | null {
  if (key === 'out_time_us' || key === 'out_time_ms') {
    const raw = Number(value)
    if (!Number.isFinite(raw)) {
      return null
    }
    return raw / 1000
  }
  if (key === 'out_time') {
    return parseClockToMs(value)
  }
  return null
}

function appendTail(current: string, chunk: string, maxLength: number): string {
  const merged = current + chunk
  if (merged.length <= maxLength) {
    return merged
  }
  return merged.slice(merged.length - maxLength)
}

function emitProgress(
  event: IpcMainInvokeEvent,
  jobId: string,
  status: JobStatus,
  percent: number,
  message?: string
): void {
  const payload: ConvertProgressEvent = {
    jobId,
    status,
    percent: clampPercent(percent),
    message
  }
  event.sender.send('audio:progress', payload)
}

async function probeDurationMs(inputPath: string, ffprobePath: string | null): Promise<number | null> {
  if (!ffprobePath) {
    return null
  }

  try {
    const result = await execFileAsync(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nokey=1:noprint_wrappers=1', inputPath],
      { windowsHide: true }
    )
    const durationSec = Number(String(result.stdout).trim())
    if (Number.isFinite(durationSec) && durationSec > 0) {
      return durationSec * 1000
    }
  } catch {
    // Ignore probing errors and continue without duration.
  }
  return null
}

async function convertAudio(event: IpcMainInvokeEvent, payload: ConvertPayload): Promise<ConvertResult> {
  try {
    const jobId = payload.jobId.trim()
    if (!jobId) {
      return { ok: false, error: 'Job ID is required.' }
    }

    const inputPath = payload.inputPath.trim()
    if (!inputPath) {
      return { ok: false, jobId, error: 'Input file is required.' }
    }

    const speed = parseSpeed(payload.speed)
    const outputPath = payload.outputPath?.trim() || defaultOutputPath(inputPath, speed)
    const ffmpegPath = payload.ffmpegPath?.trim() || detectFfmpegPath()

    if (!ffmpegPath) {
      emitProgress(event, jobId, 'failed', 0, 'FFmpeg not found')
      return { ok: false, jobId, error: 'FFmpeg not found. Install it or select FFmpeg manually.' }
    }

    const ffprobePath = detectFfprobePath(ffmpegPath)
    const totalDurationMs = await probeDurationMs(inputPath, ffprobePath)
    const args = ['-y', '-i', inputPath, '-filter:a', buildAtempoFilter(speed), '-progress', 'pipe:1', '-nostats', outputPath]

    return await new Promise<ConvertResult>((resolve) => {
      const child = spawn(ffmpegPath, args, { windowsHide: true })
      let resolved = false
      let stdoutBuffer = ''
      let stderrTail = ''
      let latestPercent = 0

      const finish = (result: ConvertResult): void => {
        if (resolved) return
        resolved = true
        resolve(result)
      }

      emitProgress(event, jobId, 'running', 0, commandFromPath(ffmpegPath) || ffmpegPath)

      child.stdout?.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString()
        let splitIndex = stdoutBuffer.indexOf('\n')

        while (splitIndex >= 0) {
          const line = stdoutBuffer.slice(0, splitIndex).trim()
          stdoutBuffer = stdoutBuffer.slice(splitIndex + 1)
          splitIndex = stdoutBuffer.indexOf('\n')

          if (!line || !line.includes('=')) continue

          const eqIndex = line.indexOf('=')
          const key = line.slice(0, eqIndex).trim()
          const value = line.slice(eqIndex + 1).trim()
          const parsedMs = extractProgressMs(key, value)

          if (parsedMs !== null && totalDurationMs && totalDurationMs > 0) {
            const percent = clampPercent((parsedMs / totalDurationMs) * 100)
            latestPercent = Math.max(latestPercent, Math.min(percent, 99.5))
            emitProgress(event, jobId, 'running', latestPercent)
          } else if (key === 'progress' && value === 'end') {
            emitProgress(event, jobId, 'done', 100)
          }
        }
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        stderrTail = appendTail(stderrTail, chunk.toString(), 6000)
      })

      child.on('error', (error) => {
        const message = error instanceof Error ? error.message : 'Process start failed'
        emitProgress(event, jobId, 'failed', latestPercent, message)
        finish({ ok: false, jobId, error: message })
      })

      child.on('close', (code) => {
        if (code === 0) {
          emitProgress(event, jobId, 'done', 100)
          finish({ ok: true, jobId, outputPath })
          return
        }

        const message = stderrTail.trim() || `FFmpeg exited with code ${String(code)}`
        emitProgress(event, jobId, 'failed', latestPercent, message)
        finish({ ok: false, jobId, error: message })
      })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown conversion error'
    return { ok: false, jobId: payload.jobId, error: message }
  }
}

function registerIpc(): void {
  ipcMain.handle('dialog:pick-inputs', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:pick-output', async (_event, defaultPath?: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultPath || 'output.mp3',
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }]
    })
    return result.canceled ? null : result.filePath ?? null
  })

  ipcMain.handle('dialog:pick-ffmpeg', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle('ffmpeg:detect', async () => detectFfmpegPath())
  ipcMain.handle('audio:suggest-output', async (_event, inputPath: string, speed: number) => defaultOutputPath(inputPath, speed))
  ipcMain.handle('audio:convert', async (event, payload: ConvertPayload) => convertAudio(event, payload))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
