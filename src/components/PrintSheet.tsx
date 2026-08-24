import { Printer } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ImageSize } from '../types/electron-api'
import { computeLayout, paperOptions, PHOTO_MARGIN_MM, photoCellSpecs, photoSizeLabels, printQuantityPresets, type PaperPreset } from '../features/editor/print-presets'

interface Props { image: string | null; size: ImageSize }

export function PrintSheet({ image, size }: Props) {
  const [paper, setPaper] = useState<PaperPreset>('a4')
  const [quantity, setQuantity] = useState(4)
  const [printBusy, setPrintBusy] = useState(false)
  const [printError, setPrintError] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)

  const paperOption = paperOptions.find((p) => p.value === paper) ?? paperOptions[0]
  const cell = photoCellSpecs[size] ?? photoCellSpecs['35x45']
  const layout = computeLayout(paper, size)
  const effectiveQuantity = Math.min(Math.max(quantity, 1), layout.capacity)

  // Clamp the stored selection whenever the paper/size capacity changes.
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(q, 1), layout.capacity))
  }, [layout.capacity])

  // Single source of truth for @page size: injected from the selected paper dimensions.
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'print-page-size'
    style.textContent = `@page { size: ${paperOption.widthMm}mm ${paperOption.heightMm}mm; margin: 0; }`
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [paperOption.widthMm, paperOption.heightMm])

  if (!image) return null

  const quantityOptions = Array.from({ length: layout.capacity }, (_, i) => i + 1)
  const unavailablePresetLabels = printQuantityPresets
    .filter((preset) => preset > layout.capacity)
    .map((preset) => `${preset} ảnh`)

  const handlePrint = async () => {
    if (printBusy) return
    const images = Array.from(gridRef.current?.querySelectorAll('img') ?? [])
    setPrintBusy(true)
    setPrintError('')
    try {
      await Promise.all(images.map((img) => img.decode()))
      window.print()
    } catch {
      setPrintError('Không thể chuẩn bị ảnh để in. Vui lòng thử lại.')
    } finally {
      setPrintBusy(false)
    }
  }

  const sheetStyle = {
    width: `${paperOption.widthMm}mm`,
    height: `${paperOption.heightMm}mm`,
    padding: `${PHOTO_MARGIN_MM}mm`,
  } as CSSProperties

  const gridStyle = {
    gridTemplateColumns: layout.gridColumnsCss,
    gap: layout.gapCss,
    '--cell-w': cell.cssWidth,
    '--cell-h': cell.cssHeight,
  } as CSSProperties

  return <section className="print-sheet-panel">
    <div className="section-title"><span>In ảnh thẻ</span><small>Chuẩn bị bản in</small></div>
    <div className="print-controls">
      <label className="field"><span>Khổ giấy</span><select value={paper} onChange={(e) => setPaper(e.target.value as PaperPreset)}>{paperOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
      <fieldset className="print-presets" aria-describedby="print-preset-help">
        <legend>Mẫu nhanh</legend>
        <div className="print-preset-buttons">
          {printQuantityPresets.map((preset) => {
            const available = preset <= layout.capacity
            return <button
              key={preset}
              type="button"
              className="print-preset-button"
              aria-pressed={available && effectiveQuantity === preset}
              disabled={!available}
              onClick={() => setQuantity(preset)}
            >{preset} ảnh</button>
          })}
        </div>
        <small id="print-preset-help" className="print-preset-help">
          {unavailablePresetLabels.length > 0
            ? `${unavailablePresetLabels.join(' và ')} không phù hợp với khổ giấy này (tối đa ${layout.capacity} ảnh).`
            : 'Chọn nhanh số ảnh cần in.'}
        </small>
      </fieldset>
      <label className="field"><span>Số lượng tùy chọn</span><select value={effectiveQuantity} onChange={(e) => setQuantity(Number(e.target.value))}>{quantityOptions.map((n) => <option key={n} value={n}>{n} ảnh</option>)}</select></label>
      <div className="field"><span>Kích thước ảnh</span><div className="print-size-readonly">{photoSizeLabels[size] ?? ''}</div></div>
      <span className="print-capacity">Tối đa {layout.capacity} ảnh</span>
      {printError && <p className="print-error">{printError}</p>}
      <button className="button button-primary" disabled={printBusy} onClick={() => void handlePrint()}><Printer size={16} /> {printBusy ? 'Đang chuẩn bị…' : 'In mẫu ảnh'}</button>
    </div>
    <div className="print-root">
      <div className="sheet" style={sheetStyle}>
        <div ref={gridRef} className="sheet-grid" style={gridStyle}>
          {Array.from({ length: effectiveQuantity }).map((_, index) => <div className="sheet-cell" key={index}><img src={image} alt="Ảnh thẻ" /></div>)}
        </div>
      </div>
    </div>
  </section>
}
