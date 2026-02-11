import { ElectronAPI } from '@electron-toolkit/preload'
import type { AudioTempoApi } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    audioTempo: AudioTempoApi
  }
}
