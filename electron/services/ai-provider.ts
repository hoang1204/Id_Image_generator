import type { GenerationSettings } from '../../src/types/electron-api.js'

export interface ImageGenerationInput {
  imageDataUrl: string
  prompt: string
  settings: GenerationSettings & { apiKey: string }
}

export interface AIProvider {
  generateImage(input: ImageGenerationInput): Promise<string>
  testConnection(settings: GenerationSettings & { apiKey: string }): Promise<void>
}

interface ProviderInit {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
}

const RESERVED_FORM_FIELDS = new Set(['image', 'prompt', 'model', 'size'])
// Gemini image chat requests own these transport fields; `size` is intentionally omitted.
const RESERVED_CHAT_FIELDS = new Set(['model', 'messages', 'modalities', 'stream', 'size'])

// The endpoint setting is an OpenAI-compatible base URL (e.g. https://api.openai.com/v1).
// Bare origins default to /v1; custom gateway paths (e.g. https://gateway.io/openai) are
// preserved; an already-appended Images Edits or Chat Completions suffix is tolerated.
function normalizeBaseUrl(input: string): string {
  let url = input.trim()
  if (!url) return ''
  url = url.replace(/\/+$/, '').replace(/\/(?:images\/edits|chat\/completions)$/i, '')
  try {
    const parsed = new URL(url)
    if (!parsed.pathname.replace(/\/+$/, '')) {
      return `${parsed.origin}/v1`
    }
  } catch { /* invalid URL: let the fetch fail with a clear error */ }
  return url
}

function imagesEditsUrl(base: string): string {
  return `${normalizeBaseUrl(base)}/images/edits`
}

function chatCompletionsUrl(base: string): string {
  return `${normalizeBaseUrl(base)}/chat/completions`
}

function modelsUrl(base: string, model: string): string {
  return `${normalizeBaseUrl(base)}/models/${encodeURIComponent(model)}`
}

/** 9router Antigravity Gemini image models use Chat Completions, not Images Edits. */
function usesGeminiChatImages(model: string): boolean {
  const normalized = model.trim().toLowerCase()
  return normalized.startsWith('ag/gemini-') && normalized.includes('-image')
}

function dataUrlToImageFile(dataUrl: string): { blob: Blob; filename: string } {
  const comma = dataUrl.indexOf(',')
  const meta = dataUrl.slice(0, comma)
  const mime = /^data:([^;,]+)/i.exec(meta)?.[1] ?? 'application/octet-stream'
  const bytes = Buffer.from(dataUrl.slice(comma + 1), 'base64')
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : mime === 'image/png' ? 'png' : 'bin'
  return { blob: new Blob([bytes], { type: mime }), filename: `photo.${extension}` }
}

function extractImage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as Record<string, unknown>
  const data = body.data
  if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
    const first = data[0] as Record<string, unknown>
    const value = first.b64_json ?? first.url ?? first.image
    if (typeof value === 'string') return value
  }
  if (typeof body.b64_json === 'string') return body.b64_json
  if (typeof body.url === 'string') return body.url
  if (typeof body.image === 'string') return body.image
  return null
}

function normalizeImage(value: string): string {
  if (/^data:image\//i.test(value) || /^https?:\/\//i.test(value)) return value
  return `data:image/png;base64,${value}`
}

function isBase64Image(value: string): boolean {
  // A short word can also look like base64. Image payloads are substantially larger.
  const compact = value.replace(/\s/g, '')
  return compact.length >= 128 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)
}

function imageValue(value: unknown, allowRawBase64 = true): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed
  return allowRawBase64 && isBase64Image(trimmed) ? trimmed.replace(/\s/g, '') : null
}

function markdownImage(value: string): string | null {
  // Only image Markdown is accepted from a text response: a bare URL must remain text.
  const match = /^\s*!\[[^\]]*]\((data:image\/[^,]+,[^)]+|https?:\/\/[^\s)]+)\)\s*$/i.exec(value)
  return match ? imageValue(match[1]) : null
}

function directContentImage(value: string): string | null {
  const trimmed = value.trim()
  if (/^data:image\//i.test(trimmed)) return imageValue(trimmed)
  return isBase64Image(trimmed) ? trimmed.replace(/\s/g, '') : null
}

function imageFromObject(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const object = value as Record<string, unknown>
  for (const candidate of [object.b64_json, object.url, object.image, object.image_url]) {
    if (typeof candidate === 'object' && candidate) {
      const nested = imageFromObject(candidate)
      if (nested) return nested
    }
    const image = imageValue(candidate)
    if (image) return image
  }
  return null
}

function extractChatImage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const choices = (payload as Record<string, unknown>).choices
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null
  const message = (choices[0] as Record<string, unknown>).message
  if (!message || typeof message !== 'object') return null
  const body = message as Record<string, unknown>

  if (Array.isArray(body.images)) {
    for (const item of body.images) {
      const image = imageValue(item) ?? imageFromObject(item)
      if (image) return image
    }
  }

  const content = body.content
  if (typeof content === 'string') return markdownImage(content) ?? directContentImage(content)
  if (!Array.isArray(content)) return null
  for (const part of content) {
    if (!part || typeof part !== 'object') continue
    const item = part as Record<string, unknown>
    // Only inspect explicitly image-shaped parts, so normal text is never treated as an image.
    if (typeof item.type === 'string' && /image/i.test(item.type)) {
      const image = imageFromObject(item) ?? imageValue(item.data)
      if (image) return image
    }
    if (typeof item.text === 'string') {
      const image = markdownImage(item.text)
      if (image) return image
    }
  }
  return null
}

function errorMessageFrom(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const error = (payload as Record<string, unknown>).error
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string' && message) return message
  }
  return null
}

async function request<T>(url: string, apiKey: string, timeoutMs: number, init: ProviderInit, read: (response: Response) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      let message = detail.slice(0, 240)
      try {
        message = errorMessageFrom(JSON.parse(detail)) ?? detail.slice(0, 240)
      } catch { /* keep raw detail */ }
      throw new Error(`Yêu cầu API thất bại (${response.status}): ${message}`)
    }
    return await read(response)
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error('Yêu cầu API đã hết thời gian. Hãy tăng thời gian chờ trong Cài đặt và thử lại.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function parseAdditionalOptions(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Tùy chọn tạo ảnh phải là JSON hợp lệ.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tùy chọn tạo ảnh phải là một đối tượng JSON, ví dụ {"quality":"high"}.')
  }
  return parsed as Record<string, unknown>
}

function chatAdditionalOptions(raw: string): Record<string, string | number | boolean> {
  const options: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(parseAdditionalOptions(raw))) {
    if (RESERVED_CHAT_FIELDS.has(key)) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') options[key] = value
  }
  return options
}

export class GenericRestProvider implements AIProvider {
  async generateImage({ imageDataUrl, prompt, settings }: ImageGenerationInput): Promise<string> {
    if (usesGeminiChatImages(settings.model)) {
      const payload = await request(
        chatCompletionsUrl(settings.endpoint),
        settings.apiKey,
        settings.timeoutMs,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...chatAdditionalOptions(settings.additionalOptions),
            model: settings.model,
            stream: false,
            modalities: ['text', 'image'],
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageDataUrl } },
              ],
            }],
          }),
        },
        (response) => response.json(),
      )
      const apiError = errorMessageFrom(payload)
      if (apiError) throw new Error(apiError)
      const image = extractChatImage(payload) ?? extractImage(payload)
      if (!image) throw new Error('Router không trả về dữ liệu ảnh. Hãy kiểm tra model và cấu hình route Gemini image của 9router.')
      return normalizeImage(image)
    }

    const { blob, filename } = dataUrlToImageFile(imageDataUrl)
    const form = new FormData()
    form.append('image', blob, filename)
    form.append('prompt', prompt)
    form.append('model', settings.model)
    form.append('size', settings.apiImageSize)
    for (const [key, value] of Object.entries(parseAdditionalOptions(settings.additionalOptions))) {
      if (RESERVED_FORM_FIELDS.has(key)) continue
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        form.append(key, String(value))
      }
    }
    const payload = await request(
      imagesEditsUrl(settings.endpoint),
      settings.apiKey,
      settings.timeoutMs,
      { method: 'POST', body: form },
      (response) => response.json(),
    )
    const apiError = errorMessageFrom(payload)
    if (apiError) throw new Error(apiError)
    const image = extractImage(payload)
    if (!image) throw new Error('Phản hồi API không chứa ảnh. Dự kiến data[0].b64_json hoặc data[0].url.')
    return normalizeImage(image)
  }

  async testConnection(settings: GenerationSettings & { apiKey: string }): Promise<void> {
    await request(
      modelsUrl(settings.endpoint, settings.model),
      settings.apiKey,
      Math.min(settings.timeoutMs, 15000),
      { method: 'GET' },
      (response) => response.text(),
    )
  }
}
