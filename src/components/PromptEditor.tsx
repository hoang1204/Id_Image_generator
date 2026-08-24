import { Sparkles } from 'lucide-react'

interface Props {
  prompt: string
  edited: boolean
  disabled?: boolean
  title: string
  description: string
  onChange: (prompt: string) => void
  onRegenerate: () => void
}

export function PromptEditor({ prompt, edited, disabled = false, title, description, onChange, onRegenerate }: Props) {
  return <section className="prompt-card">
    <div className="card-heading">
      <div><span className="eyebrow"><Sparkles size={14} /> AI</span><h2>{title}</h2></div>
      {edited && <button className="button button-secondary button-small" disabled={disabled} onClick={onRegenerate}>Tạo lại từ lựa chọn</button>}
    </div>
    <p className="prompt-summary-text">{description}</p>
    <label className="sr-only" htmlFor="generation-prompt">Lời nhắc AI</label>
    <textarea id="generation-prompt" disabled={disabled} value={prompt} onChange={(event) => onChange(event.target.value)} />
    <p className="helper">Lời nhắc này sẽ được gửi trực tiếp khi tạo ảnh. Không để trống để tiếp tục.</p>
  </section>
}
