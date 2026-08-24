export const outdoorOptions = {
  background: [
    ['park', 'Công viên xanh'], ['beach', 'Bãi biển'], ['oldTown', 'Phố cổ'],
    ['mountains', 'Núi rừng'], ['cafe', 'Quán cà phê'], ['nightCity', 'Thành phố về đêm'],
  ],
  lighting: [
    ['natural', 'Ánh sáng tự nhiên'], ['sunset', 'Hoàng hôn'], ['night', 'Đèn đêm'],
  ],
  framing: [
    ['closeUp', 'Cận mặt'], ['halfBody', 'Nửa người'], ['fullBody', 'Toàn thân'],
  ],
} as const

export interface OutdoorChoices {
  background: string
  lighting: string
  framing: string
  customBackground: string
}

export const defaultOutdoorChoices: OutdoorChoices = {
  background: 'park',
  lighting: 'natural',
  framing: 'halfBody',
  customBackground: '',
}
