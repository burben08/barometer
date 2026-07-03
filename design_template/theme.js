// Copyable JS mirror of tokens.css's palette, for use anywhere colors need
// to be read outside the CSS cascade — Canvas/SVG-drawing code, and most
// commonly imperative map libraries (Leaflet divIcon HTML strings and
// vector-layer style objects are evaluated outside the DOM, so they can't
// read CSS var()). See patterns/map-integration.md for the full rationale
// and usage examples.
//
// Keep this in sync BY HAND with tokens.css — there's no build step wiring
// them together. If you rename or add a token there, mirror it here too.
//
// Feel free to add app-specific semantic aliases pointing at the same hex
// values, the way Barometer added `warmer`/`colder` pointing at
// `primary`/`tertiary-pastel` for its "hot and cold" game mechanic.
export const THEME = {
  text: '#14110F',
  border: '#14110F',
  surface: '#FFFFFF',
  primary: '#FF6B6B',
  secondary: '#7C6CFF',
  success: '#58B06A',
  warning: '#FFC93C',
  danger: '#FF3B3B',
  fontDisplay: "'Space Grotesk', sans-serif",
  borderW: { thin: 2, regular: 3, thick: 4 },
  shadow: { sm: '2px 2px 0px #14110F', md: '4px 4px 0px #14110F' },
}
