import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AudioTempoApi, ConvertPayload, ConvertProgressEvent } from '../shared/types'

const audioTempoApi: AudioTempoApi = {
  pickInputFiles: async () => ipcRenderer.invoke('dialog:pick-inputs'),
  pickOutputFile: async (defaultPath?: string) => ipcRenderer.invoke('dialog:pick-output', defaultPath),
  pickFfmpegFile: async () => ipcRenderer.invoke('dialog:pick-ffmpeg'),
  detectFfmpegPath: async () => ipcRenderer.invoke('ffmpeg:detect'),
  suggestOutputPath: async (inputPath: string, speed: number) => ipcRenderer.invoke('audio:suggest-output', inputPath, speed),
  convertAudio: async (payload: ConvertPayload) => ipcRenderer.invoke('audio:convert', payload),
  onConvertProgress: (listener: (event: ConvertProgressEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ConvertProgressEvent): void => {
      listener(payload)
    }
    ipcRenderer.on('audio:progress', handler)
    return () => {
      ipcRenderer.removeListener('audio:progress', handler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('audioTempo', audioTempoApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.audioTempo = audioTempoApi
}
