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
    'Phục chế ảnh gốc này một cách chân thực và bảo tồn lịch sử của nó, dùng ảnh tải lên làm tài liệu tham chiếu danh tính DUY NHẤT.',
    'BẮT BUỘC giữ nguyên danh tính của người trong ảnh gốc: giữ nguyên giới tính và cách thể hiện giới tính, hình dạng khuôn mặt, màu da và đặc điểm dân tộc, độ tuổi nhận biết được, kiểu tóc và tỷ lệ cơ thể. Chỉ giữ nguyên các chi tiết khuôn mặt/cơ thể hiện rõ trong ảnh gốc (nốt ruồi, tàn nhang, sẹo, hình xăm, nếp nhăn, vết chân chim, khuyết điểm...); tuyệt đối không thêm, bỏ bớt, phóng đại hoặc bịa ra bất kỳ chi tiết, nếp nhăn hoặc dấu hiệu lão hóa nào không có trong ảnh. Không đổi giới tính hoặc danh tính dù sửa chữa bất kỳ hư hại nào. Tuyệt đối không tạo mới, thay thế hoặc ghép một người khác; không làm người trong ảnh trông thành người khác.',
    'Sửa các vết xước, bụi, vết bẩn, vùng phai màu, nhiễu, mờ và hư hại chỉ khi chúng thực sự xuất hiện trong ảnh.',
    phrase('level', choices.level), phrase('sharpness', choices.sharpness), phrase('denoise', choices.denoise), phrase('color', choices.color),
    'Phạm vi phục chế chỉ giới hạn ở sửa chữa hư hại, khử nhiễu, làm nét và khôi phục màu như đã chọn; không sáng tác lại khuôn mặt, trang phục, kiểu tóc hoặc bối cảnh. Tránh da nhựa, làm đẹp quá mức, hiệu ứng HDR, chi tiết bịa đặt, viền sắc quá mức hoặc thay đổi nền. Không thêm chữ, logo hoặc hình mờ.',
  ].join(' ')
}
