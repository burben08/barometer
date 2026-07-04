// Diameter, in km, of the square game area for each size preset.
export const SIZE_PRESETS = {
  XS: 0.5,
  S: 1,
  M: 2,
  L: 5,
  XL: 10,
  XXL: 20,
  XXXL: 50,
  HUGE: 100,
}

// 1 km ≈ 0.01°, so dividing km/10000 gives the degree step per adjustment click
export const STEP_SIZES = Object.fromEntries(
  Object.entries(SIZE_PRESETS).map(([key, value]) => [key, value / 10000])
)

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'HUGE']

// Countries have a real bundled boundary polygon (see countryBoundaries.js)
// and verified bar selection. Continents don't (no single administrative
// shape, and "fetch every bar" isn't feasible at that scale) — hidden from
// the region picker for now so region mode stays internally consistent;
// re-enable by including CONTINENTS in the picker once that's solved.
export const COUNTRIES = ['Switzerland', 'Germany', 'France', 'Italy', 'Austria', 'Spain']
export const CONTINENTS = ['Europe']
export const REGIONS = [...COUNTRIES, ...CONTINENTS]

export const REGION_FLAGS = {
  Switzerland: '🇨🇭',
  Germany: '🇩🇪',
  France: '🇫🇷',
  Italy: '🇮🇹',
  Austria: '🇦🇹',
  Spain: '🇪🇸',
  Europe: '🇪🇺',
}
