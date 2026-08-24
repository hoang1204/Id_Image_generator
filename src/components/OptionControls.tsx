import type { EditorChoices } from '../features/editor/presets'
import { editorOptions } from '../features/editor/presets'

interface Props { choices: EditorChoices; onChange: (changes: Partial<EditorChoices>) => void; disabled?: boolean }
const labels: Record<Exclude<keyof EditorChoices, 'size'>, string> = { background: 'Nền', outfit: 'Trang phục', hair: 'Kiểu tóc', preset: 'Kiểu ảnh', retouch: 'Chỉnh sửa da' }

export function OptionControls({ choices, onChange, disabled = false }: Props) {
  return <section className="options-panel"><div className="section-title"><span>Tạo phong cách cho ảnh</span><small>Mặc định an toàn cho ảnh thẻ</small></div>
    {(Object.keys(editorOptions) as Array<keyof typeof editorOptions>).map((key) => <label className="field" key={key}><span>{labels[key]}</span><select disabled={disabled} value={choices[key]} onChange={(event) => onChange({ [key]: event.target.value })}>{editorOptions[key].map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}
    <label className="field"><span>Kích thước ảnh</span><select disabled={disabled} value={choices.size} onChange={(event) => onChange({ size: event.target.value as EditorChoices['size'] })}><option value="35x45">35 × 45 mm</option><option value="2x2">2 × 2 in</option><option value="4x6">4 × 6 cm</option></select></label>
  </section>
}
