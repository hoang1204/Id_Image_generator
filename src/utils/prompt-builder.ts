import type { EditorChoices } from '../features/editor/presets'
import type { ImageSize } from '../types/electron-api'

const phrases: Record<string, Record<string, string>> = {
  background: {
    white: 'nền trắng tinh khiết sạch sẽ',
    blue: 'nền xanh nhạt đồng đều cổ điển',
    gray: 'nền xám trung tính dịu nhẹ',
    beige: 'nền be sáng ấm áp',
    pink: 'nền hồng nhạt dịu dàng',
    green: 'nền xanh lá nhạt nhẹ nhàng',
  },
  outfit: {
    keep: 'giữ nguyên trang phục hiện tại',
    business: 'mặc trang phục công sở trang trọng, gọn gàng',
    smart: 'mặc trang phục thanh lịch thường ngày, tinh tế',
    blazer: 'mặc blazer xanh navy vừa vặn với áo sơ mi đơn giản',
    whiteShirt: 'mặc áo sơ mi trắng sạch sẽ, lịch sự',
    blackVest: 'mặc vest đen sang trọng',
  },
  hair: {
    keep: 'giữ nguyên kiểu tóc hiện tại',
    tidy: 'tạo kiểu tóc gọn gàng trong khi giữ hình dáng tự nhiên',
    natural: 'giữ kết cấu và hình dáng tóc tự nhiên',
    formal: 'tạo kiểu trang trọng nhẹ nhàng cho mái tóc hiện tại',
    bun: 'buộc tóc búi gọn gàng phía sau',
    loose: 'để tóc xõa tự nhiên, mềm mại',
  },
  preset: {
    official: 'ảnh thẻ kiểu tiêu chuẩn chính phủ',
    visa: 'ảnh chân dung hồ sơ xin visa',
    professional: 'ảnh chân dung chuyên nghiệp phù hợp giấy tờ tùy thân',
    student: 'ảnh chân dung thẻ sinh viên sạch sẽ',
    passport: 'ảnh hộ chiếu chuẩn quốc tế',
    cv: 'ảnh chân dung hồ sơ xin việc chuyên nghiệp',
    graduation: 'ảnh chân dung tốt nghiệp trang trọng',
  },
  retouch: {
    natural: 'chỉ làm sạch da một cách tự nhiên, tinh tế',
    light: 'chỉnh sửa da nhẹ nhàng, chuyên nghiệp và chân thực',
    none: 'không chỉnh sửa các đường nét trên khuôn mặt hoặc làn da',
    glow: 'làm sáng nhẹ làn da một cách tự nhiên',
  },
}

// Safe lookup: every selectable option maps to a Vietnamese phrase; if a key is
// ever missing (defensive), fall back to the first phrase of that group.
function phrase(group: Record<string, string>, key: string): string {
  return group[key] ?? Object.values(group)[0] ?? ''
}

const sizePhrases: Record<ImageSize, string> = {
  '2x2': 'ảnh thẻ 2 × 2 inch',
  '35x45': 'ảnh thẻ 35 × 45 mm',
  '4x6': 'ảnh thẻ 4 × 6 cm',
}

export function buildPrompt(choices: EditorChoices): string {
  const size = sizePhrases[choices.size] ?? 'ảnh thẻ'
  return [
    `Tạo một ${phrase(phrases.preset, choices.preset)}.`,
    'Giữ nguyên danh tính của người trong ảnh gốc một cách chính xác: giữ lại các đường nét khuôn mặt, tỷ lệ, màu da và độ tuổi nhận biết được. Không biến họ thành một người khác.',
    `${phrase(phrases.outfit, choices.outfit)}. ${phrase(phrases.hair, choices.hair)}.`,
    `Sử dụng ${phrase(phrases.background, choices.background)}, ánh sáng studio tự nhiên cân bằng, bố cục chụp thẳng đứng từ đầu đến vai, và biểu cảm tự nhiên điềm tĩnh phù hợp với ${size}.`,
    `${phrase(phrases.retouch, choices.retouch)}. Giữ kết quả chân thực như ảnh thật, sắc nét, phơi sáng đều và bố cục chuyên nghiệp. Không thêm chữ, logo, viền, hình mờ, trang sức hoặc người thừa.`,
  ].join(' ')
}
