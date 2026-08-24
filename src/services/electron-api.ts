import type { PhotoIdApi } from '../types/electron-api'

const desktopOnly = () => Promise.reject(new Error('Thao tác này chỉ khả dụng trong ứng dụng Electron trên máy tính.'))

const browserPreviewApi: PhotoIdApi = {
  settings: {
    get: async () => ({ endpoint: '', model: 'gpt-image-1', imageSize: '35x45', apiImageSize: '1024x1536', timeoutMs: 60000, additionalOptions: '', hasApiKey: false }),
    save: desktopOnly,
    test: desktopOnly,
  },
  image: {
    select: desktopOnly,
    generate: desktopOnly,
    save: desktopOnly,
  },
}

export const photoIdApi = window.photoId ?? browserPreviewApi
