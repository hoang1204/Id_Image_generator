import type { ImageSize } from '../../types/electron-api'

export type PaperPreset = 'a4' | '4x6'

export interface PaperPresetOption {
  value: PaperPreset
  label: string
  widthMm: number
  heightMm: number
}

export const paperOptions: PaperPresetOption[] = [
  { value: 'a4', label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297 },
  // 4 × 6 inch portrait: better capacity for the default 35 × 45 mm ID size
  // (a 2×2 grid of 4 photos) than the landscape orientation.
  { value: '4x6', label: '4 × 6 inch (dọc)', widthMm: 101.6, heightMm: 152.4 },
]

export const PHOTO_MARGIN_MM = 10
export const PHOTO_GAP_MM = 5

export const printQuantityPresets = [4, 8] as const

export const photoSizeLabels: Record<ImageSize, string> = {
  '35x45': '35 × 45 mm',
  '2x2': '2 × 2 in',
  '4x6': '4 × 6 cm',
}

export interface PhotoCellSpec {
  widthMm: number
  heightMm: number
  cssWidth: string
  cssHeight: string
}

export const photoCellSpecs: Record<ImageSize, PhotoCellSpec> = {
  '35x45': { widthMm: 35, heightMm: 45, cssWidth: '35mm', cssHeight: '45mm' },
  '2x2': { widthMm: 50.8, heightMm: 50.8, cssWidth: '2in', cssHeight: '2in' },
  '4x6': { widthMm: 40, heightMm: 60, cssWidth: '4cm', cssHeight: '6cm' },
}

export interface SheetLayout {
  columns: number
  rows: number
  capacity: number
  gridColumnsCss: string
  gapCss: string
}

export function computeLayout(paper: PaperPreset, size: ImageSize): SheetLayout {
  const option = paperOptions.find((p) => p.value === paper) ?? paperOptions[0]
  const cell = photoCellSpecs[size] ?? photoCellSpecs['35x45']
  const usableWidthMm = option.widthMm - 2 * PHOTO_MARGIN_MM
  const usableHeightMm = option.heightMm - 2 * PHOTO_MARGIN_MM
  const columns = Math.max(1, Math.floor((usableWidthMm + PHOTO_GAP_MM) / (cell.widthMm + PHOTO_GAP_MM)))
  const rows = Math.max(1, Math.floor((usableHeightMm + PHOTO_GAP_MM) / (cell.heightMm + PHOTO_GAP_MM)))
  return {
    columns,
    rows,
    capacity: columns * rows,
    gridColumnsCss: `repeat(${columns}, ${cell.cssWidth})`,
    gapCss: `${PHOTO_GAP_MM}mm`,
  }
}
