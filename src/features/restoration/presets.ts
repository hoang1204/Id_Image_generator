export const restorationOptions = {
  level: [
    ['light', 'Nhẹ'], ['balanced', 'Cân bằng'], ['deep', 'Chuyên sâu'],
  ],
  sharpness: [
    ['natural', 'Tự nhiên'], ['clear', 'Rõ nét'], ['none', 'Không'],
  ],
  denoise: [
    ['auto', 'Tự động'], ['light', 'Nhẹ'], ['strong', 'Mạnh'],
  ],
  color: [
    ['preserve', 'Giữ nguyên'], ['natural', 'Màu tự nhiên'], ['blackWhite', 'Đen trắng'],
  ],
} as const

export interface RestorationChoices {
  level: string
  sharpness: string
  denoise: string
  color: string
}

export const defaultRestorationChoices: RestorationChoices = {
  level: 'balanced',
  sharpness: 'natural',
  denoise: 'auto',
  color: 'preserve',
}

export function restorationOptionLabel(group: keyof typeof restorationOptions, value: string): string {
  return restorationOptions[group].find(([key]) => key === value)?.[1] ?? ''
}
