import { contextBridge, ipcRenderer } from 'electron'
import type { PhotoIdApi } from '../../src/types/electron-api.js'

const api: PhotoIdApi = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings),
    test: (settings) => ipcRenderer.invoke('settings:test', settings),
  },
  image: {
    select: () => ipcRenderer.invoke('image:select'),
    generate: (request) => ipcRenderer.invoke('image:generate', request),
    save: (image) => ipcRenderer.invoke('image:save', image),
  },
}

contextBridge.exposeInMainWorld('photoId', api)
