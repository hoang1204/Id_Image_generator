import { ipcMain, dialog, BrowserWindow, nativeImage } from 'electron'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { GenericRestProvider } from '../services/ai-provider.js'
import { getSecretSettings, getSettings, saveSettings } from '../services/settings-store.js'
import type { GenerationRequest, SettingsInput } from '../../src/types/electron-api.js'

const provider = new GenericRestProvider()
const imageExtensions = ['jpg', 'jpeg', 'png', 'webp']

function imageMimeFromBytes(bytes: Buffer): string | null {
  // Do not trust a filename extension when a file is selected from the native dialog.
  // The renderer-side dropzone performs the same check for drag-and-drop files.
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

function validateDataUrl(value: string): void {
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) throw new Error('Vui lòng chọn ảnh PNG, JPG hoặc WebP hợp lệ.')
  const data = value.slice(value.indexOf(',') + 1)
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  const decodedBytes = Math.floor((data.length - padding) * 3 / 4)
  if (decodedBytes > 15 * 1024 * 1024) throw new Error('Ảnh đã chọn quá lớn. Vui lòng dùng ảnh nhỏ hơn 15 MB.')
}

function ensureConfigured(settings: Awaited<ReturnType<typeof getSecretSettings>>): void {
  if (!settings.endpoint || !/^https?:\/\//.test(settings.endpoint)) throw new Error('Hãy thêm địa chỉ API hợp lệ trong Cài đặt trước.')
  if (!settings.model) throw new Error('Hãy thêm mô hình AI trong Cài đặt trước.')
  if (!settings.apiKey) throw new Error('Hãy thêm khóa API trong Cài đặt trước.')
  if (settings.additionalOptions) {
    try { JSON.parse(settings.additionalOptions) } catch { throw new Error('Tùy chọn tạo ảnh phải là JSON hợp lệ.') }
  }
}

function extensionFromDataUrl(image: string): string {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,/i.exec(image)
  return match?.[1] === 'jpeg' ? 'jpg' : match?.[1] ?? 'png'
}

const MAX_REMOTE_BYTES = 100 * 1024 * 1024

async function readRemoteImageWithCap(response: Response): Promise<Buffer> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Không thể tải ảnh đã tạo từ địa chỉ URL của nó.')
  const chunks: Buffer[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_REMOTE_BYTES) {
      await reader.cancel().catch(() => undefined)
      throw new Error('Ảnh đã tạo quá lớn để tải xuống.')
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:save', (_event, input: SettingsInput) => saveSettings(input))
  ipcMain.handle('settings:test', async (_event, input: SettingsInput) => {
    const settings = await getSecretSettings(input)
    ensureConfigured(settings)
    await provider.testConnection(settings)
    return { ok: true, message: 'Kết nối thành công.' }
  })

  ipcMain.handle('image:select', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      title: 'Chọn ảnh chân dung',
      properties: ['openFile'],
      filters: [{ name: 'Hình ảnh', extensions: imageExtensions }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    const fileStat = await stat(filePath)
    if (fileStat.size > 15 * 1024 * 1024) throw new Error('Ảnh đã chọn quá lớn. Vui lòng dùng ảnh nhỏ hơn 15 MB.')
    const bytes = await readFile(filePath)
    const mime = imageMimeFromBytes(bytes)
    if (!mime) throw new Error('Tệp đã chọn không phải ảnh PNG, JPG hoặc WebP hợp lệ.')
    if (nativeImage.createFromBuffer(bytes).isEmpty()) throw new Error('Tệp ảnh đã chọn bị hỏng hoặc chưa đầy đủ.')
    return `data:image/${mime};base64,${bytes.toString('base64')}`
  })

  ipcMain.handle('image:generate', async (_event, request: GenerationRequest) => {
    validateDataUrl(request.imageDataUrl)
    if (!request.prompt.trim()) throw new Error('Hãy thêm lời nhắc trước khi tạo ảnh.')
    if (!(['2x2', '35x45', '4x6'] as const).includes(request.imageSize)) throw new Error('Đã chọn kích thước ảnh không được hỗ trợ.')
    const settings = await getSecretSettings()
    ensureConfigured(settings)
    const image = await provider.generateImage({ imageDataUrl: request.imageDataUrl, prompt: request.prompt.trim(), settings })
    return { image }
  })

  ipcMain.handle('image:save', async (event, image: string) => {
    if (!image) throw new Error('Không có ảnh nào để tải xuống.')
    const isDataUrl = /^data:/i.test(image)
    if (isDataUrl && !/^data:image\/(png|jpe?g|webp);base64,/i.test(image)) throw new Error('Ảnh đã tạo không phải là PNG, JPG hoặc WebP hợp lệ.')
    if (!isDataUrl && !/^https:\/\//i.test(image)) throw new Error('Ảnh đã tạo phải là đường dẫn https://.')
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(window!, {
      title: 'Lưu ảnh thẻ của bạn',
      defaultPath: `anh-the.${extensionFromDataUrl(image)}`,
      filters: [{ name: 'Hình ảnh', extensions: ['png', 'jpg', 'webp'] }],
    })
    if (result.canceled || !result.filePath) return { ok: false, message: 'Đã hủy tải xuống.' }
    if (isDataUrl) {
      await writeFile(result.filePath, Buffer.from(image.slice(image.indexOf(',') + 1), 'base64'))
      return { ok: true, message: 'Đã lưu ảnh thành công.' }
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    try {
      const response = await fetch(image, { signal: controller.signal })
      if (!response.ok) throw new Error('Không thể tải ảnh đã tạo từ địa chỉ URL của nó.')
      const contentType = response.headers.get('content-type') ?? ''
      if (!/^image\//i.test(contentType)) throw new Error('Địa chỉ URL của ảnh đã tạo không trả về ảnh.')
      await writeFile(result.filePath, await readRemoteImageWithCap(response))
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new Error('Đã hết thời gian tải ảnh đã tạo. Vui lòng thử lại.')
      throw error
    } finally {
      clearTimeout(timer)
    }
    return { ok: true, message: 'Đã lưu ảnh thành công.' }
  })
}
