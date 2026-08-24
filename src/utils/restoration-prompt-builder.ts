import type { RestorationChoices } from '../features/restoration/presets'

const phrases: Record<keyof RestorationChoices, Record<string, string>> = {
  level: {
    light: 'Chỉ thực hiện phục chế nhẹ, có chọn lọc.',
    balanced: 'Phục chế ở mức cân bằng, ưu tiên giữ lại đặc điểm nguyên bản.',
    deep: 'Phục chế chuyên sâu các hư hại nhìn thấy được, nhưng luôn thận trọng với chi tiết khuôn mặt.',
  },
  sharpness: {
    natural: 'Làm nét tự nhiên vừa phải, không tạo viền gắt hoặc kết cấu giả.',
    clear: 'Tăng độ rõ nét có kiểm soát cho các chi tiết thật có sẵn, không suy diễn chi tiết mới.',
    none: 'Không tăng độ làm nét.',
  },
  denoise: {
    auto: 'Tự động giảm nhiễu khi ảnh cần, vẫn giữ hạt ảnh tự nhiên.',
    light: 'Khử nhiễu nhẹ nhàng.',
    strong: 'Khử nhiễu mạnh nhưng không làm bệt da, tóc hoặc bề mặt.',
  },
  color: {
    preserve: 'Giữ nguyên tông màu và sắc thái lịch sử của ảnh.',
    natural: 'Khôi phục màu tự nhiên, cân bằng các vùng phai màu mà không tô màu suy đoán.',
    blackWhite: 'Chuyển thành ảnh đen trắng giàu sắc độ, tự nhiên.',
  },
}

function phrase(group: keyof RestorationChoices, value: string): string {
  return phrases[group][value] ?? Object.values(phrases[group])[0] ?? ''
}

export function buildRestorationPrompt(choices: RestorationChoices): string {
  return [
    'Phục chế ảnh gốc này một cách chân thực và bảo tồn lịch sử của nó.',
    'Giữ chính xác danh tính, độ tuổi nhận biết được, đường nét, tỷ lệ khuôn mặt, màu da, biểu cảm, trang phục và bố cục hiện có. Không tạo hoặc thay thế chi tiết khuôn mặt, không làm người trong ảnh trông thành người khác.',
    'Sửa các vết xước, bụi, vết bẩn, vùng phai màu, nhiễu, mờ và hư hại chỉ khi chúng thực sự xuất hiện trong ảnh.',
    phrase('level', choices.level), phrase('sharpness', choices.sharpness), phrase('denoise', choices.denoise), phrase('color', choices.color),
    'Tránh da nhựa, làm đẹp quá mức, hiệu ứng HDR, chi tiết bịa đặt, viền sắc quá mức hoặc thay đổi nền. Không thêm chữ, logo hoặc hình mờ.',
  ].join(' ')
}
