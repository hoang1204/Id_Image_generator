import { outdoorOptions, type OutdoorChoices } from '../features/outdoor/presets'

interface Props { choices: OutdoorChoices; onChange: (changes: Partial<OutdoorChoices>) => void; disabled?: boolean }

export function OutdoorOptionControls({ choices, onChange, disabled = false }: Props) {
  return <section className="options-panel"><div className="section-title"><span>2. Chọn phong cảnh</span><small>Nền phía sau chân dung</small></div>
    <label className="field"><span>Phong cảnh</span><select disabled={disabled} value={choices.background} onChange={(event) => onChange({ background: event.target.value })}>{outdoorOptions.background.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field"><span>Ánh sáng / thời điểm</span><select disabled={disabled} value={choices.lighting} onChange={(event) => onChange({ lighting: event.target.value })}>{outdoorOptions.lighting.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field"><span>Khung hình chân dung</span><select disabled={disabled} value={choices.framing} onChange={(event) => onChange({ framing: event.target.value })}>{outdoorOptions.framing.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field"><span>Mô tả nền riêng <em>(tùy chọn)</em></span><input disabled={disabled} maxLength={500} value={choices.customBackground} placeholder="Ví dụ: lối đi lát đá, nhiều cây và nắng nhẹ" onChange={(event) => onChange({ customBackground: event.target.value })} /></label>
  </section>
}
