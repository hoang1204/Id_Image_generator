import { Sparkles } from 'lucide-react'
import { restorationOptionLabel, type RestorationChoices } from '../features/restoration/presets'

interface Props { choices: RestorationChoices }

export function RestoreSummary({ choices }: Props) {
  return <section className="prompt-card">
    <div className="card-heading"><div><span className="eyebrow"><Sparkles size={14} /> AI</span><h2>Thiết lập phục chế</h2></div></div>
    <p className="prompt-summary-text">AI sẽ dùng lời nhắc an toàn được chuẩn bị từ các tùy chọn này. Không có ô nhập lời nhắc thủ công để tránh làm thay đổi danh tính hoặc chi tiết thật của ảnh.</p>
    <div className="prompt-summary-line">Mức phục chế: <strong>{restorationOptionLabel('level', choices.level)}</strong><span>· Làm nét: {restorationOptionLabel('sharpness', choices.sharpness)}</span></div>
    <div className="prompt-summary-line">Khử nhiễu: <strong>{restorationOptionLabel('denoise', choices.denoise)}</strong><span>· Màu: {restorationOptionLabel('color', choices.color)}</span></div>
  </section>
}
