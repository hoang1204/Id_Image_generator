import { AlertCircle, Camera, Download, RefreshCcw, RotateCcw, Settings, Sparkles, Trees, WandSparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ImageDropzone } from './components/ImageDropzone'
import { OptionControls } from './components/OptionControls'
import { OutdoorOptionControls } from './components/OutdoorOptionControls'
import { OutdoorPromptEditor } from './components/OutdoorPromptEditor'
import { PromptEditor } from './components/PromptEditor'
import { PrintSheet } from './components/PrintSheet'
import { RestoreOptionControls } from './components/RestoreOptionControls'
import { ResultPreview } from './components/ResultPreview'
import { SettingsDialog } from './components/SettingsDialog'
import { defaultChoices, type EditorChoices } from './features/editor/presets'
import { defaultRestorationChoices, type RestorationChoices } from './features/restoration/presets'
import { defaultOutdoorChoices, type OutdoorChoices } from './features/outdoor/presets'
import { photoIdApi } from './services/electron-api'
import type { SettingsInput, SettingsView } from './types/electron-api'
import { buildPrompt } from './utils/prompt-builder'
import { buildRestorationPrompt } from './utils/restoration-prompt-builder'
import { buildOutdoorPrompt } from './utils/outdoor-prompt-builder'

type EditorMode = 'photoId' | 'restoration' | 'outdoor'

export default function App() {
  const [mode, setMode] = useState<EditorMode>('photoId')
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [choices, setChoices] = useState<EditorChoices>(defaultChoices)
  const [photoIdPrompt, setPhotoIdPrompt] = useState(() => buildPrompt(defaultChoices))
  const [photoIdPromptEdited, setPhotoIdPromptEdited] = useState(false)
  const [restorationChoices, setRestorationChoices] = useState<RestorationChoices>(defaultRestorationChoices)
  const [restorationPrompt, setRestorationPrompt] = useState(() => buildRestorationPrompt(defaultRestorationChoices))
  const [restorationPromptEdited, setRestorationPromptEdited] = useState(false)
  const [outdoorChoices, setOutdoorChoices] = useState<OutdoorChoices>(defaultOutdoorChoices)
  const [outdoorPrompt, setOutdoorPrompt] = useState(() => buildOutdoorPrompt(defaultOutdoorChoices))
  const [outdoorPromptEdited, setOutdoorPromptEdited] = useState(false)
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const generationRunRef = useRef(0)
  const photoIdPromptEditedRef = useRef(false)
  const restoration = mode === 'restoration'
  const outdoor = mode === 'outdoor'
  const copy = restoration ? { sourceTitle: '1. Ảnh cũ hoặc ảnh mờ', sourceHint: 'Ảnh nhìn rõ nhất có thể', action: 'Phục chế ảnh', loading: 'Đang phục chế…', success: 'Ảnh đã được phục chế và sẵn sàng để tải xuống.', missing: 'Hãy tải lên ảnh cần phục chế trước.' } : outdoor ? { sourceTitle: '1. Ảnh chân dung của bạn', sourceHint: 'Khuôn mặt và dáng người rõ ràng', action: 'Tạo chân dung ngoại cảnh', loading: 'Đang tạo chân dung…', success: 'Chân dung ngoại cảnh đã sẵn sàng để tải xuống.', missing: 'Hãy tải lên một ảnh chân dung trước.' } : { sourceTitle: '1. Ảnh gốc của bạn', sourceHint: 'Khuôn mặt nhìn rõ ràng', action: 'Tạo ảnh', loading: 'Đang tạo…', success: 'Ảnh thẻ của bạn đã sẵn sàng để tải xuống.', missing: 'Hãy tải lên một ảnh chân dung trước.' }

  useEffect(() => { void photoIdApi.settings.get().then((s) => { setSettings(s); setChoices((current) => { if (current.size !== defaultChoices.size) return current; const next = { ...current, size: s.imageSize }; if (!photoIdPromptEditedRef.current) setPhotoIdPrompt(buildPrompt(next)); return next }) }).catch((err: Error) => setError(err.message)) }, [])
  const updateChoices = (changes: Partial<EditorChoices>) => setChoices((current) => {
    const next = { ...current, ...changes }
    if (!photoIdPromptEditedRef.current) setPhotoIdPrompt(buildPrompt(next))
    return next
  })
  const updateRestorationChoices = (changes: Partial<RestorationChoices>) => setRestorationChoices((current) => {
    const next = { ...current, ...changes }
    if (!restorationPromptEdited) setRestorationPrompt(buildRestorationPrompt(next))
    return next
  })
  const updateOutdoorChoices = (changes: Partial<OutdoorChoices>) => setOutdoorChoices((current) => {
    const next = { ...current, ...changes }
    if (!outdoorPromptEdited) setOutdoorPrompt(buildOutdoorPrompt(next))
    return next
  })
  const invalidateGeneration = () => { generationRunRef.current += 1; setGenerating(false) }
  const regeneratePhotoIdPrompt = () => { setPhotoIdPrompt(buildPrompt(choices)); photoIdPromptEditedRef.current = false; setPhotoIdPromptEdited(false) }
  const regenerateRestorationPrompt = () => { setRestorationPrompt(buildRestorationPrompt(restorationChoices)); setRestorationPromptEdited(false) }
  const regenerateOutdoorPrompt = () => { setOutdoorPrompt(buildOutdoorPrompt(outdoorChoices)); setOutdoorPromptEdited(false) }
  const switchMode = (next: EditorMode) => { if (next !== mode) { invalidateGeneration(); setMode(next); setResultImage(null); setError(null); setNotice(null) } }
  const chooseSystemFile = async () => { try { const image = await photoIdApi.image.select(); if (image) { invalidateGeneration(); setSourceImage(image); setResultImage(null); setError(null) } } catch (err) { setError((err as Error).message) } }
  const generate = async () => {
    if (!sourceImage) { setError(copy.missing); return }
    const runId = generationRunRef.current + 1
    generationRunRef.current = runId
    setGenerating(true); setError(null); setNotice(null)
    try {
      const prompt = restoration ? restorationPrompt.trim() : outdoor ? outdoorPrompt.trim() : photoIdPrompt.trim()
      if (!prompt) { setError('Lời nhắc AI không được để trống.'); return }
      // Restoration does not request a physical photo size. This keeps the existing
      // IPC transport valid; the provider uses settings.apiImageSize for its API call.
      const imageSize = restoration || outdoor ? (settings?.imageSize ?? defaultChoices.size) : choices.size
      const response = await photoIdApi.image.generate({ imageDataUrl: sourceImage, prompt, imageSize })
      if (generationRunRef.current === runId) { setResultImage(response.image); setNotice(copy.success) }
    } catch (err) { if (generationRunRef.current === runId) setError((err as Error).message) } finally { if (generationRunRef.current === runId) setGenerating(false) }
  }
  const download = async () => { if (!resultImage || downloading) return; setDownloading(true); setError(null); try { const response = await photoIdApi.image.save(resultImage); setNotice(response.message ?? null) } catch (err) { setError((err as Error).message) } finally { setDownloading(false) } }
  const reset = () => { invalidateGeneration(); setSourceImage(null); setResultImage(null); setError(null); setNotice(null); if (restoration) { setRestorationChoices(defaultRestorationChoices); setRestorationPrompt(buildRestorationPrompt(defaultRestorationChoices)); setRestorationPromptEdited(false) } else if (outdoor) { setOutdoorChoices(defaultOutdoorChoices); setOutdoorPrompt(buildOutdoorPrompt(defaultOutdoorChoices)); setOutdoorPromptEdited(false) } else { setChoices(defaultChoices); setPhotoIdPrompt(buildPrompt(defaultChoices)); photoIdPromptEditedRef.current = false; setPhotoIdPromptEdited(false) } }
  const saveSettings = async (value: SettingsInput) => { const saved = await photoIdApi.settings.save(value); setSettings(saved); setChoices((current) => { if (current.size === saved.imageSize) return current; const next = { ...current, size: saved.imageSize }; if (!photoIdPromptEditedRef.current) setPhotoIdPrompt(buildPrompt(next)); return next }); setNotice('Đã lưu cài đặt trên máy.') }

  return <main className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"><Camera size={19} /></div><div><strong>Studio Ảnh Thẻ</strong><span>Trình chỉnh sửa ảnh chân dung bằng AI</span></div></div><button className="button button-secondary" onClick={() => setSettingsOpen(true)}><Settings size={16} /> Cài đặt</button></header>
    <nav className="mode-switch" aria-label="Chế độ chỉnh sửa"><button aria-pressed={mode === 'photoId'} disabled={generating} className={mode === 'photoId' ? 'mode-tab mode-tab-active' : 'mode-tab'} onClick={() => switchMode('photoId')}><Camera size={16} /> Ảnh thẻ</button><button aria-pressed={restoration} disabled={generating} className={restoration ? 'mode-tab mode-tab-active' : 'mode-tab'} onClick={() => switchMode('restoration')}><WandSparkles size={16} /> Phục chế ảnh</button><button aria-pressed={outdoor} disabled={generating} className={outdoor ? 'mode-tab mode-tab-active' : 'mode-tab'} onClick={() => switchMode('outdoor')}><Trees size={16} /> Chân dung ngoại cảnh</button></nav>
    <section className="hero"><div><span className="eyebrow"><Sparkles size={14} /> {restoration ? 'Khôi phục ký ức một cách chân thực' : outdoor ? 'Đặt bạn vào một khung cảnh tự nhiên' : 'Chuyên nghiệp chỉ trong vài cú nhấp'}</span><h1>{restoration ? <>Phục chế ảnh cũ,<br />giữ nguyên nét thật.</> : outdoor ? <>Tạo chân dung ngoại cảnh,<br />vẫn là chính bạn.</> : <>Tạo ảnh thẻ chuyên nghiệp<br />không cần phòng chụp.</>}</h1><p>{restoration ? 'Tải ảnh cũ, ảnh mờ hoặc ảnh bị hư hại. AI hỗ trợ làm sạch, làm nét và khôi phục màu một cách thận trọng, không thay đổi danh tính.' : outdoor ? 'Chọn phong cảnh, ánh sáng và khung hình, rồi tùy chỉnh lời nhắc AI để tạo một chân dung tự nhiên, hài hòa.' : 'Tải lên ảnh, chọn phong cách, và để AI tạo ra kết quả tự nhiên, tinh tế mà vẫn giữ được nét riêng của bạn.'}</p></div><div className="status-pill">{settings?.hasApiKey ? 'Đã cấu hình kết nối AI' : 'Thiết lập kết nối AI'}</div></section>
    {(error || notice) && <div className={`flash ${error ? 'flash-error' : ''}`}><AlertCircle size={17} />{error ?? notice}<button onClick={() => { setError(null); setNotice(null) }}>×</button></div>}
    <div className="workspace"><section className="left-panel"><div className="section-title"><span>{copy.sourceTitle}</span><small>{copy.sourceHint}</small></div><ImageDropzone disabled={generating} image={sourceImage} mode={mode} onImage={(image) => { invalidateGeneration(); setSourceImage(image); setResultImage(null); setError(null) }} onPick={() => void chooseSystemFile()} onError={setError} />{restoration ? <RestoreOptionControls choices={restorationChoices} onChange={updateRestorationChoices} disabled={generating} /> : outdoor ? <OutdoorOptionControls choices={outdoorChoices} onChange={updateOutdoorChoices} disabled={generating} /> : <OptionControls choices={choices} onChange={updateChoices} disabled={generating} />}</section><section className="middle-panel">{restoration ? <PromptEditor prompt={restorationPrompt} edited={restorationPromptEdited} disabled={generating} title="Lời nhắc phục chế ảnh" description="Tinh chỉnh lời nhắc phục chế khi cần; chỉ thêm yêu cầu khôi phục để bảo toàn danh tính và chi tiết gốc." onChange={(prompt) => { setRestorationPrompt(prompt); setRestorationPromptEdited(true) }} onRegenerate={regenerateRestorationPrompt} /> : outdoor ? <OutdoorPromptEditor prompt={outdoorPrompt} edited={outdoorPromptEdited} disabled={generating} onChange={(prompt) => { setOutdoorPrompt(prompt); setOutdoorPromptEdited(true) }} onRegenerate={regenerateOutdoorPrompt} /> : <PromptEditor prompt={photoIdPrompt} edited={photoIdPromptEdited} disabled={generating} title="Lời nhắc ảnh thẻ" description="Tinh chỉnh lời nhắc AI; các lựa chọn chỉ tự cập nhật khi bạn chưa chỉnh sửa thủ công." onChange={(prompt) => { photoIdPromptEditedRef.current = true; setPhotoIdPrompt(prompt); setPhotoIdPromptEdited(true) }} onRegenerate={regeneratePhotoIdPrompt} />}<div className="action-row"><button className="button button-primary button-large" disabled={generating || !sourceImage} onClick={() => void generate()}>{generating ? <><RefreshCcw className="spin" size={18} /> {copy.loading}</> : <><Sparkles size={18} /> {copy.action}</>}</button><button className="button button-quiet" disabled={generating} onClick={reset}><RotateCcw size={16} /> Đặt lại</button>{resultImage && <button className="button button-secondary" disabled={downloading} onClick={() => void download()}><Download size={16} /> Tải xuống</button>}</div></section><ResultPreview image={resultImage} mode={mode} generating={generating} downloading={downloading} onDownload={() => void download()} /></div>
    {!restoration && !outdoor && <PrintSheet image={resultImage} size={choices.size} />}
    {settingsOpen && <SettingsDialog initial={settings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} onTest={async (value) => { const response = await photoIdApi.settings.test(value); if (!response.ok) throw new Error(response.message); return response.message ?? 'Kết nối thành công.' }} />}
  </main>
}
