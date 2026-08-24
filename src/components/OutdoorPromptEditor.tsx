import { Sparkles } from 'lucide-react'

interface Props { prompt: string; edited: boolean; disabled?: boolean; onChange: (prompt: string) => void; onRegenerate: () => void }

export function OutdoorPromptEditor({ prompt, edited, disabled = false, onChange, onRegenerate }: Props) {
  return <section className="prompt-card"><div className="card-heading"><div><span className="eyebrow"><Sparkles size={14} /> AI</span><h2>Lời nhắc chân dung ngoại cảnh</h2></div>{edited && <button className="button button-secondary button-small" disabled={disabled} onClick={onRegenerate}>Tạo lại prompt từ lựa chọn</button>}</div>
    <p className="prompt-summary-text">Bạn có thể tinh chỉnh lời nhắc này cho riêng ảnh ngoại cảnh. Các thay đổi lựa chọn sẽ không ghi đè nội dung bạn đã sửa.</p>
    <label className="sr-only" htmlFor="outdoor-prompt">Lời nhắc AI cho chân dung ngoại cảnh</label><textarea id="outdoor-prompt" disabled={disabled} value={prompt} onChange={(event) => onChange(event.target.value)} />
    <p className="helper">Lời nhắc được dùng trực tiếp khi tạo ảnh. Không để trống để tiếp tục.</p>
  </section>
}
