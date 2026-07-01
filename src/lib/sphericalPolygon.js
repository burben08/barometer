// --- Module-level private variables ---
let CURRENT_GAME_BOUNDS = {}
let CURRENT_GAME_BOUNDS_CORNERS_LONLAT = []

const toRad = d => d * Math.PI / 180
const toDeg = r => r * 180 / Math.PI

// Input: lon, lat in degrees
// Output: [x, y, z] cartesian vector
export function lonLatToCartesian(lon, lat) {
  const φ = toRad(lat), λ = toRad(lon)
  return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)]
}

function cartesianToLonLat(v) {
  const [x, y, z] = v
  return [toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]
}

const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
const norm = v => { const m = Math.hypot(v[0], v[1], v[2]); return m < 1e-15 ? [0,0,0] : v.map(x => x/m) }
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }
function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]] }
function add(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]] }
function mul(a, s) { return [a[0]*s, a[1]*s, a[2]*s] }
function length(a) { return Math.hypot(a[0], a[1], a[2]) }
function normalizeLon(l) { return ((l + 180) % 360 + 360) % 360 - 180 }

export function sphericalDistance(p1, p2) {
  const r = length(p1), r2 = length(p2)
  return r * Math.acos(Math.max(-1, Math.min(1, dot(p1, p2) / (r * r2))))
}

function getIntersectionOnSphere(L1, L2) {
  const n1 = norm(cross(lonLatToCartesian(L1[0][0], L1[0][1]), lonLatToCartesian(L1[1][0], L1[1][1])))
  const n2 = norm(cross(lonLatToCartesian(L2[0][0], L2[0][1]), lonLatToCartesian(L2[1][0], L2[1][1])))
  const p = norm(cross(n1, n2))
  return [toDeg(Math.atan2(p[1], p[0])), toDeg(Math.asin(p[2]))]
}

function getBisectionLine(p1LonLat, p2LonLat) {
  const A = lonLatToCartesian(p1LonLat[0], p1LonLat[1])
  const B = lonLatToCartesian(p2LonLat[0], p2LonLat[1])
  const n = cross(A, B)
  const m = norm([A[0]+B[0], A[1]+B[1], A[2]+B[2]])
  const q = norm(n)
  return [cartesianToLonLat(m), cartesianToLonLat(q)]
}

export function getLineCoordsBetween(p1LonLat, p2LonLat, steps = 300) {
  const A = lonLatToCartesian(p1LonLat[0], p1LonLat[1])
  const B = lonLatToCartesian(p2LonLat[0], p2LonLat[1])
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const v = norm([A[0]*(1-t)+B[0]*t, A[1]*(1-t)+B[1]*t, A[2]*(1-t)+B[2]*t])
    coords.push(cartesianToLonLat(v))
  }
  return coords
}

function getBoundaryIntersections(p1LonLat, p2LonLat) {
  const g1 = getBisectionLine(p1LonLat, p2LonLat)
  const g2 = getBisectionLine(p2LonLat, p1LonLat)
  const c = CURRENT_GAME_BOUNDS_CORNERS_LONLAT
  const boundaryLines = [
    [c[1], c[0]], [c[2], c[1]], [c[3], c[2]], [c[0], c[3]],
  ]
  const intersections = []
  for (const line of boundaryLines) {
    intersections.push(getIntersectionOnSphere(g1, line))
    intersections.push(getIntersectionOnSphere(g2, line))
  }
  return intersections
}

function getIntersectionWithConstantLat(p1LonLat, p2LonLat, latC) {
  const pA = lonLatToCartesian(p1LonLat[0], p1LonLat[1])
  const pB = lonLatToCartesian(p2LonLat[0], p2LonLat[1])
  const n = cross(pA, pB)
  const nLen = length(n)
  if (nLen < 1e-12) return null
  const nNorm = mul(n, 1/nLen)
  let u = sub(pA, mul(nNorm, dot(pA, nNorm)))
  let uLen = length(u)
  if (uLen < 1e-12) {
    u = sub(pB, mul(nNorm, dot(pB, nNorm)))
    uLen = length(u)
    if (uLen < 1e-12) return null
  }
  u = mul(u, 1/uLen)
  const v = cross(nNorm, u)
  const uz = u[2], vz = v[2], target = Math.sin(toRad(latC))
  const R = Math.sqrt(uz*uz + vz*vz)
  if (R < 1e-12) return Math.abs(target) < 1e-12 ? [normalizeLon(cartesianToLonLat(u)[0]), normalizeLon(cartesianToLonLat(mul(u,-1))[0])] : null
  if (Math.abs(target/R) > 1 + 1e-12) return null
  const delta = Math.acos(Math.max(-1, Math.min(1, target/R)))
  const phi = Math.atan2(vz, uz)
  return [
    normalizeLon(cartesianToLonLat(add(mul(u, Math.cos(phi+delta)), mul(v, Math.sin(phi+delta))))[0]),
    normalizeLon(cartesianToLonLat(add(mul(u, Math.cos(phi-delta)), mul(v, Math.sin(phi-delta))))[0]),
  ]
}

export function getIntersections(p1LonLat, p2LonLat, GAME_BOUNDS = null) {
  if (GAME_BOUNDS !== null) {
    CURRENT_GAME_BOUNDS = GAME_BOUNDS
    CURRENT_GAME_BOUNDS_CORNERS_LONLAT = [
      [GAME_BOUNDS.west, GAME_BOUNDS.south],
      [GAME_BOUNDS.west, GAME_BOUNDS.north],
      [GAME_BOUNDS.east, GAME_BOUNDS.north],
      [GAME_BOUNDS.east, GAME_BOUNDS.south],
    ]
  }

  const bisectionLine = getBisectionLine(p1LonLat, p2LonLat)
  let northIntersections = getIntersectionWithConstantLat(bisectionLine[0], bisectionLine[1], CURRENT_GAME_BOUNDS.north) || []
  let southIntersections = getIntersectionWithConstantLat(bisectionLine[0], bisectionLine[1], CURRENT_GAME_BOUNDS.south) || []
  const rectangleIntersections = getBoundaryIntersections(p1LonLat, p2LonLat)

  const intersections = []
  const b = CURRENT_GAME_BOUNDS
  const e = 1e-6

  for (const lon of northIntersections) {
    if (lon >= b.west && lon <= b.east) intersections.push([lon, b.north])
  }
  for (const lon of southIntersections) {
    if (lon >= b.west && lon <= b.east) intersections.push([lon, b.south])
  }
  for (const inter of rectangleIntersections) {
    if ((Math.abs(inter[0]-b.west) < e || Math.abs(inter[0]-b.east) < e) && inter[1] >= b.south && inter[1] <= b.north) {
      intersections.push(inter)
    }
  }
  return intersections
}

function checkSideOfCorner(p1LonLat, p2LonLat) {
  const p1 = lonLatToCartesian(p1LonLat[0], p1LonLat[1])
  const p2 = lonLatToCartesian(p2LonLat[0], p2LonLat[1])
  return CURRENT_GAME_BOUNDS_CORNERS_LONLAT.map(c => {
    const cc = lonLatToCartesian(c[0], c[1])
    return sphericalDistance(p1, cc) < sphericalDistance(p2, cc) ? 0 : 1
  })
}

export function buildPolygon(GAME_BOUNDS, pts, side, resolution = 100) {
  CURRENT_GAME_BOUNDS = GAME_BOUNDS
  CURRENT_GAME_BOUNDS_CORNERS_LONLAT = [
    [GAME_BOUNDS.west, GAME_BOUNDS.south],
    [GAME_BOUNDS.west, GAME_BOUNDS.north],
    [GAME_BOUNDS.east, GAME_BOUNDS.north],
    [GAME_BOUNDS.east, GAME_BOUNDS.south],
  ]

  const [p1LonLat, p2LonLat] = pts
  const boundaryIntersections = getIntersections(p1LonLat, p2LonLat)
  if (boundaryIntersections.length < 2) {
    console.error('buildPolygon: Could not find two boundary intersections.')
    return []
  }

  const cornerSides = checkSideOfCorner(p1LonLat, p2LonLat)
  const bisectionCoords = getLineCoordsBetween(boundaryIntersections[0], boundaryIntersections[1], resolution)

  let cornerCoords = cornerSides
    .map((s, i) => (s != side ? [CURRENT_GAME_BOUNDS_CORNERS_LONLAT[i]] : null))
    .filter(Boolean)

  let polygonCoords = [...bisectionCoords]
  let added = true
  while (added) {
    added = false
    for (let j = cornerCoords.length - 1; j >= 0; j--) {
      const corner = cornerCoords[j]
      const last = polygonCoords[polygonCoords.length - 1]
      if (Math.abs(corner[0][0] - last[0]) < 1e-6 || Math.abs(corner[0][1] - last[1]) < 1e-6) {
        polygonCoords.push(corner[0])
        cornerCoords.splice(j, 1)
        added = true
      }
    }
  }

  return polygonCoords
}
