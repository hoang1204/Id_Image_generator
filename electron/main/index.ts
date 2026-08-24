import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registerIpcHandlers } from '../ipc/index.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    title: 'Studio Ảnh Thẻ',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(currentDirectory, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  const devUrl = process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : null
  const rendererEntryUrl = pathToFileURL(path.join(currentDirectory, '../../../dist/index.html')).href
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    const isAllowed = url === rendererEntryUrl || Boolean(devUrl && (url === devUrl || url.startsWith(`${devUrl}/`)))
    if (!isAllowed) event.preventDefault()
  })
  if (devUrl) void window.loadURL(devUrl)
  else void window.loadFile(path.join(currentDirectory, '../../../dist/index.html'))
  return window
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
