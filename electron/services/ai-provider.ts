import type { GenerationSettings, RequestMode } from '../../src/types/electron-api.js'

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

// Prepended to the user text in the Gemini image chat so the model is required to
// process the attached reference image and return one rendered image, not prose.
const IMAGE_OUTPUT_CONTRACT =
  'BẮT BUỘC: xử lý ảnh người dùng đính kèm bên dưới như ảnh tham chiếu duy nhất, chỉnh sửa/tạo lại đúng người trong ảnh đó, và trả về ĐÚNG MỘT ảnh kết quả. Không trả lời bằng văn bản hoặc giải thích.'

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

// The list-models collection endpoint is used for connection tests: some
// OpenAI-compatible routers 404 on /models/{model} even when the collection
// works, and any valid key can list models.
function modelsUrl(base: string): string {
  return `${normalizeBaseUrl(base)}/models`
}

/** Route decision: the endpoint's Gemini image models (e.g. ag/gemini-*) must use Chat
 * Completions, but model names alone are unreliable, so the user can force the mode.
 * 'auto' keeps the legacy name-based heuristic; an explicit mode always wins. */
function usesGeminiChatImages(model: string, requestMode: RequestMode | undefined): boolean {
  if (requestMode === 'images-edits') return false
  if (requestMode === 'chat-completions') return true
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
  if (Array.isArray(body.data)) {
    const image = firstImageInCollection(body.data)
    if (image) return image
  }
  for (const field of ['generated_images', 'output']) {
    const image = imageFromExplicitField(body[field])
    if (image) return image
  }
  if (typeof body.b64_json === 'string') return body.b64_json
  if (typeof body.url === 'string') return body.url
  if (typeof body.image === 'string') return body.image
  return null
}

function normalizeImage(value: string): string {
  if (/^data:image\//i.test(value)) return value
  if (/^https:\/\//i.test(value)) return value
  // The renderer CSP (img-src data: https:) and the image:save handler only accept
  // HTTPS URLs, so an http:// response URL can never render or be downloaded here.
  if (/^http:\/\//i.test(value)) {
    throw new Error('Phản hồi API trả về địa chỉ ảnh không an toàn. Chỉ chấp nhận địa chỉ https://.')
  }
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
  // A plain content string is not an explicit image container: only a data:image
  // URL is accepted (markdown image URLs are handled separately). Raw base64 from
  // a text response is never treated as an image.
  const trimmed = value.trim()
  if (/^data:image\//i.test(trimmed)) return imageValue(trimmed)
  return null
}

// Recursion is bounded (max 3 nesting levels) so a malformed, deeply nested
// response cannot overflow the stack while searching for an image field.
function imageFromObject(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== 'object' || depth > 3) return null
  const object = value as Record<string, unknown>
  for (const candidate of [object.b64_json, object.url, object.image, object.image_url]) {
    if (typeof candidate === 'object' && candidate) {
      const nested = imageFromObject(candidate, depth + 1)
      if (nested) return nested
    }
    const image = imageValue(candidate)
    if (image) return image
  }
  return null
}

// Gemini inlineData / inline_data: { mimeType|mime_type, data }. Only the MIME types
// the app can preview and save (PNG, JPEG, WebP) are trusted, and the base64 payload
// must validate before reuse.
function inlineDataImage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const object = value as Record<string, unknown>
  const mime = typeof object.mimeType === 'string' ? object.mimeType : typeof object.mime_type === 'string' ? object.mime_type : ''
  if (!/^image\/(png|jpe?g|webp)$/i.test(mime)) return null
  const data = typeof object.data === 'string' ? object.data.replace(/\s/g, '') : ''
  if (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null
  return `data:${mime};base64,${data}`
}

// One image-bearing container: the object is itself inlineData, wraps
// inlineData/inline_data, or carries the OpenAI fields b64_json/url/image/image_url.
function imageFromContainer(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const object = value as Record<string, unknown>
  return inlineDataImage(object) ?? inlineDataImage(object.inlineData ?? object.inline_data) ?? imageFromObject(object)
}

// Scan an explicit image collection (data[], generated_images[], output[]).
function firstImageInCollection(collection: unknown): string | null {
  if (!Array.isArray(collection)) return null
  for (const item of collection) {
    if (typeof item === 'string') {
      const image = imageValue(item)
      if (image) return image
    } else if (item && typeof item === 'object') {
      const image = imageFromContainer(item)
      if (image) return image
    }
  }
  return null
}

function imageFromExplicitField(value: unknown): string | null {
  return Array.isArray(value) ? firstImageInCollection(value) : imageFromContainer(value)
}

function chatMessageImage(message: Record<string, unknown>): string | null {
  if (Array.isArray(message.images)) {
    for (const item of message.images) {
      const image = imageValue(item) ?? imageFromContainer(item)
      if (image) return image
    }
  }
  const content = message.content
  if (typeof content === 'string') return markdownImage(content) ?? directContentImage(content)
  if (!Array.isArray(content)) return null
  for (const part of content) {
    if (!part || typeof part !== 'object') continue
    const item = part as Record<string, unknown>
    // Only inspect explicitly image-shaped parts, so normal text is never treated as an image.
    const inline = inlineDataImage(item.inlineData ?? item.inline_data)
    if (inline) return inline
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

function extractChatImage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as Record<string, unknown>

  // OpenAI-compatible: choices[0].message.{images, content}
  if (Array.isArray(body.choices) && body.choices[0] && typeof body.choices[0] === 'object') {
    const choice = body.choices[0] as Record<string, unknown>
    const message = choice.message
    if (message && typeof message === 'object') {
      const image = chatMessageImage(message as Record<string, unknown>)
      if (image) return image
    }
  }

  // Gemini-native: candidates[0].content.parts[].inlineData / inline_data / image fields
  if (Array.isArray(body.candidates) && body.candidates[0] && typeof body.candidates[0] === 'object') {
    const candidate = body.candidates[0] as Record<string, unknown>
    const content = candidate.content
    if (content && typeof content === 'object') {
      const parts = (content as Record<string, unknown>).parts
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (!part || typeof part !== 'object') continue
          const item = part as Record<string, unknown>
          const container = imageFromContainer(item)
          if (container) return container
          if (typeof item.text === 'string') {
            const image = markdownImage(item.text)
            if (image) return image
          }
        }
      }
    }
  }

  return null
}

// Safe debug hint for a "no image found" error: lists only top-level response key
// names (never the body, prompt, or API key), so the user can see the actual shape.
function responseShapeHint(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''
  const keys = Object.keys(payload as Record<string, unknown>)
    .filter((key) => !/^(body|prompt|api.?key|key)$/i.test(key))
    .slice(0, 8)
  return keys.length ? ` Các trường phản hồi: ${keys.join(', ')}.` : ''
}

// Safely pull the assistant's text reply from a text-only router response, so the
// user sees why no image arrived. Reads only the response payload (never the request
// prompt, body, or API key); the caller truncates before display.
function contentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part && typeof part === 'object') {
        const text = (part as Record<string, unknown>).text
        if (typeof text === 'string' && text) return text
      }
    }
  }
  return ''
}

function assistantTextDiagnostic(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const body = payload as Record<string, unknown>
  if (Array.isArray(body.choices) && body.choices[0] && typeof body.choices[0] === 'object') {
    const message = (body.choices[0] as Record<string, unknown>).message
    if (message && typeof message === 'object') {
      const text = contentText((message as Record<string, unknown>).content)
      if (text) return text
    }
  }
  if (Array.isArray(body.candidates) && body.candidates[0] && typeof body.candidates[0] === 'object') {
    const content = (body.candidates[0] as Record<string, unknown>).content
    if (content && typeof content === 'object') {
      const parts = (content as Record<string, unknown>).parts
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part && typeof part === 'object') {
            const text = (part as Record<string, unknown>).text
            if (typeof text === 'string' && text) return text
          }
        }
      }
    }
  }
  return ''
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
    if (usesGeminiChatImages(settings.model, settings.requestMode)) {
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
                // Contract first so the model must edit the attached reference image
                // and return exactly one rendered image, never a text-only reply.
                { type: 'text', text: `${IMAGE_OUTPUT_CONTRACT} ${prompt}` },
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
      if (!image) {
        const assistantText = assistantTextDiagnostic(payload).replace(/\s+/g, ' ').trim()
        const textHint = assistantText ? ` Văn bản model trả về: ${assistantText.slice(0, 240)}.` : ''
        throw new Error(`Router không trả về dữ liệu ảnh. Hãy kiểm tra model và cấu hình route Gemini image của 9router.${textHint}${responseShapeHint(payload)}`)
      }
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
    if (!image) throw new Error(`Phản hồi API không chứa ảnh. Dự kiến data[0].b64_json hoặc data[0].url.${responseShapeHint(payload)}`)
    return normalizeImage(image)
  }

  async testConnection(settings: GenerationSettings & { apiKey: string }): Promise<void> {
    await request(
      modelsUrl(settings.endpoint),
      settings.apiKey,
      Math.min(settings.timeoutMs, 15000),
      { method: 'GET' },
      (response) => response.text(),
    )
  }
}
