export interface ConvertPayload {
  jobId: string
  inputPath: string
  outputPath?: string
  speed: number
  ffmpegPath?: string
}

export interface ConvertResult {
  ok: boolean
  jobId?: string
  outputPath?: string
  error?: string
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface ConvertProgressEvent {
  jobId: string
  status: JobStatus
  percent: number
  message?: string
}

export interface AudioTempoApi {
  pickInputFiles(): Promise<string[]>
  pickOutputFile(defaultPath?: string): Promise<string | null>
  pickFfmpegFile(): Promise<string | null>
  detectFfmpegPath(): Promise<string | null>
  suggestOutputPath(inputPath: string, speed: number): Promise<string>
  convertAudio(payload: ConvertPayload): Promise<ConvertResult>
  onConvertProgress(listener: (event: ConvertProgressEvent) => void): () => void
}
