export const SIZE_PRESETS = {
  S: 1,
  M: 2,
  L: 5,
  XL: 10,
  XXL: 50,
  XXXL: 500,
}

// 1 km ≈ 0.01°, so dividing km/10000 gives the degree step per adjustment click
export const STEP_SIZES = Object.fromEntries(
  Object.entries(SIZE_PRESETS).map(([key, value]) => [key, value / 10000])
)

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

export const REGIONS = ['Switzerland', 'Germany', 'France', 'Italy', 'Austria', 'Spain', 'Europe']

export const REGION_FLAGS = {
  Switzerland: '🇨🇭',
  Germany: '🇩🇪',
  France: '🇫🇷',
  Italy: '🇮🇹',
  Austria: '🇦🇹',
  Spain: '🇪🇸',
  Europe: '🇪🇺',
}
