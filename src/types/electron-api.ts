export type ImageSize = '2x2' | '35x45' | '4x6'

export type ApiImageSize = 'auto' | '1024x1024' | '1024x1536' | '1536x1024'

// How the provider should talk to the configured endpoint. Model names alone are
// unreliable for router models (e.g. ag/gemini-*), so the user can force the mode.
export type RequestMode = 'auto' | 'images-edits' | 'chat-completions'

export interface GenerationSettings {
  endpoint: string
  model: string
  imageSize: ImageSize
  apiImageSize: ApiImageSize
  timeoutMs: number
  additionalOptions: string
  /** Request mode; 'auto' (default) infers from the model name. */
  requestMode?: RequestMode
}

export interface SettingsView extends GenerationSettings {
  hasApiKey: boolean
}

export interface SettingsInput extends GenerationSettings {
  apiKey?: string
}

export interface GenerationRequest {
  imageDataUrl: string
  prompt: string
  imageSize: ImageSize
}

export interface GenerationResult {
  image: string
}

export interface OperationResult {
  ok: boolean
  message?: string
}

export interface PhotoIdApi {
  settings: {
    get: () => Promise<SettingsView>
    save: (settings: SettingsInput) => Promise<SettingsView>
    test: (settings: SettingsInput) => Promise<OperationResult>
  }
  image: {
    select: () => Promise<string | null>
    generate: (request: GenerationRequest) => Promise<GenerationResult>
    save: (image: string) => Promise<OperationResult>
  }
}

declare global {
  interface Window {
    photoId: PhotoIdApi
  }
}
