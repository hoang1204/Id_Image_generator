import type { OutdoorChoices } from '../features/outdoor/presets'

const backgrounds: Record<string, string> = {
  park: 'một công viên xanh thoáng đãng', beach: 'bãi biển tự nhiên', oldTown: 'một con phố cổ có chiều sâu',
  mountains: 'khung cảnh núi rừng tự nhiên', cafe: 'một quán cà phê ấm cúng', nightCity: 'thành phố về đêm có ánh đèn hài hòa',
}
const lighting: Record<string, string> = {
  natural: 'ánh sáng tự nhiên mềm và cân bằng', sunset: 'ánh hoàng hôn ấm áp, tự nhiên', night: 'ánh đèn đêm chân thực, không cháy sáng',
}
const framing: Record<string, string> = {
  closeUp: 'chân dung cận mặt', halfBody: 'chân dung nửa người', fullBody: 'chân dung toàn thân',
}

function safeValue(values: Record<string, string>, value: string, fallback: string): string {
  return values[value] ?? values[fallback]
}

export function sanitizeOutdoorBackground(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 500)
}

export function buildOutdoorPrompt(choices: OutdoorChoices): string {
  const custom = sanitizeOutdoorBackground(choices.customBackground)
  const background = custom ? `${safeValue(backgrounds, choices.background, 'park')}; bối cảnh bổ sung theo yêu cầu: ${custom}` : safeValue(backgrounds, choices.background, 'park')
  return [
    'Tạo một ảnh chân dung ngoại cảnh chân thực từ ảnh gốc.',
    'Giữ chính xác danh tính, độ tuổi dễ nhận biết, đường nét, tỷ lệ khuôn mặt, màu da, biểu cảm và đặc điểm riêng của người trong ảnh. Không biến họ thành người khác.',
    `Đặt chủ thể tự nhiên trong ${background}, với ${safeValue(lighting, choices.lighting, 'natural')} và bố cục ${safeValue(framing, choices.framing, 'halfBody')}.`,
    'Giữ dáng đứng hoặc tư thế tự nhiên, tích hợp mép chủ thể và tóc sạch, chân thực. Phối cảnh, hướng sáng, bóng đổ và độ sâu trường ảnh phải nhất quán với bối cảnh.',
    'Không thay đổi danh tính, không tạo thêm người, không thêm chữ, logo hoặc hình mờ. Tránh da nhựa, chi tiết bịa đặt, viền cắt ghép, ánh sáng phi thực tế hoặc nền méo.',
  ].join(' ')
}
