// Mirrors src/styles/global.css :root. Leaflet divIcon HTML strings and
// vector-layer style objects are evaluated outside React's DOM/cascade, so
// they can't read CSS var() — this is the one place JS reads palette
// values from. If you change a color in global.css, change it here too.
export const THEME = {
  text: '#14110F',
  border: '#14110F',
  surface: '#FFFFFF',
  primary: '#FF6B6B',
  secondary: '#7C6CFF',
  warmer: '#FF6B6B',
  colder: '#8CB1F5',
  success: '#58B06A',
  warning: '#FFC93C',
  danger: '#FF3B3B',
  fontDisplay: "'Space Grotesk', sans-serif",
  borderW: { thin: 2, regular: 3, thick: 4 },
  shadow: { sm: '2px 2px 0px #14110F', md: '4px 4px 0px #14110F' },
}
