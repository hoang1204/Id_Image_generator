import type { ImageSize } from '../../types/electron-api'

export const editorOptions = {
  background: [
    ['white', 'Trắng sạch'], ['blue', 'Xanh cổ điển'], ['gray', 'Xám nhạt'], ['beige', 'Be ấm'], ['pink', 'Hồng nhạt'], ['green', 'Xanh lá nhạt'],
  ],
  outfit: [
    ['keep', 'Giữ nguyên'], ['business', 'Công sở trang trọng'], ['smart', 'Thanh lịch thường ngày'], ['blazer', 'Blazer xanh navy'], ['whiteShirt', 'Áo sơ mi trắng'], ['blackVest', 'Vest đen'],
  ],
  hair: [
    ['keep', 'Giữ nguyên'], ['tidy', 'Tạo kiểu gọn gàng'], ['natural', 'Kết cấu tự nhiên'], ['formal', 'Tạo kiểu trang trọng'], ['bun', 'Tóc búi gọn'], ['loose', 'Tóc xõa tự nhiên'],
  ],
  preset: [
    ['official', 'Ảnh thẻ chính thức'], ['visa', 'Ảnh visa'], ['professional', 'Ảnh chân dung chuyên nghiệp'], ['student', 'Ảnh thẻ sinh viên'], ['passport', 'Ảnh hộ chiếu'], ['cv', 'CV / Hồ sơ'], ['graduation', 'Ảnh tốt nghiệp'],
  ],
  retouch: [
    ['natural', 'Tự nhiên'], ['light', 'Làm đẹp nhẹ'], ['none', 'Không chỉnh sửa'], ['glow', 'Da sáng nhẹ'],
  ],
} as const

export interface EditorChoices {
  background: string
  outfit: string
  hair: string
  preset: string
  retouch: string
  size: ImageSize
}

export const defaultChoices: EditorChoices = {
  background: 'white', outfit: 'keep', hair: 'keep', preset: 'official', retouch: 'natural', size: '35x45',
}

export function optionLabel(group: keyof typeof editorOptions, value: string): string {
  return editorOptions[group].find(([key]) => key === value)?.[1] ?? ''
}
