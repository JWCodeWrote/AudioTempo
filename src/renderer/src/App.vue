<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ConvertProgressEvent, ConvertResult, JobStatus } from '../../shared/types'

interface QueueJob {
  id: string
  inputPath: string
  outputPath: string
  progress: number
  status: JobStatus
  message: string
}

type Locale = 'zh-CN' | 'en'

type MessageKey =
  | 'title'
  | 'subtitle'
  | 'lang.zh'
  | 'lang.en'
  | 'label.ffmpegPath'
  | 'label.speed'
  | 'placeholder.ffmpegPath'
  | 'placeholder.speed'
  | 'button.pick'
  | 'button.addFiles'
  | 'button.clearQueue'
  | 'button.startBatch'
  | 'button.converting'
  | 'summary.total'
  | 'summary.done'
  | 'summary.failed'
  | 'summary.pending'
  | 'summary.overall'
  | 'queue.title'
  | 'queue.hint'
  | 'queue.empty'
  | 'queue.output'
  | 'job.remove'
  | 'job.status.pending'
  | 'job.status.running'
  | 'job.status.done'
  | 'job.status.failed'
  | 'status.ready'
  | 'status.selectedExists'
  | 'status.added'
  | 'status.addFilesFailed'
  | 'status.queueCleared'
  | 'status.preparingQueue'
  | 'status.converting'
  | 'status.batchFinishedWithFailed'
  | 'status.batchFinished'
  | 'status.batchFailed'
  | 'error.speedPositive'
  | 'error.queueEmpty'
  | 'guide.title'
  | 'guide.desc'
  | 'guide.step1'
  | 'guide.step2'
  | 'guide.step3'
  | 'guide.win'
  | 'guide.mac'
  | 'guide.pick'
  | 'guide.close'
  | 'guide.show'

const messages: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': {
    title: 'AudioTempo',
    subtitle: '基于 Electron + Vue + FFmpeg 的批量音频变速工具',
    'lang.zh': '简体中文',
    'lang.en': 'English',
    'label.ffmpegPath': 'FFmpeg 路径',
    'label.speed': '倍速',
    'placeholder.ffmpegPath': '自动检测，可手动覆盖',
    'placeholder.speed': '例如：0.5、0.75、1、1.1、1.25',
    'button.pick': '选择',
    'button.addFiles': '添加音频文件',
    'button.clearQueue': '清空队列',
    'button.startBatch': '开始批量转换',
    'button.converting': '转换中...',
    'summary.total': '总数',
    'summary.done': '完成',
    'summary.failed': '失败',
    'summary.pending': '等待',
    'summary.overall': '总体进度',
    'queue.title': '队列',
    'queue.hint': '文件按顺序逐个转换。',
    'queue.empty': '队列为空，点击“添加音频文件”开始。',
    'queue.output': '输出',
    'job.remove': '移除',
    'job.status.pending': '等待',
    'job.status.running': '处理中',
    'job.status.done': '完成',
    'job.status.failed': '失败',
    'status.ready': '就绪',
    'status.selectedExists': '所选文件已存在于队列中。',
    'status.added': '已添加 {count} 个文件到队列。',
    'status.addFilesFailed': '添加文件失败：{message}',
    'status.queueCleared': '队列已清空。',
    'status.preparingQueue': '正在准备队列...',
    'status.converting': '正在转换：{name}',
    'status.batchFinishedWithFailed': '批量转换完成，失败 {count} 个文件。',
    'status.batchFinished': '批量转换完成。',
    'status.batchFailed': '批量转换失败：{message}',
    'error.speedPositive': '倍速必须是大于 0 的数字。',
    'error.queueEmpty': '队列为空，请先添加音频文件。',
    'guide.title': '检测到 FFmpeg 未安装',
    'guide.desc': '首次使用请先安装 FFmpeg，安装后即可正常转换音频。',
    'guide.step1': '1. 点击下方按钮前往安装页面（Windows 或 macOS）。',
    'guide.step2': '2. 安装后重启本应用，或点击“选择 FFmpeg 文件”手动指定路径。',
    'guide.step3': '3. 如果你已经安装过，可直接关闭此提示继续使用。',
    'guide.win': 'Windows 安装指引',
    'guide.mac': 'macOS 安装指引',
    'guide.pick': '选择 FFmpeg 文件',
    'guide.close': '我知道了',
    'guide.show': 'FFmpeg 安装指引'
  },
  en: {
    title: 'AudioTempo',
    subtitle: 'Batch queue + progress view powered by Electron + Vue + FFmpeg.',
    'lang.zh': '简体中文',
    'lang.en': 'English',
    'label.ffmpegPath': 'FFmpeg Path',
    'label.speed': 'Speed',
    'placeholder.ffmpegPath': 'Auto-detected; you can override manually',
    'placeholder.speed': '0.5, 0.75, 1, 1.1, 1.25...',
    'button.pick': 'Pick',
    'button.addFiles': 'Add Audio Files',
    'button.clearQueue': 'Clear Queue',
    'button.startBatch': 'Start Batch Convert',
    'button.converting': 'Converting...',
    'summary.total': 'Total',
    'summary.done': 'Done',
    'summary.failed': 'Failed',
    'summary.pending': 'Pending',
    'summary.overall': 'Overall',
    'queue.title': 'Queue',
    'queue.hint': 'Each file is converted sequentially.',
    'queue.empty': 'Queue is empty. Click "Add Audio Files" to start.',
    'queue.output': 'Output',
    'job.remove': 'Remove',
    'job.status.pending': 'Pending',
    'job.status.running': 'Running',
    'job.status.done': 'Done',
    'job.status.failed': 'Failed',
    'status.ready': 'Ready',
    'status.selectedExists': 'Selected files already exist in the queue.',
    'status.added': 'Added {count} file(s) to queue.',
    'status.addFilesFailed': 'Add files failed: {message}',
    'status.queueCleared': 'Queue cleared.',
    'status.preparingQueue': 'Preparing queue...',
    'status.converting': 'Converting: {name}',
    'status.batchFinishedWithFailed': 'Batch finished with {count} failed file(s).',
    'status.batchFinished': 'Batch finished successfully.',
    'status.batchFailed': 'Batch failed: {message}',
    'error.speedPositive': 'Speed must be a positive number.',
    'error.queueEmpty': 'Queue is empty. Add audio files first.',
    'guide.title': 'FFmpeg Not Found',
    'guide.desc': 'Please install FFmpeg before converting audio.',
    'guide.step1': '1. Open install guide for Windows or macOS.',
    'guide.step2': '2. Restart app after install, or pick FFmpeg binary manually.',
    'guide.step3': '3. If FFmpeg is already installed, close this dialog and continue.',
    'guide.win': 'Windows Install Guide',
    'guide.mac': 'macOS Install Guide',
    'guide.pick': 'Pick FFmpeg Binary',
    'guide.close': 'Close',
    'guide.show': 'FFmpeg Guide'
  }
}

const speedPresets = ['0.5', '0.75', '1', '1.1', '1.25']
const locale = ref<Locale>('zh-CN')
const showFfmpegGuide = ref(false)
const ffmpegPath = ref('')
const speedText = ref('1')
const statusKey = ref<MessageKey>('status.ready')
const statusVars = ref<Record<string, string | number>>({})
const jobs = ref<QueueJob[]>([])
const runningBatch = ref(false)
let removeProgressListener: (() => void) | null = null

function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  let text = messages[locale.value][key] || key
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v))
  }
  return text
}

const statusText = computed(() => t(statusKey.value, statusVars.value))
const hasApi = computed(() => Boolean(window.audioTempo))
const totalJobs = computed(() => jobs.value.length)
const doneJobs = computed(() => jobs.value.filter((job) => job.status === 'done').length)
const failedJobs = computed(() => jobs.value.filter((job) => job.status === 'failed').length)
const pendingJobs = computed(() => jobs.value.filter((job) => job.status === 'pending').length)
const overallProgress = computed(() => {
  if (jobs.value.length === 0) return 0
  const sum = jobs.value.reduce((acc, job) => acc + Math.max(0, Math.min(100, job.progress)), 0)
  return Math.round((sum / jobs.value.length) * 100) / 100
})

function parseSpeed(): number {
  const speed = Number(speedText.value.trim())
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(t('error.speedPositive'))
  }
  return speed
}

function setLocale(next: Locale): void {
  locale.value = next
}

function setStatus(key: MessageKey, vars: Record<string, string | number> = {}): void {
  statusKey.value = key
  statusVars.value = vars
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100) / 100}%`
}

function basename(inputPath: string): string {
  const normalized = inputPath.replaceAll('\\', '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || inputPath
}

function makeJobId(seed: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  const safeSeed = basename(seed).replaceAll(/[^a-zA-Z0-9._-]/g, '_')
  return `${safeSeed}-${Date.now()}-${random}`
}

function updateJob(jobId: string, patch: Partial<QueueJob>): void {
  jobs.value = jobs.value.map((job) => (job.id === jobId ? { ...job, ...patch } : job))
}

function applyPreset(value: string): void {
  speedText.value = value
}

function openExternal(url: string): void {
  window.open(url, '_blank')
}

async function detectFfmpeg(): Promise<void> {
  if (!hasApi.value) return
  const detected = await window.audioTempo.detectFfmpegPath()
  if (detected) {
    ffmpegPath.value = detected
    showFfmpegGuide.value = false
  } else {
    showFfmpegGuide.value = true
  }
}

async function pickFfmpeg(): Promise<void> {
  if (!hasApi.value) return
  const picked = await window.audioTempo.pickFfmpegFile()
  if (picked) {
    ffmpegPath.value = picked
    showFfmpegGuide.value = false
  }
}

async function addFiles(): Promise<void> {
  if (!hasApi.value || runningBatch.value) return

  try {
    const speed = parseSpeed()
    const selectedPaths = await window.audioTempo.pickInputFiles()
    if (selectedPaths.length === 0) return

    const existing = new Set(jobs.value.map((job) => job.inputPath))
    const newJobs: QueueJob[] = []

    for (const path of selectedPaths) {
      if (existing.has(path)) continue
      const outputPath = await window.audioTempo.suggestOutputPath(path, speed)
      newJobs.push({
        id: makeJobId(path),
        inputPath: path,
        outputPath,
        progress: 0,
        status: 'pending',
        message: ''
      })
      existing.add(path)
    }

    if (newJobs.length === 0) {
      setStatus('status.selectedExists')
      return
    }

    jobs.value = [...jobs.value, ...newJobs]
    setStatus('status.added', { count: newJobs.length })
  } catch (error) {
    setStatus('status.addFilesFailed', {
      message: error instanceof Error ? error.message : 'Unknown'
    })
  }
}

function clearQueue(): void {
  if (runningBatch.value) return
  jobs.value = []
  setStatus('status.queueCleared')
}

function removeJob(jobId: string): void {
  if (runningBatch.value) return
  jobs.value = jobs.value.filter((job) => job.id !== jobId)
}

async function refreshPendingOutputPaths(speed: number): Promise<void> {
  if (!hasApi.value) return
  for (const job of jobs.value) {
    if (job.status !== 'pending') continue
    const newOutput = await window.audioTempo.suggestOutputPath(job.inputPath, speed)
    updateJob(job.id, { outputPath: newOutput })
  }
}

function handleProgress(evt: ConvertProgressEvent): void {
  const target = jobs.value.find((job) => job.id === evt.jobId)
  if (!target) return

  const patch: Partial<QueueJob> = {
    progress: evt.percent,
    status: evt.status
  }
  if (evt.message) {
    patch.message = evt.message
  }
  updateJob(evt.jobId, patch)
}

async function startBatch(): Promise<void> {
  if (!hasApi.value || runningBatch.value) return

  try {
    const speed = parseSpeed()
    if (jobs.value.length === 0) {
      throw new Error(t('error.queueEmpty'))
    }

    if (!ffmpegPath.value.trim()) {
      const detected = await window.audioTempo.detectFfmpegPath()
      if (!detected) {
        showFfmpegGuide.value = true
        throw new Error(t('guide.desc'))
      }
      ffmpegPath.value = detected
    }

    runningBatch.value = true
    setStatus('status.preparingQueue')
    await refreshPendingOutputPaths(speed)

    for (const job of jobs.value) {
      if (job.status !== 'pending') continue

      updateJob(job.id, { status: 'running', progress: 0, message: '' })
      setStatus('status.converting', { name: basename(job.inputPath) })

      const result: ConvertResult = await window.audioTempo.convertAudio({
        jobId: job.id,
        inputPath: job.inputPath,
        outputPath: job.outputPath,
        speed,
        ffmpegPath: ffmpegPath.value.trim() || undefined
      })

      if (result.ok) {
        updateJob(job.id, {
          status: 'done',
          progress: 100,
          outputPath: result.outputPath || job.outputPath,
          message: ''
        })
      } else {
        updateJob(job.id, {
          status: 'failed',
          message: result.error || 'Conversion failed.'
        })
      }
    }

    if (failedJobs.value > 0) {
      setStatus('status.batchFinishedWithFailed', { count: failedJobs.value })
    } else {
      setStatus('status.batchFinished')
    }
  } catch (error) {
    setStatus('status.batchFailed', {
      message: error instanceof Error ? error.message : 'Unknown'
    })
  } finally {
    runningBatch.value = false
  }
}

function jobStatusText(status: JobStatus): string {
  const map: Record<JobStatus, MessageKey> = {
    pending: 'job.status.pending',
    running: 'job.status.running',
    done: 'job.status.done',
    failed: 'job.status.failed'
  }
  return t(map[status])
}

onMounted(() => {
  detectFfmpeg()
  if (hasApi.value) {
    removeProgressListener = window.audioTempo.onConvertProgress(handleProgress)
  }
})

onBeforeUnmount(() => {
  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
})
</script>

<template>
  <main class="app">
    <section class="card">
      <div class="header-row">
        <div>
          <h1>{{ t('title') }}</h1>
          <p class="subtitle">{{ t('subtitle') }}</p>
        </div>
        <div class="lang-switch">
          <button type="button" class="ghost lang-btn" :class="{ active: locale === 'zh-CN' }" @click="setLocale('zh-CN')">
            {{ t('lang.zh') }}
          </button>
          <button type="button" class="ghost lang-btn" :class="{ active: locale === 'en' }" @click="setLocale('en')">
            {{ t('lang.en') }}
          </button>
        </div>
      </div>

      <label class="field">
        <span>{{ t('label.ffmpegPath') }}</span>
        <div class="row">
          <input v-model="ffmpegPath" type="text" :placeholder="t('placeholder.ffmpegPath')" />
          <button type="button" @click="pickFfmpeg">{{ t('button.pick') }}</button>
        </div>
      </label>

      <label class="field">
        <span>{{ t('label.speed') }}</span>
        <input v-model="speedText" type="text" :placeholder="t('placeholder.speed')" />
      </label>

      <div class="preset-row">
        <button v-for="preset in speedPresets" :key="preset" type="button" class="ghost" @click="applyPreset(preset)">
          {{ preset }}x
        </button>
      </div>

      <div class="actions">
        <button type="button" :disabled="runningBatch" @click="addFiles">{{ t('button.addFiles') }}</button>
        <button type="button" class="ghost" :disabled="runningBatch || totalJobs === 0" @click="clearQueue">{{ t('button.clearQueue') }}</button>
        <button type="button" class="convert" :disabled="runningBatch || totalJobs === 0 || pendingJobs === 0" @click="startBatch">
          {{ runningBatch ? t('button.converting') : t('button.startBatch') }}
        </button>
      </div>

      <section class="summary">
        <div class="summary-row">
          <span>{{ t('summary.total') }}: {{ totalJobs }}</span>
          <span>{{ t('summary.done') }}: {{ doneJobs }}</span>
          <span>{{ t('summary.failed') }}: {{ failedJobs }}</span>
          <span>{{ t('summary.pending') }}: {{ pendingJobs }}</span>
        </div>
        <div class="progress-shell">
          <div class="progress-fill overall" :style="{ width: `${overallProgress}%` }" />
        </div>
        <p class="progress-label">{{ t('summary.overall') }}: {{ formatPercent(overallProgress) }}</p>
      </section>

      <section class="queue">
        <header class="queue-header">
          <span>{{ t('queue.title') }}</span>
          <span class="hint">{{ t('queue.hint') }}</span>
        </header>
        <div v-if="jobs.length === 0" class="empty">{{ t('queue.empty') }}</div>
        <ul v-else class="job-list">
          <li v-for="job in jobs" :key="job.id" class="job-item">
            <div class="job-head">
              <div>
                <strong>{{ basename(job.inputPath) }}</strong>
                <p class="job-path">{{ job.inputPath }}</p>
              </div>
              <div class="job-meta">
                <span class="badge" :class="job.status">{{ jobStatusText(job.status) }}</span>
                <button type="button" class="remove" :disabled="runningBatch" @click="removeJob(job.id)">{{ t('job.remove') }}</button>
              </div>
            </div>
            <p class="job-path">{{ t('queue.output') }}: {{ job.outputPath }}</p>
            <div class="progress-shell">
              <div class="progress-fill" :class="job.status" :style="{ width: `${job.progress}%` }" />
            </div>
            <p class="progress-label">{{ formatPercent(job.progress) }} <span v-if="job.message">- {{ job.message }}</span></p>
          </li>
        </ul>
      </section>

      <p class="status">{{ statusText }}</p>
    </section>

    <section v-if="showFfmpegGuide" class="guide-mask">
      <div class="guide-card">
        <h2>{{ t('guide.title') }}</h2>
        <p>{{ t('guide.desc') }}</p>
        <p>{{ t('guide.step1') }}</p>
        <p>{{ t('guide.step2') }}</p>
        <p>{{ t('guide.step3') }}</p>
        <div class="guide-actions">
          <button type="button" @click="openExternal('https://www.gyan.dev/ffmpeg/builds/')">{{ t('guide.win') }}</button>
          <button type="button" @click="openExternal('https://formulae.brew.sh/formula/ffmpeg')">{{ t('guide.mac') }}</button>
          <button type="button" class="ghost" @click="pickFfmpeg">{{ t('guide.pick') }}</button>
          <button type="button" class="ghost" @click="showFfmpegGuide = false">{{ t('guide.close') }}</button>
        </div>
      </div>
    </section>

    <button type="button" class="guide-floating" @click="showFfmpegGuide = true">{{ t('guide.show') }}</button>
  </main>
</template>
