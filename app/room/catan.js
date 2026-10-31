import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// ===================================================================
//  Catan مجسّم: جزيرة سداسية بأراضي وقطع ثلاثية الأبعاد (الوحدات بالمتر)
// ===================================================================
const R = 0.05            // نصف قطر السداسي (من المركز للزاوية)
const TILE_H = 0.008
const SQ3 = Math.sqrt(3)

// خريطة البداية الرسمية (صف بصف)
const LAYOUT = [
  [['mountains', 10], ['pasture', 2], ['forest', 9]],
  [['fields', 12], ['hills', 6], ['pasture', 4], ['hills', 10]],
  [['fields', 9], ['forest', 11], ['desert', 0], ['forest', 3], ['mountains', 8]],
  [['forest', 8], ['mountains', 3], ['fields', 4], ['pasture', 5]],
  [['hills', 5], ['fields', 6], ['pasture', 11]],
]
const TERRAIN = {
  forest: { top: '#3E7A3A', side: '#2E5A2B' },
  pasture: { top: '#9CCB6B', side: '#78A54F' },
  fields: { top: '#E7C04E', side: '#C59F33' },
  hills: { top: '#C9744A', side: '#A35A35' },
  mountains: { top: '#9097A0', side: '#6E747C' },
  desert: { top: '#E6D3A0', side: '#C9B47E' },
}

const std = (color, rough = .7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, envMapIntensity: .45, ...extra })
function m(geo, mat, cast = true) { const x = new THREE.Mesh(geo, mat); x.castShadow = cast; x.receiveShadow = true; return x }

function hexCenters() {
  const out = []
  LAYOUT.forEach((row, ri) => {
    const z = (ri - 2) * 1.5 * R
    const n = row.length
    row.forEach(([type, num], ci) => {
      const x = (ci - (n - 1) / 2) * SQ3 * R
      out.push({ type, num, x, z })
    })
  })
  return out
}
// زوايا السداسي (رأس مدبب للأمام/الخلف)
function cornerAt(cx, cz, i) { const a = i * Math.PI / 3; return new THREE.Vector3(cx + R * Math.sin(a), 0, cz + R * Math.cos(a)) }

// ---------- نسيج الأرقام ----------
function numberTexture(n) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128
  const x = cv.getContext('2d')
  x.fillStyle = '#F4E9CF'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill()
  x.strokeStyle = 'rgba(120,90,50,.35)'; x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 56, 0, Math.PI * 2); x.stroke()
  const hot = n === 6 || n === 8
  x.fillStyle = hot ? '#B3261E' : '#2B2620'
  x.font = `700 ${hot ? 60 : 56}px Georgia, 'Times New Roman', serif`; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillText(String(n), 64, 58)
  const dots = 6 - Math.abs(7 - n)
  for (let i = 0; i < dots; i++) { x.beginPath(); x.arc(64 + (i - (dots - 1) / 2) * 10, 96, 3.4, 0, Math.PI * 2); x.fill() }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}

// ---------- زينة كل أرض ----------
const rnd = (() => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280 })()
function decorate(tile, type) {
  const top = TILE_H / 2
  const spots = n => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 + rnd() * .6; const d = R * (.28 + rnd() * .3); return [Math.cos(a) * d, Math.sin(a) * d] })
  if (type === 'forest') {
    const leaf = std('#2F6A2E', .8), trunk = std('#5B3A22', .9)
    for (const [x, z] of [...spots(4), [0, 0]]) {
      const s = .75 + rnd() * .45
      const t1 = m(new THREE.CylinderGeometry(.0025, .003, .008 * s, 6), trunk); t1.position.set(x, top + .004 * s, z); tile.add(t1)
      const c1 = m(new THREE.ConeGeometry(.011 * s, .026 * s, 8), leaf); c1.position.set(x, top + .008 * s + .012 * s, z); tile.add(c1)
      const c2 = m(new THREE.ConeGeometry(.008 * s, .018 * s, 8), leaf); c2.position.set(x, top + .008 * s + .022 * s, z); tile.add(c2)
    }
  } else if (type === 'mountains') {
    const rock = std('#7D838C', .85), snow = std('#F2F2F0', .6)
    for (const [x, z, s] of [[-.012, .006, 1.2], [.014, -.004, .95], [.002, -.018, .8]]) {
      const c = m(new THREE.ConeGeometry(.018 * s, .03 * s, 5), rock); c.position.set(x, top + .015 * s, z); c.rotation.y = rnd() * 3; tile.add(c)
      const cap = m(new THREE.ConeGeometry(.0065 * s, .011 * s, 5), snow); cap.position.set(x, top + .025 * s, z); cap.rotation.y = c.rotation.y; tile.add(cap)
    }
  } else if (type === 'hills') {
    const brick = std('#B5532E', .8)
    for (const [x, z] of spots(5)) {
      const b = m(new THREE.BoxGeometry(.012, .006, .007), brick); b.position.set(x, top + .003, z); b.rotation.y = rnd() * 3; tile.add(b)
      if (rnd() > .4) { const b2 = b.clone(); b2.position.y += .006; b2.rotation.y += .5; tile.add(b2) }
    }
  } else if (type === 'fields') {
    const wheat = std('#D9A92E', .9)
    for (let row = -2; row <= 2; row++) {
      const len = R * (1.4 - Math.abs(row) * .25)
      const w = m(new THREE.BoxGeometry(len, .005, .005), wheat); w.position.set(0, top + .0025, row * .012); w.rotation.y = .5; tile.add(w)
    }
  } else if (type === 'pasture') {
    const wool = std('#FAF7F0', .95), head = std('#2B2620', .7)
    for (const [x, z] of spots(3)) {
      const s = m(new THREE.SphereGeometry(.0065, 10, 8), wool); s.scale.set(1.3, .9, 1); s.position.set(x, top + .006, z); tile.add(s)
      const h = m(new THREE.SphereGeometry(.003, 8, 6), head); h.position.set(x + .008, top + .007, z); tile.add(h)
    }
    const bush = std('#5E9A45', .9)
    const b = m(new THREE.SphereGeometry(.007, 8, 6), bush); b.position.set(-.02, top + .004, .018); b.scale.y = .7; tile.add(b)
  } else if (type === 'desert') {
    const dune = std('#D8C08A', .95)
    for (const [x, z, s] of [[-.015, .01, 1], [.016, -.008, .8]]) {
      const d = m(new THREE.SphereGeometry(.016 * s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dune); d.scale.y = .35; d.position.set(x, top, z); tile.add(d)
    }
  }
}

// ---------- القطع ----------
function settlementGeo() {
  const s = new THREE.Shape(); const w = .007, h = .007, r = .012
  s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h); s.lineTo(0, r); s.lineTo(-w, h); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: .011, bevelEnabled: true, bevelSize: .0008, bevelThickness: .0008, bevelSegments: 1 })
  g.translate(0, 0, -.0055); return g
}

// ===================================================================
export function buildCatan(players) {
  const root = new THREE.Group()
  const parts = [] // {obj, to: {pos, quat}, kind, delay}

  // إطار البحر
  const sea = new THREE.Group()
  const seaR = R * 5.25
  const seaMat = std('#3A78B0', .35, { envMapIntensity: .9 })
  const frame = m(new THREE.CylinderGeometry(seaR, seaR + .006, .01, 6), seaMat)
  frame.rotation.y = Math.PI / 6; frame.position.y = .005; sea.add(frame)
  const rim = m(new THREE.CylinderGeometry(seaR + .007, seaR + .009, .012, 6, 1, true), std('#E8DCC0', .7))
  rim.rotation.y = Math.PI / 6; rim.position.y = .006; sea.add(rim)
  // موجات خفيفة
  const foam = std('#BFDDF2', .5)
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2; const d = seaR * (.86 + (i % 3) * .03)
    const f = m(new THREE.TorusGeometry(.006, .0009, 4, 10, Math.PI), foam, false); f.rotation.x = -Math.PI / 2; f.position.set(Math.cos(a) * d, .0105, Math.sin(a) * d); f.rotation.z = a; sea.add(f)
  }
  root.add(sea)
  parts.push({ obj: sea, kind: 'sea', to: { pos: sea.position.clone(), quat: sea.quaternion.clone() } })

  // الأراضي
  const centers = hexCenters()
  const tileGeo = new THREE.CylinderGeometry(R * .985, R * .985, TILE_H, 6)
  centers.forEach((c, i) => {
    const t = TERRAIN[c.type]
    const tile = new THREE.Group()
    const body = m(tileGeo, [std(t.side, .8), std(t.top, .75), std(t.side, .8)])
    tile.add(body)
    decorate(tile, c.type)
    tile.position.set(c.x, .01 + TILE_H / 2, c.z)
    root.add(tile)
    parts.push({ obj: tile, kind: 'tile', i, to: { pos: tile.position.clone(), quat: tile.quaternion.clone() } })
    c.tile = tile
  })

  // الأرقام
  const tokGeo = new THREE.CylinderGeometry(.0125, .0125, .003, 28)
  const tokSide = std('#E9DDBF', .6)
  for (const c of centers) {
    if (!c.num) continue
    const tok = m(tokGeo, [tokSide, std('#ffffff', .55, { map: numberTexture(c.num) }), tokSide])
    // نحطه في جهة من الأرض عشان ما يغطي الزينة كثير
    tok.position.set(c.x, .01 + TILE_H + .0015 + (c.type === 'mountains' || c.type === 'forest' ? .0 : 0), c.z + (c.type === 'forest' || c.type === 'mountains' ? R * .45 : 0))
    if (c.type === 'forest' || c.type === 'mountains') tok.position.y += .0
    tok.rotation.y = Math.PI
    root.add(tok)
    parts.push({ obj: tok, kind: 'token', to: { pos: tok.position.clone(), quat: tok.quaternion.clone() } })
  }

  // اللص على الصحراء
  const desert = centers.find(c => c.type === 'desert')
  const robber = new THREE.Group()
  const rMat = std('#3A3D44', .45, { envMapIntensity: .7 })
  const rb = m(new THREE.CylinderGeometry(.0065, .009, .016, 18), rMat); rb.position.y = .008; robber.add(rb)
  const rh = m(new THREE.SphereGeometry(.0068, 16, 12), rMat); rh.position.y = .02; robber.add(rh)
  robber.position.set(desert.x, .01 + TILE_H, desert.z)
  root.add(robber)
  parts.push({ obj: robber, kind: 'piece', to: { pos: robber.position.clone(), quat: robber.quaternion.clone() } })

  // البيوت والطرق: بداية لأربع لاعبين (مستوحاة من خريطة البداية)
  const sGeo = settlementGeo()
  const roadGeo = new RoundedBoxGeometry(.0045, .0045, R * .78, 1, .0012)
  const H = (row, col) => { let k = 0; for (let r = 0; r < row; r++) k += LAYOUT[r].length; return centers[k + col] }
  const placements = [
    { p: 0, at: [[1, 1, 0], [3, 2, 3]] },
    { p: 1, at: [[0, 1, 5], [2, 3, 2]] },
    { p: 2, at: [[2, 0, 1], [4, 1, 4]] },
    { p: 3, at: [[1, 3, 1], [3, 0, 3]] },
  ]
  for (const { p, at } of placements) {
    const color = players[p % players.length]
    const mat = std(color, .45, { envMapIntensity: .6 })
    for (const [row, col, ci] of at) {
      const h = H(row, col)
      const v = cornerAt(h.x, h.z, ci)
      const v2 = cornerAt(h.x, h.z, (ci + 1) % 6)
      const s = m(sGeo, mat); s.position.set(v.x, .01 + TILE_H, v.z); s.rotation.y = Math.atan2(v.x - h.x, v.z - h.z)
      root.add(s); parts.push({ obj: s, kind: 'piece', to: { pos: s.position.clone(), quat: s.quaternion.clone() } })
      const mid = v.clone().add(v2).multiplyScalar(.5)
      const road = m(roadGeo, mat); road.position.set(mid.x, .01 + TILE_H + .0023, mid.z)
      road.rotation.y = Math.atan2(v2.x - v.x, v2.z - v.z)
      root.add(road); parts.push({ obj: road, kind: 'piece', to: { pos: road.position.clone(), quat: road.quaternion.clone() } })
    }
  }

  // نردين جنب اللوح
  const dieMat = std('#F7F2E8', .4)
  const pip = std('#2B2620', .5)
  for (const [x, z, ry] of [[seaR + .045, .03, .4], [seaR + .07, -.01, -.3]]) {
    const d = new THREE.Group()
    d.add(m(new RoundedBoxGeometry(.016, .016, .016, 3, .003), dieMat))
    for (const [px, pz] of [[-.004, -.004], [0, 0], [.004, .004]]) { const pp = m(new THREE.CylinderGeometry(.0013, .0013, .0006, 10), pip, false); pp.position.set(px, .0081, pz); d.add(pp) }
    d.position.set(x, .008, z); d.rotation.y = ry
    root.add(d); parts.push({ obj: d, kind: 'piece', to: { pos: d.position.clone(), quat: d.quaternion.clone() } })
  }

  // رزم أوراق الموارد
  const cardCols = ['#3E7A3A', '#C9744A', '#9CCB6B', '#E7C04E', '#9097A0']
  cardCols.forEach((col, i) => {
    const st = m(new RoundedBoxGeometry(.04, .012, .058, 2, .002), std(col, .6))
    st.position.set(-seaR - .045, .006, (i - 2) * .064 * .62 - .01); st.rotation.y = .04 * (i - 2)
    st.scale.set(.85, 1, .85)
    root.add(st); parts.push({ obj: st, kind: 'piece', to: { pos: st.position.clone(), quat: st.quaternion.clone() } })
  })

  return { root, parts, size: { w: seaR * 2 + .2, d: seaR * 2 } }
}

// ترتيب ظهور القطع: البحر، ثم الأراضي من النص للأطراف، ثم الأرقام، ثم القطع
export function catanSequence(parts) {
  const sea = parts.filter(p => p.kind === 'sea')
  const tiles = parts.filter(p => p.kind === 'tile').sort((a, b) => a.to.pos.length() - b.to.pos.length())
  const tokens = parts.filter(p => p.kind === 'token').sort((a, b) => a.to.pos.length() - b.to.pos.length())
  const pieces = parts.filter(p => p.kind === 'piece')
  return { sea, tiles, tokens, pieces }
}
