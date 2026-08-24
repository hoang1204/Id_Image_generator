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
    'Tạo một ảnh chân dung ngoại cảnh chân thực từ ảnh người dùng tải lên, dùng ảnh đó làm tài liệu tham chiếu danh tính DUY NHẤT và bắt buộc.',
    'BẮT BUỘC giữ nguyên danh tính của người trong ảnh gốc: giữ nguyên giới tính và cách thể hiện giới tính, hình dạng khuôn mặt, màu da và đặc điểm dân tộc, độ tuổi nhận biết được, kiểu tóc và tỷ lệ cơ thể. Chỉ giữ nguyên các chi tiết khuôn mặt/cơ thể hiện rõ trong ảnh gốc (nốt ruồi, tàn nhang, sẹo, hình xăm, nếp nhăn, vết chân chim, khuyết điểm...); tuyệt đối không thêm, bỏ bớt, phóng đại hoặc bịa ra bất kỳ chi tiết, nếp nhăn hoặc dấu hiệu lão hóa nào không có trong ảnh. Không đổi giới tính: thay đổi nền/bối cảnh chỉ là thay đổi phong cảnh, không được làm người này thành giới tính khác hoặc thành người khác. Tuyệt đối không sáng tạo, thay thế hoặc ghép một người khác.',
    `Đặt chủ thể tự nhiên trong ${background}, với ${safeValue(lighting, choices.lighting, 'natural')} và bố cục ${safeValue(framing, choices.framing, 'halfBody')}.`,
    'Giữ dáng đứng hoặc tư thế tự nhiên, tích hợp mép chủ thể và tóc sạch, chân thực. Phối cảnh, hướng sáng, bóng đổ và độ sâu trường ảnh phải nhất quán với bối cảnh.',
    'Mọi thay đổi chỉ giới hạn ở việc đặt người này vào bối cảnh nền đã chọn; bản thân người đó giữ nguyên như ảnh gốc. Không thay đổi danh tính, không tạo thêm người, không thêm chữ, logo hoặc hình mờ. Tránh da nhựa, chi tiết bịa đặt, viền cắt ghép, ánh sáng phi thực tế hoặc nền méo.',
  ].join(' ')
}
