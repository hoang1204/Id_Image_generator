import { ImagePlus, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

interface Props { image: string | null; onImage: (image: string) => void; onPick: () => void; onError: (message: string) => void; mode?: 'photoId' | 'restoration' | 'outdoor'; disabled?: boolean }

const MAX_BYTES = 15 * 1024 * 1024
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']

function readMagicBytes(file: File): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result instanceof ArrayBuffer ? new Uint8Array(reader.result) : null)
    reader.onerror = () => resolve(null)
    reader.readAsArrayBuffer(file.slice(0, 16))
  })
}

function hasSupportedMagic(bytes: Uint8Array): boolean {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return true
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true
  // WebP: RIFF .... WEBP
  return bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

export function ImageDropzone({ image, onImage, onPick, onError, mode = 'photoId', disabled = false }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const readFile = async (file?: File) => {
    if (!file) return
    if (file.size > MAX_BYTES) { onError('Tệp quá lớn. Vui lòng dùng ảnh PNG, JPG hoặc WebP dưới 15 MB.'); return }
    const bytes = await readMagicBytes(file)
    const supported = bytes ? hasSupportedMagic(bytes) : ALLOWED_MIME.includes(file.type)
    if (!supported) { onError('Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh PNG, JPG hoặc WebP.'); return }
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') onImage(reader.result) }
    reader.onerror = () => onError('Không thể đọc tệp đã chọn. Vui lòng thử lại.')
    reader.readAsDataURL(file)
  }
  return <div
    className={`dropzone ${dragging ? 'dropzone-active' : ''}`}
    onDragOver={(event) => { if (disabled) return; event.preventDefault(); setDragging(true) }}
    onDragLeave={() => setDragging(false)}
    onDrop={(event) => { if (disabled) return; event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files[0]) }}
  >
    <input disabled={disabled} ref={input} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void readFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
    {image ? <img className="source-image" src={image} alt={mode === 'restoration' ? 'Ảnh cũ cần phục chế đã chọn' : mode === 'outdoor' ? 'Ảnh chân dung dùng để tạo ảnh ngoại cảnh đã chọn' : 'Ảnh chân dung gốc đã chọn'} /> : <><div className="icon-orb"><UploadCloud size={26} /></div><strong>{mode === 'restoration' ? 'Kéo thả ảnh cũ hoặc ảnh mờ vào đây' : mode === 'outdoor' ? 'Kéo thả ảnh chân dung để tạo nền phong cảnh' : 'Kéo thả ảnh chân dung vào đây'}</strong><span>PNG, JPG hoặc WebP · tối đa 15 MB</span></>}
    <div className="dropzone-actions"><button disabled={disabled} className="button button-secondary" onClick={() => input.current?.click()}><ImagePlus size={16} /> Duyệt tệp</button><button disabled={disabled} className="button button-quiet" onClick={onPick}>Chọn từ hệ thống</button></div>
  </div>
}
