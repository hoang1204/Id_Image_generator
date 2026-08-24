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
  // Hair preservation belongs inside the absolute identity lock only when 'keep' is
  // chosen; an explicit style (tidy/natural/formal/bun/loose) is applied via hairStyle
  // instead, so the lock never contradicts the selected style.
  const preserveHair = choices.hair === 'keep' ? ' Giữ nguyên kiểu tóc và hình dáng tóc hiện tại.' : ''
  const hairStyle = choices.hair === 'keep' ? '' : ` ${phrase(phrases.hair, choices.hair)}.`
  return [
    `Tạo một ${phrase(phrases.preset, choices.preset)} từ ảnh người dùng tải lên, dùng ảnh đó làm tài liệu tham chiếu danh tính DUY NHẤT và bắt buộc.`,
    `BẮT BUỘC giữ nguyên danh tính của người trong ảnh gốc: giữ nguyên giới tính và cách thể hiện giới tính, hình dạng khuôn mặt, màu da và đặc điểm dân tộc, độ tuổi nhận biết được và tỷ lệ cơ thể. Chỉ giữ nguyên các chi tiết khuôn mặt/cơ thể hiện rõ trong ảnh gốc (nốt ruồi, tàn nhang, sẹo, hình xăm, nếp nhăn, vết chân chim, khuyết điểm...); tuyệt đối không thêm, bỏ bớt, phóng đại hoặc bịa ra bất kỳ chi tiết, nếp nhăn hoặc dấu hiệu lão hóa nào không có trong ảnh.${preserveHair} Không đổi giới tính: trang phục và kiểu tóc đã chọn chỉ là phong cách, không được làm người này thành giới tính khác hoặc thành người khác. Tuyệt đối không sáng tạo, thay thế hoặc ghép một người khác.`,
    `${phrase(phrases.outfit, choices.outfit)}.${hairStyle}`,
    `Sử dụng ${phrase(phrases.background, choices.background)}, ánh sáng studio tự nhiên cân bằng, bố cục chụp thẳng đứng từ đầu đến vai, và biểu cảm tự nhiên điềm tĩnh phù hợp với ${size}.`,
    `${phrase(phrases.retouch, choices.retouch)}. Mọi thay đổi chỉ giới hạn ở nền, trang phục, kiểu tóc và phần retouch đã chọn; giữ kết quả chân thực như ảnh thật, sắc nét, phơi sáng đều và bố cục chuyên nghiệp. Không thêm chữ, logo, viền, hình mờ, trang sức hoặc người thừa.`,
  ].join(' ')
}
