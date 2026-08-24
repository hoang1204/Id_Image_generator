import { Sparkles } from 'lucide-react'
import type { EditorChoices } from '../features/editor/presets'
import { optionLabel } from '../features/editor/presets'
import { photoSizeLabels } from '../features/editor/print-presets'

interface Props { choices: EditorChoices }

export function PromptSummary({ choices }: Props) {
  const preset = optionLabel('preset', choices.preset) || 'Ảnh thẻ'
  const size = photoSizeLabels[choices.size] ?? ''
  return <section className="prompt-card">
    <div className="card-heading"><div><span className="eyebrow"><Sparkles size={14} /> AI</span><h2>Thiết lập AI</h2></div></div>
    <p className="prompt-summary-text">Ảnh của bạn sẽ được tạo bằng một lời nhắc AI được chuẩn bị sẵn dựa trên các lựa chọn ở bên trái — không cần nhập lời nhắc thủ công.</p>
    <div className="prompt-summary-line">Kiểu ảnh: <strong>{preset}</strong><span>· Kích thước: {size}</span></div>
  </section>
}
