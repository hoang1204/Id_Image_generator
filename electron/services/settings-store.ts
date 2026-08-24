import { app, safeStorage } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ApiImageSize, GenerationSettings, ImageSize, RequestMode, SettingsInput, SettingsView } from '../../src/types/electron-api.js'

interface StoredSettings extends GenerationSettings {
  encryptedApiKey?: string
}

const defaults: GenerationSettings = {
  endpoint: '',
  model: 'gpt-image-1',
  imageSize: '35x45',
  apiImageSize: '1024x1536',
  timeoutMs: 60000,
  additionalOptions: '',
  requestMode: 'auto',
}

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json')

const imageSizes: readonly ImageSize[] = ['2x2', '35x45', '4x6']
const apiImageSizes: readonly ApiImageSize[] = ['auto', '1024x1024', '1024x1536', '1536x1024']
const requestModes: readonly RequestMode[] = ['auto', 'images-edits', 'chat-completions']

async function readStored(): Promise<StoredSettings> {
  try {
    const file = await readFile(settingsPath(), 'utf8')
    const parsed = JSON.parse(file) as Partial<StoredSettings>
    return {
      ...defaults,
      ...parsed,
      imageSize: imageSizes.includes(parsed.imageSize as ImageSize) ? parsed.imageSize as ImageSize : defaults.imageSize,
      apiImageSize: apiImageSizes.includes(parsed.apiImageSize as ApiImageSize) ? parsed.apiImageSize as ApiImageSize : defaults.apiImageSize,
      requestMode: requestModes.includes(parsed.requestMode as RequestMode) ? parsed.requestMode as RequestMode : defaults.requestMode,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...defaults }
    throw new Error('Không thể đọc cài đặt đã lưu.')
  }
}

function decryptApiKey(value?: string): string {
  if (!value) return ''
  if (!safeStorage.isEncryptionAvailable()) return ''
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return ''
  }
}

// Values written by the old store when safeStorage was unavailable are the raw
// API key (printable ASCII, no base64-only characters). Encrypted blobs are
// base64 output and almost always contain '=' padding or '+'/'/'.
function isLegacyPlaintextKey(value: string): boolean {
  return value.length <= 256 && /^[\x21-\x7e]+$/.test(value) && !/[/+=\s]/.test(value)
}

function encryptApiKey(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Hệ thống của bạn không thể lưu khóa API một cách an toàn (mã hóa safeStorage không khả dụng).')
  return safeStorage.encryptString(value).toString('base64')
}

function resolveApiKey(input: SettingsInput, previous: StoredSettings): string {
  return input.apiKey === undefined || !input.apiKey.trim() ? decryptApiKey(previous.encryptedApiKey) : input.apiKey.trim()
}

function sanitize(input: GenerationSettings): GenerationSettings {
  return {
    endpoint: input.endpoint.trim(),
    model: input.model.trim(),
    imageSize: imageSizes.includes(input.imageSize) ? input.imageSize : defaults.imageSize,
    apiImageSize: apiImageSizes.includes(input.apiImageSize) ? input.apiImageSize : defaults.apiImageSize,
    timeoutMs: Math.min(Math.max(Math.round(input.timeoutMs), 5000), 300000),
    additionalOptions: input.additionalOptions.trim(),
    requestMode: requestModes.includes(input.requestMode as RequestMode) ? input.requestMode as RequestMode : defaults.requestMode,
  }
}

export async function getSettings(): Promise<SettingsView> {
  const stored = await readStored()
  const safeSettings: GenerationSettings = {
    endpoint: stored.endpoint,
    model: stored.model,
    imageSize: stored.imageSize,
    apiImageSize: stored.apiImageSize,
    timeoutMs: stored.timeoutMs,
    additionalOptions: stored.additionalOptions,
  }
  return { ...safeSettings, hasApiKey: Boolean(decryptApiKey(stored.encryptedApiKey)) }
}

export async function getSecretSettings(input?: SettingsInput): Promise<GenerationSettings & { apiKey: string }> {
  const previous = await readStored()
  if (!input) {
    const { encryptedApiKey, ...settings } = previous
    return { ...settings, apiKey: decryptApiKey(encryptedApiKey) }
  }
  return { ...sanitize(input), apiKey: resolveApiKey(input, previous) }
}

export async function saveSettings(input: SettingsInput): Promise<SettingsView> {
  const previous = await readStored()
  const sanitized = sanitize(input)
  const newKey = input.apiKey?.trim() || ''
  if (newKey && !safeStorage.isEncryptionAvailable()) {
    throw new Error('Hệ thống của bạn không thể lưu khóa API một cách an toàn (mã hóa safeStorage không khả dụng).')
  }
  const storedKey = previous.encryptedApiKey ?? ''
  // Without secure storage, never keep a legacy plaintext key on disk: scrub it
  // and ask the user to re-enter once secure storage is available.
  const scrubLegacyKey = !newKey && !safeStorage.isEncryptionAvailable() && isLegacyPlaintextKey(storedKey)
  const stored: StoredSettings = {
    ...sanitized,
    encryptedApiKey: newKey ? encryptApiKey(newKey) : scrubLegacyKey ? undefined : previous.encryptedApiKey,
  }
  await mkdir(path.dirname(settingsPath()), { recursive: true })
  await writeFile(settingsPath(), JSON.stringify(stored, null, 2), { mode: 0o600 })
  if (scrubLegacyKey) {
    throw new Error('Khóa API đã lưu đã bị xóa vì không thể giữ an toàn. Hãy nhập lại khóa API khi bộ nhớ an toàn khả dụng.')
  }
  return getSettings()
}
