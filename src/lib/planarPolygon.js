function getBisectorLinePoints(p1_xy, p2_xy, GAME_BOUNDS) {
  const rect = { x: GAME_BOUNDS.west, y: GAME_BOUNDS.south, width: GAME_BOUNDS.east - GAME_BOUNDS.west, height: GAME_BOUNDS.north - GAME_BOUNDS.south }
  const dx = p2_xy.x - p1_xy.x, dy = p2_xy.y - p1_xy.y
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return []
  const midPoint = { x: (p1_xy.x + p2_xy.x) / 2, y: (p1_xy.y + p2_xy.y) / 2 }
  const a = dx, b = dy, c = -dx * midPoint.x - dy * midPoint.y
  const intersections = []
  if (Math.abs(a) > 1e-9) {
    const x_top = (-c - b * (rect.y + rect.height)) / a
    if (x_top >= rect.x && x_top <= rect.x + rect.width) intersections.push({ y: rect.y + rect.height, x: x_top })
    const x_bottom = (-c - b * rect.y) / a
    if (x_bottom >= rect.x && x_bottom <= rect.x + rect.width) intersections.push({ y: rect.y, x: x_bottom })
  }
  if (Math.abs(b) > 1e-9) {
    const y_left = (-c - a * rect.x) / b
    if (y_left >= rect.y && y_left <= rect.y + rect.height) intersections.push({ y: y_left, x: rect.x })
    const y_right = (-c - a * (rect.x + rect.width)) / b
    if (y_right >= rect.y && y_right <= rect.y + rect.height) intersections.push({ y: y_right, x: rect.x + rect.width })
  }
  const seen = new Set()
  const unique = intersections.filter(p => {
    const key = `${p.x.toFixed(7)},${p.y.toFixed(7)}`
    return seen.has(key) ? false : (seen.add(key), true)
  })
  return unique.length >= 2 ? [[unique[0].y, unique[0].x], [unique[1].y, unique[1].x]] : []
}

function getRectangleSlice(rect, pointA, pointB) {
  const dx = pointB.x - pointA.x, dy = pointB.y - pointA.y
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    return [{ x: rect.x, y: rect.y }, { x: rect.x+rect.width, y: rect.y }, { x: rect.x+rect.width, y: rect.y+rect.height }, { x: rect.x, y: rect.y+rect.height }]
  }
  const midPoint = { x: (pointA.x+pointB.x)/2, y: (pointA.y+pointB.y)/2 }
  const line = { a: dx, b: dy, c: -dx*midPoint.x - dy*midPoint.y }
  const sideOfA = line.a*pointA.x + line.b*pointA.y + line.c
  const isInside = p => (line.a*p.x + line.b*p.y + line.c) * sideOfA >= 0
  const subject = [{ x: rect.x, y: rect.y }, { x: rect.x+rect.width, y: rect.y }, { x: rect.x+rect.width, y: rect.y+rect.height }, { x: rect.x, y: rect.y+rect.height }]
  const output = []
  let S = subject[subject.length - 1]
  for (const E of subject) {
    const sIn = isInside(S), eIn = isInside(E)
    if (eIn) { if (!sIn) output.push(getIntersection(S, E, line)); output.push(E) }
    else if (sIn) output.push(getIntersection(S, E, line))
    S = E
  }
  return output
}

function getIntersection(p1, p2, line) {
  const { a, b, c } = line, dx = p2.x-p1.x, dy = p2.y-p1.y
  const denom = a*dx + b*dy
  if (Math.abs(denom) < 1e-9) return p1
  const t = -(a*p1.x + b*p1.y + c) / denom
  return { x: p1.x + t*dx, y: p1.y + t*dy }
}

function isLeft(x1, y1, x2, y2, px, py) {
  return (x2-x1)*(py-y1) - (px-x1)*(y2-y1)
}

export function createEliminationZone(prevBar, currentBar, GAME_BOUNDS, isWarmer) {
  const rect = { x: GAME_BOUNDS.west, y: GAME_BOUNDS.south, width: GAME_BOUNDS.east-GAME_BOUNDS.west, height: GAME_BOUNDS.north-GAME_BOUNDS.south }
  const pointToEliminate = isWarmer ? prevBar : currentBar
  const pointToKeep = isWarmer ? currentBar : prevBar
  const pointA_xy = { x: pointToEliminate.lng, y: pointToEliminate.lat }
  const pointB_xy = { x: pointToKeep.lng, y: pointToKeep.lat }
  const vertices = getRectangleSlice(rect, pointA_xy, pointB_xy)
  if (vertices.length < 3) return null
  return vertices.map(obj => [obj.x, obj.y])
}

// Fix: expects polygon as [[lon, lat], ...] arrays (matching buildPolygon output)
export function isPointInPolygon(point, polygon) {
  let wn = 0
  const px = point.lng, py = point.lat
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[(i + 1) % polygon.length]
    if (y1 <= py) {
      if (y2 > py && isLeft(x1, y1, x2, y2, px, py) > 0) wn++
    } else {
      if (y2 <= py && isLeft(x1, y1, x2, y2, px, py) < 0) wn--
    }
  }
  return wn !== 0
}
