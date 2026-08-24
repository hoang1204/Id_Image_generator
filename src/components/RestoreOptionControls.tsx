import { restorationOptions, type RestorationChoices } from '../features/restoration/presets'

interface Props { choices: RestorationChoices; onChange: (changes: Partial<RestorationChoices>) => void; disabled?: boolean }

const labels: Record<keyof RestorationChoices, string> = {
  level: 'Mức phục chế', sharpness: 'Làm nét', denoise: 'Khử nhiễu', color: 'Khôi phục màu',
}

export function RestoreOptionControls({ choices, onChange, disabled = false }: Props) {
  return <section className="options-panel"><div className="section-title"><span>Tùy chọn phục chế</span><small>Ưu tiên kết quả chân thực</small></div>
    {(Object.keys(restorationOptions) as Array<keyof RestorationChoices>).map((key) => <label className="field" key={key}><span>{labels[key]}</span><select disabled={disabled} value={choices[key]} onChange={(event) => onChange({ [key]: event.target.value })}>{restorationOptions[key].map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}
  </section>
}
