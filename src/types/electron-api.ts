export type ImageSize = '2x2' | '35x45' | '4x6'

export type ApiImageSize = 'auto' | '1024x1024' | '1024x1536' | '1536x1024'

export interface GenerationSettings {
  endpoint: string
  model: string
  imageSize: ImageSize
  apiImageSize: ApiImageSize
  timeoutMs: number
  additionalOptions: string
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
