import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import GAMES from './data.json'
import BOXES from './boxes.json'

// ===================================================================
//  غرفة طاولتنا — دولاب وطاولة في غرفة وحدة (الوحدات بالمتر)
// ===================================================================
const CATS = {
  strategy: ['استراتيجية عميقة', '#7C8CFF'], family: ['عائلية وكلاسيكية', '#3FA99E'], adventure: ['مغامرات وبناء أوراق', '#D08A2E'],
  coop: ['تعاونية وألغاز', '#4CAF6E'], bluff: ['خداع وأدوار مخفية', '#D0587A'], light: ['أوراق خفيفة وسريعة', '#9B6BE0'], duel: ['مواجهات لاعبين اثنين', '#3D8FE0'],
}
const ORDER = ['strategy', 'family', 'adventure', 'coop', 'bluff', 'duel', 'light']
const PH = id => k => `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}_${k}_1k.jpg`
const proxy = (u, w = 512) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=${w}&output=jpg&q=82`

const $ = id => document.getElementById(id)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- المحرّك ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.prepend(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#1c1814')
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.02, 40)

// ---------- التحميل ----------
const manager = new THREE.LoadingManager()
manager.onProgress = (_, done, total) => { $('bar').style.width = `${Math.round(done / total * 60)}%` }
let texReady = false
manager.onLoad = () => { texReady = true; maybeStart() }
function maybeStart() { if (texReady && boxesReady && !maybeStart.done) { maybeStart.done = true; $('loading').classList.add('done'); intro() } }
const loader = new THREE.TextureLoader(manager)
loader.setCrossOrigin('anonymous')
const maxAniso = renderer.capabilities.getMaxAnisotropy()
function tex(url, { repeat = [1, 1], color = false } = {}) {
  const t = loader.load(url)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = maxAniso
  if (color) t.colorSpace = THREE.SRGBColorSpace
  return t
}
function pbr(id, { repeat = [1, 1], tint = '#ffffff', rough = 1, env = 0.35, normalScale = 1 } = {}) {
  const p = PH(id)
  return new THREE.MeshStandardMaterial({
    map: tex(p('diff'), { repeat, color: true }),
    normalMap: tex(p('nor_gl'), { repeat }),
    roughnessMap: tex(p('rough'), { repeat }),
    roughness: rough, color: new THREE.Color(tint), envMapIntensity: env,
    normalScale: new THREE.Vector2(normalScale, normalScale),
  })
}
// صور الألعاب تحمّل على جنب (ما نوقف الغرفة عليها)
const lazyLoader = new THREE.TextureLoader()
lazyLoader.setCrossOrigin('anonymous')
const imgCache = new Map()
function loadImage(url) {
  if (!imgCache.has(url)) {
    imgCache.set(url, new Promise(res => {
      const im = new Image(); im.crossOrigin = 'anonymous'
      im.onload = () => res(im); im.onerror = () => res(null); im.src = url
    }))
  }
  return imgCache.get(url)
}

// ---------- الخامات ----------
const M = {
  floor: pbr('herringbone_parquet', { repeat: [4, 4], tint: '#d9c7b0', env: .25 }),
  wall: pbr('plastered_wall_02', { repeat: [3, 2], tint: '#efe7dc', env: .1, normalScale: .6 }),
  oak: pbr('oak_veneer_01', { repeat: [1, 1], tint: '#f3e6d4', env: .4 }),
  oakV: pbr('oak_veneer_01', { repeat: [1, 1], tint: '#f3e6d4', env: .4 }),
  walnut: pbr('wood_table_001', { repeat: [1.6, 1], tint: '#c9a283', env: .55 }),
  felt: pbr('velour_velvet', { repeat: [3, 2], tint: '#2f3f7a', env: .05 }),
  rug: pbr('hessian_230', { repeat: [5, 4], tint: '#d8cdbd', env: .05 }),
  white: new THREE.MeshStandardMaterial({ color: '#f2eee8', roughness: .55, envMapIntensity: .3 }),
  metal: new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: .35, metalness: .8, envMapIntensity: .8 }),
  boxIn: new THREE.MeshStandardMaterial({ color: '#e9e3da', roughness: .8 }),
}
M.oakV.map.rotation = M.oakV.normalMap.rotation = M.oakV.roughnessMap.rotation = Math.PI / 2

function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; return m
}
function add(parent, m, x, y, z) { m.position.set(x, y, z); parent.add(m); return m }

// ---------- الغرفة ----------
const ROOM = { w: 6, d: 5.2, h: 2.7 }
const WALL_Z = -1.0, WALL_X = -2.3
const floor = mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), M.floor, { cast: false })
floor.rotation.x = -Math.PI / 2; add(scene, floor, 0.4, 0, WALL_Z + ROOM.d / 2)
const back = mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.h), M.wall, { cast: false })
add(scene, back, 0.4, ROOM.h / 2, WALL_Z)
const side = mesh(new THREE.PlaneGeometry(ROOM.d, ROOM.h), M.wall, { cast: false })
side.rotation.y = Math.PI / 2; add(scene, side, WALL_X, ROOM.h / 2, WALL_Z + ROOM.d / 2)
const ceil = mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), M.white, { cast: false })
ceil.rotation.x = Math.PI / 2; add(scene, ceil, 0.4, ROOM.h, WALL_Z + ROOM.d / 2)
// نعلة الجدار
add(scene, mesh(new THREE.BoxGeometry(ROOM.w, .09, .015), M.white), 0.4, .045, WALL_Z + .008)
const sk2 = mesh(new THREE.BoxGeometry(ROOM.d, .09, .015), M.white); sk2.rotation.y = Math.PI / 2; add(scene, sk2, WALL_X + .008, .045, WALL_Z + ROOM.d / 2)

// ---------- الدولاب (4×4) ----------
const K = { n: 4, cell: .335, t: .018, d: .39 }
K.W = K.n * K.cell + (K.n + 1) * K.t
const shelf = new THREE.Group()
shelf.position.set(-0.85, 0.04, WALL_Z + K.d / 2 + .01)
scene.add(shelf)
const KF = K.d / 2 // واجهة الدولاب (محلياً)
for (let i = 0; i <= K.n; i++) {
  const x = -K.W / 2 + K.t / 2 + i * (K.cell + K.t)
  add(shelf, mesh(new RoundedBoxGeometry(K.t, K.W, K.d, 2, .003), M.oakV), x, K.W / 2, 0)
}
for (let r = 0; r <= K.n; r++) {
  const y = K.t / 2 + r * (K.cell + K.t)
  for (let c = 0; c < K.n; c++) {
    const x = -K.W / 2 + K.t + K.cell / 2 + c * (K.cell + K.t)
    add(shelf, mesh(new THREE.BoxGeometry(K.cell, K.t, K.d), M.oak), x, y, 0)
  }
}
add(shelf, mesh(new THREE.BoxGeometry(K.W, K.W, .006), M.oak), 0, K.W / 2, -K.d / 2 + .003)
// أرجل صغيرة
for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(shelf, mesh(new THREE.CylinderGeometry(.012, .012, .04, 12), M.metal), sx * (K.W / 2 - .04), -.02, sz * (K.d / 2 - .04))

const cellOf = (c, r) => ({ // r = 0 أسفل
  x: -K.W / 2 + K.t + K.cell / 2 + c * (K.cell + K.t),
  y: K.t + r * (K.cell + K.t),
  c, r,
})

// ---------- العلب (مقاسات وصور حقيقية من BGG) ----------
const IN = .0254
const CDN = 'https://cf.geekdo-images.com/'
function realBox(g) {
  const b = BOXES[g.id]
  if (!b) return null
  return {
    L: b[0] * IN, W: b[1] * IN, D: b[2] * IN,
    front: b[3] ? CDN + b[3].replace('~', '/fit-in/700x700/filters:strip_icc()/') : null,
    back: b[4] ? CDN + b[4].replace('^', '/fit-in/1024x1024/filters:no_upscale():strip_icc()/') : null,
  }
}
function fallbackSize(g) {
  if (['strategy', 'family', 'adventure'].includes(g.c) || g.w >= 2.3) return { L: .296, W: .296, D: Math.min(.09, .05 + g.w * .011) }
  if (g.c === 'duel' || g.w >= 1.85) return { L: .23, W: .175, D: .05 }
  return { L: .15, W: .105, D: .038 }
}

// الجوانب: نمدّ لون حافة الغلاف على الجنب (مثل الطباعة الحقيقية) + صورة صغيرة + الاسم
function sideCanvas(g, img, edge, lenM, hM) {
  const W = 640, H = Math.max(56, Math.round(W * hM / lenM))
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const x = cv.getContext('2d')
  let lum = .4
  if (img) {
    const iw = img.width, ih = img.height, k = .1
    // شريط الحافة (أفقي دايماً على الجنب)
    const band = document.createElement('canvas'); band.width = 48; band.height = 6
    const bx = band.getContext('2d')
    bx.imageSmoothingQuality = 'high'
    if (edge === 'bottom') bx.drawImage(img, 0, ih * (1 - k), iw, ih * k, 0, 0, 48, 6)
    else if (edge === 'top') bx.drawImage(img, 0, 0, iw, ih * k, 0, 0, 48, 6)
    else {
      bx.save(); bx.translate(24, 3); bx.rotate(edge === 'right' ? Math.PI / 2 : -Math.PI / 2)
      bx.drawImage(img, edge === 'right' ? iw * (1 - k) : 0, 0, iw * k, ih, -3, -24, 6, 48); bx.restore()
    }
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'
    x.drawImage(band, 0, 0, W, H)
    const d = bx.getImageData(0, 0, 48, 6).data
    let r = 0, gg = 0, bb = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2] }
    const n = d.length / 4; lum = (.299 * r + .587 * gg + .114 * bb) / n / 255
    // صورة صغيرة من الغلاف في طرف الجنب
    const sq = H * .74, pad = H * .13
    x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 6; x.beginPath(); x.roundRect(pad, pad, sq * (iw / ih > 1.2 ? 1.3 : 1), sq, 4); x.clip()
    x.drawImage(img, pad, pad, sq * (iw / ih > 1.2 ? 1.3 : 1), sq); x.restore()
  } else { x.fillStyle = CATS[g.c][1]; x.fillRect(0, 0, W, H) }
  // لمعة الطباعة وتظليل الحواف
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)')
  x.fillStyle = gr; x.fillRect(0, 0, W, H)
  const name = g.n
  x.fillStyle = lum > .6 ? '#1b1815' : '#ffffff'
  x.shadowColor = lum > .6 ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.55)'; x.shadowBlur = 3; x.shadowOffsetY = 1
  x.textBaseline = 'middle'; x.direction = 'ltr'
  const left = img ? H * 1.25 : H * .35, maxW = W - left - H * .3
  let fs = Math.round(H * .44)
  const font = f => `700 ${f}px Alexandria, system-ui, sans-serif`
  x.font = font(fs); while (x.measureText(name).width > maxW && fs > 11) x.font = font(--fs)
  x.fillText(name, left, H / 2 + 1, maxW)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso
  return t
}
function imgTexture(img, rot = 0) {
  const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso
  if (rot) { t.center.set(.5, .5); t.rotation = rot }
  t.needsUpdate = true; return t
}

const cellsOrder = []
for (let r = K.n - 1; r >= 0; r--) for (let c = 0; c < K.n; c++) cellsOrder.push([c, r])
const MAXH = K.cell - .012, MAXD = .372, MAXW = K.cell - .014
const boxes = [], hitTargets = [], catCells = {}
let boxesReady = false

async function buildBoxes() {
  // نحمّل الأغلفة أول عشان نعرف اتجاه كل علبة (طولي ولا عرضي)
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))])
  let done = 0
  const items = await Promise.all(GAMES.map(async g => {
    const rb = realBox(g)
    let img = await withTimeout(loadImage(proxy(rb?.front || g.img, 700)), 15000)
    if (!img && rb?.front) img = await withTimeout(loadImage(proxy(g.img, 512)), 8000)
    done++; $('bar').style.width = `${Math.round(60 + done / GAMES.length * 40)}%`
    const size = rb || fallbackSize(g)
    const portrait = img ? img.height > img.width * 1.04 : false
    // x = عرض الغلاف، z = طول الغلاف، y = سماكة العلبة
    let sx = portrait ? size.W : size.L, sz = portrait ? size.L : size.W
    const sy = size.D
    // إذا ما دخلت المربع بالطول، ندوّرها؛ وإذا ما دخلت أبداً نصغّرها شوي
    let rot = 0
    if (sx > MAXW || sz > MAXD) {
      if (sz <= MAXW && sx <= MAXD) rot = Math.PI / 2
      else { const k = Math.min(MAXW / Math.min(sx, sz), MAXD / Math.max(sx, sz), 1); sx *= k; sz *= k; if (sx > sz) rot = Math.PI / 2 }
    }
    const fw = rot ? sz : sx, fd = rot ? sx : sz
    return { g, rb, img, s: { w: sx, h: sy, d: sz }, rot, fw, fd }
  }))

  // الرص: كل تصنيف يبدأ بمربع؛ العلب نايمة فوق بعض، الأصغر فوق الأكبر
  let ci = 0
  for (const cat of ORDER) {
    const list = items.filter(it => it.g.c === cat).sort((a, b) => b.fw * b.fd - a.fw * a.fd || b.s.h - a.s.h)
    let cell = null, cols = []
    const newCell = () => { cell = cellOf(...cellsOrder[ci++]); cols = []; cell.cols = cols; (catCells[cat] ||= []).push(cell) }
    for (const it of list) {
      if (!cell) newCell()
      let col = cols.find(c => { const top = c.items[c.items.length - 1]; return it.fw <= top.fw + .004 && it.fd <= top.fd + .004 && c.h + it.s.h <= MAXH })
      if (!col) {
        const usedW = cols.reduce((a, c) => a + c.w + .01, 0)
        if (usedW + it.fw > K.cell - .01) newCell()
        col = { w: it.fw, h: 0, items: [] }; cols.push(col)
      }
      it.y0 = col.h; it.idx = col.items.length; col.h += it.s.h; col.items.push(it); it.col = col; it.cell = cell
    }
    for (const cl of catCells[cat]) {
      const total = cl.cols.reduce((a, c) => a + c.w, 0) + (cl.cols.length - 1) * .01
      let x = cl.x - total / 2
      for (const c of cl.cols) { c.x = x + c.w / 2; x += c.w + .01 }
    }
  }

  for (const it of items) {
    const { g, img, s, rot, rb } = it
    const box = { g, s, cell: it.cell, col: it.col, idx: it.idx, fd: it.fd }
    const print = (map, rough = .42) => new THREE.MeshStandardMaterial({ map, roughness: rough, envMapIntensity: .55 })
    const top = img ? print(imgTexture(img)) : new THREE.MeshStandardMaterial({ color: CATS[g.c][1], roughness: .45 })
    const bottom = new THREE.MeshStandardMaterial({ color: '#d9d2c7', roughness: .6, envMapIntensity: .4 })
    // [px, nx, py, ny, pz, nz]  — z+ = الحافة السفلية للغلاف
    const mats = [
      print(sideCanvas(g, img, 'right', s.d, s.h)), print(sideCanvas(g, img, 'left', s.d, s.h)),
      top, bottom,
      print(sideCanvas(g, img, 'bottom', s.w, s.h)), print(sideCanvas(g, img, 'top', s.w, s.h)),
    ]
    const lid = mesh(new RoundedBoxGeometry(s.w, s.h, s.d, 2, Math.min(.0022, s.h * .08)), mats)
    const grp = new THREE.Group(); grp.add(lid)
    const base = mesh(new THREE.BoxGeometry(s.w - .005, s.h - .004, s.d - .005), M.boxIn); base.visible = false; grp.add(base)
    grp.rotation.y = rot
    grp.position.set(it.col.x, it.cell.y + it.y0 + s.h / 2, KF - it.fd / 2 - .014)
    shelf.add(grp)
    Object.assign(box, { grp, lid, base, home: grp.position.clone(), homeQ: grp.quaternion.clone() })
    lid.userData.box = box
    hitTargets.push(lid); boxes.push(box); it.box = box
    // الظهر الخلفي للعلبة (يتحمّل بعدين)
    if (rb?.back) loadImage(proxy(rb.back, 700)).then(bi => { if (bi) { bottom.map = imgTexture(bi, Math.PI); bottom.color.set('#ffffff'); bottom.needsUpdate = true } })
  }
  for (const it of items) it.box.colItems = it.col.items.map(x => x.box)
  addLabels()
  boxesReady = true
}

// لما نسحب علبة من نص الكومة، اللي فوقها تنزل؛ ولما ترجع ترتفع
function shiftAbove(p, dir, dur = .35) {
  const above = p.colItems.filter(q => q.idx > p.idx && q !== current)
  for (const q of above) {
    const y0 = q.grp.position.y, y1 = q.home.y + (dir < 0 ? -p.s.h : 0)
    animate(dur, k => { q.grp.position.y = y0 + (y1 - y0) * ease(k) })
  }
}

// لوحات التصنيف: بطاقة صغيرة على حافة الرف تحت أول مربع
function labelTexture(text, color) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96
  const x = cv.getContext('2d')
  x.fillStyle = '#f7f2ea'; x.beginPath(); x.roundRect(0, 0, 512, 96, 18); x.fill()
  x.fillStyle = color; x.beginPath(); x.arc(470, 48, 12, 0, Math.PI * 2); x.fill()
  x.fillStyle = '#2b2620'; x.font = '600 40px Alexandria, system-ui, sans-serif'; x.textAlign = 'right'; x.textBaseline = 'middle'; x.direction = 'rtl'
  x.fillText(text, 440, 50)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t
}
const cellHits = []
function addLabels() {
for (const [cat, cells] of Object.entries(catCells)) {
  const c0 = cells[0]
  const lab = mesh(new THREE.PlaneGeometry(.2, .0375), new THREE.MeshStandardMaterial({ map: labelTexture(CATS[cat][0], CATS[cat][1]), roughness: .6, transparent: true }), { cast: false })
  add(shelf, lab, c0.x, c0.y - K.t / 2, KF + .0015)
}
}
for (let r = 0; r < K.n; r++) for (let c = 0; c < K.n; c++) {
  const cl = cellOf(c, r)
  const h = new THREE.Mesh(new THREE.PlaneGeometry(K.cell, K.cell), new THREE.MeshBasicMaterial({ visible: false }))
  h.position.set(cl.x, cl.y + K.cell / 2, KF + .004); h.userData.cell = [c, r]
  shelf.add(h); cellHits.push(h)
}

// ---------- الطاولة ----------
const TB = { x: 1.05, z: .55, h: .75, w: 1.5, d: .86 }
const tableG = new THREE.Group(); tableG.position.set(TB.x, 0, TB.z); scene.add(tableG)
const rug = mesh(new THREE.BoxGeometry(2.6, .008, 1.9), M.rug, { cast: false }); add(tableG, rug, 0, .004, 0)
add(tableG, mesh(new RoundedBoxGeometry(TB.w, .04, TB.d, 3, .012), M.walnut), 0, TB.h - .02, 0)
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const leg = mesh(new THREE.CylinderGeometry(.022, .016, TB.h - .04, 16), M.walnut)
  leg.rotation.z = sx * .06; leg.rotation.x = -sz * .06
  add(tableG, leg, sx * (TB.w / 2 - .12), (TB.h - .04) / 2, sz * (TB.d / 2 - .1))
}
const mat = mesh(new RoundedBoxGeometry(1.12, .006, .68, 2, .003), M.felt, { cast: false })
add(tableG, mat, -.08, TB.h + .003, 0)
const TOP = TB.h + .006

// كرسيين بسيطة
function chair(x, z, rot) {
  const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = rot; scene.add(ch)
  add(ch, mesh(new RoundedBoxGeometry(.44, .04, .42, 3, .015), M.walnut), 0, .45, 0)
  add(ch, mesh(new RoundedBoxGeometry(.44, .28, .03, 3, .012), M.walnut), 0, .7, -.2)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(ch, mesh(new THREE.CylinderGeometry(.015, .012, .45, 10), M.walnut), sx * .18, .225, sz * .17)
}
chair(TB.x, TB.z - .72, 0)
chair(TB.x + .25, TB.z + .78, Math.PI)

// ---------- الإضاءة ----------
scene.add(new THREE.HemisphereLight('#fff4e6', '#5a4632', .55))
const fill = new THREE.DirectionalLight('#dfe6ff', .55); fill.position.set(-2, 2.5, 3); scene.add(fill)
// لمبة معلّقة فوق الطاولة
const LAMP = new THREE.Vector3(TB.x - .08, 1.62, TB.z - .12)
add(scene, mesh(new THREE.CylinderGeometry(.003, .003, ROOM.h - LAMP.y, 6), M.metal, { cast: false }), LAMP.x, (ROOM.h + LAMP.y) / 2, LAMP.z)
const shadeMat = new THREE.MeshStandardMaterial({ color: '#f0ebe3', roughness: .6, side: THREE.DoubleSide, envMapIntensity: .3 })
const shade = mesh(new THREE.CylinderGeometry(.06, .2, .16, 40, 1, true), shadeMat, { cast: false }); add(scene, shade, LAMP.x, LAMP.y, LAMP.z)
const bulb = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3d6' })); add(scene, bulb, LAMP.x, LAMP.y - .05, LAMP.z)
const lamp = new THREE.SpotLight('#ffd9a8', 9, 4, .95, .75, 1.6)
lamp.position.copy(LAMP).y -= .06
lamp.target.position.set(LAMP.x, 0, LAMP.z); scene.add(lamp, lamp.target)
lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.radius = 6; lamp.shadow.bias = -.0004; lamp.shadow.camera.near = .2; lamp.shadow.camera.far = 3
// إضاءة السقف على الدولاب
const shelfLight = new THREE.SpotLight('#fff1dc', 7, 6, .55, .9, 1.4)
shelfLight.position.set(shelf.position.x + .2, ROOM.h - .05, .9)
shelfLight.target.position.set(shelf.position.x, .8, WALL_Z + .1); scene.add(shelfLight, shelfLight.target)
shelfLight.castShadow = true; shelfLight.shadow.mapSize.set(1024, 1024); shelfLight.shadow.radius = 5; shelfLight.shadow.bias = -.0005; shelfLight.shadow.camera.near = .5; shelfLight.shadow.camera.far = 5
// ضوء دافي خفيف داخل الدولاب (كأنه شريط LED)
const strip = new THREE.PointLight('#ffcf9a', .6, 2.2, 2); strip.position.set(shelf.position.x, 1.3, WALL_Z + .7); scene.add(strip)

// ---------- اللوح (ينفتح نصّين) ----------
const BOARD = { w: .62, d: .44 }
const boardG = new THREE.Group(); boardG.position.set(TB.x - .16, TOP + .003, TB.z); boardG.visible = false; scene.add(boardG)
const boardMatR = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .55, envMapIntensity: .3 })
const boardMatL = boardMatR.clone()
const boardBack = new THREE.MeshStandardMaterial({ color: '#23284f', roughness: .6 })
const halfGeo = new THREE.BoxGeometry(BOARD.w / 2, .004, BOARD.d)
const right = mesh(halfGeo, [boardBack, boardBack, boardMatR, boardBack, boardBack, boardBack]); right.position.x = BOARD.w / 4; boardG.add(right)
const hinge = new THREE.Group(); boardG.add(hinge)
const left = mesh(halfGeo, [boardBack, boardBack, boardMatL, boardBack, boardBack, boardBack]); left.position.x = -BOARD.w / 4; hinge.add(left)
let boardTex = null
async function setBoardImage(url) {
  const img = await loadImage(proxy(url, 1024))
  if (!img) return
  boardTex?.dispose()
  const mk = (off) => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.repeat.set(.5, 1); t.offset.set(off, 0); t.needsUpdate = true; return t }
  // نقص الصورة على نسبة اللوح
  const ar = img.width / img.height, br = BOARD.w / BOARD.d
  const L = mk(0), R = mk(.5)
  for (const t of [L, R]) {
    if (ar > br) { const k = br / ar; t.repeat.x = .5 * k; t.offset.x = (1 - k) / 2 + (t === R ? .5 * k : 0) } else { const k = ar / br; t.repeat.y = k; t.offset.y = (1 - k) / 2 }
  }
  boardMatL.map = L; boardMatR.map = R; boardMatL.needsUpdate = boardMatR.needsUpdate = true
  boardTex = L
}

// ---------- الكاميرا ----------
const target = new THREE.Vector3()
const camState = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() }
function hfovFit(width, height) {
  const v = THREE.MathUtils.degToRad(camera.fov)
  const h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect)
  return Math.max((width / 2) / Math.tan(h / 2), (height / 2) / Math.tan(v / 2))
}
const SX = shelf.position.x, SZF = shelf.position.z + KF
const views = {
  overview() {
    const d = hfovFit(K.W * 1.12, K.W * 1.5)
    return { pos: new THREE.Vector3(SX + .35, .95, SZF + d), tgt: new THREE.Vector3(SX + .1, .78, SZF) }
  },
  cell(c, r) {
    const cl = cellOf(c, r)
    const d = hfovFit(K.cell * 1.32, K.cell * 1.6)
    const wy = shelf.position.y + cl.y + K.cell / 2
    return { pos: new THREE.Vector3(SX + cl.x + .02, wy + .06, SZF + d), tgt: new THREE.Vector3(SX + cl.x, wy - .01, SZF) }
  },
  table(w = BOARD.w * 1.5 + .25, dd = BOARD.d * 2.4, cx = TB.x - .04) {
    const d = hfovFit(w, dd)
    const t = new THREE.Vector3(cx, TOP, TB.z - .02)
    // ننزل نقطة النظر شوي لتحت عشان اللوح يطلع فوق البطاقة
    return { pos: new THREE.Vector3(t.x + .1, t.y + d * .72, t.z + d * .72), tgt: t.clone().add(new THREE.Vector3(0, 0, .26)) }
  },
}
let tween = null
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
function flyTo(v, dur = 1.4) {
  if (reduce) dur = .01
  tween = { from: { pos: camState.pos.clone(), tgt: camState.tgt.clone() }, to: v, t: 0, dur }
}

// حركات عامة (علبة، لوح...)
const anims = []
function animate(dur, fn, done) { anims.push({ t: 0, dur: reduce ? .01 : dur, fn, done }) }

// ---------- الحالات ----------
let state = 'overview', curCell = null, current = null, busy = false
const where = $('where'), backBtn = $('back'), hint = $('hint'), sheet = $('sheet')
function catOfCell(cell) { const b = cell && boxes.find(p => p.cell.c === cell[0] && p.cell.r === cell[1]); return b ? CATS[b.g.c][0] : null }
function ui() {
  backBtn.hidden = state === 'overview'
  where.innerHTML = state === 'overview' ? 'الدولاب' : state === 'cell' ? (catOfCell(curCell) || 'مربع فاضي') : 'على الطاولة'
  hint.textContent = state === 'overview' ? 'اضغط على أي مربع في الدولاب' : 'اضغط على علبة عشان تطلّعها للطاولة'
  hint.classList.toggle('off', state === 'table')
}
function goOverview() { state = 'overview'; curCell = null; flyTo(views.overview()); ui() }
function goCell(c, r) { state = 'cell'; curCell = [c, r]; flyTo(views.cell(c, r), 1.2); ui() }

// العلبة: من الرف -> تنسحب -> تطير للطاولة وتنحط وغلافها لفوق -> الغطا ينشال -> اللوح ينفتح
const tmpQ = new THREE.Quaternion()
function worldPoseOnShelf(p) {
  const pos = p.home.clone(); shelf.localToWorld(pos)
  return { pos, quat: new THREE.Quaternion() }
}
function pickBox(p) {
  if (busy) return
  if (state === 'overview') { goCell(p.cell.c, p.cell.r); return }
  if (state !== 'cell') return
  busy = true; current = p
  // ننقل العلبة من الدولاب للمشهد (بنفس مكانها)
  const start = worldPoseOnShelf(p)
  scene.attach(p.grp)
  const startQ = p.grp.quaternion.clone()
  const pulled = start.pos.clone().add(new THREE.Vector3(0, .004, p.fd * .75))
  animate(.45, k => { p.grp.position.lerpVectors(start.pos, pulled, ease(k)) }, () => {
    shiftAbove(p, -1)
    const end = new THREE.Vector3(TB.x + .36, TOP + p.s.h / 2 + .002, TB.z + .05)
    const endQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -.35, 0))
    const from = pulled.clone()
    flyTo(views.table(), 1.5)
    animate(1.5, k => {
      const e = ease(k)
      p.grp.position.lerpVectors(from, end, e)
      p.grp.position.y += Math.sin(Math.PI * e) * .35
      tmpQ.copy(startQ).slerp(endQ, e); p.grp.quaternion.copy(tmpQ)
      p.grp.rotation.x += Math.sin(Math.PI * e) * .25
    }, () => {
      state = 'table'; ui()
      openBox(p)
    })
  })
}
function openBox(p) {
  // الغطا ينشال ويتحط جنب العلبة
  p.base.visible = true
  const lid = p.lid
  const l0 = lid.position.clone()
  const l1 = new THREE.Vector3(.0, p.s.h * .5 + .002, -p.s.d - .03)
  animate(.7, k => {
    const e = ease(k)
    lid.position.lerpVectors(l0, l1, e)
    lid.position.y += Math.sin(Math.PI * e) * .12
    lid.rotation.x = -Math.sin(Math.PI * Math.min(1, e * 1.2)) * .25
  }, () => unfoldBoard(p))
}
function unfoldBoard(p) {
  const imgs = p.g.setup.length ? p.g.setup : [p.g.img]
  setBoardImage(imgs[0])
  boardG.visible = true
  const startPos = p.grp.position.clone().setY(TOP + p.s.h + .004)
  const endPos = new THREE.Vector3(TB.x - .2, TOP + .003, TB.z + .02)
  boardG.position.copy(startPos); boardG.scale.setScalar(.45); hinge.rotation.z = -Math.PI * .98
  animate(.6, k => {
    const e = ease(k)
    boardG.position.lerpVectors(startPos, endPos, e); boardG.position.y += Math.sin(Math.PI * e) * .06
    boardG.scale.setScalar(.45 + .55 * e)
  }, () => {
    animate(.8, k => { hinge.rotation.z = -Math.PI * .98 * (1 - ease(k)) }, () => {
      fillSheet(p.g, imgs); sheet.classList.add('on'); busy = false; orbit.on = true
    })
  })
}
function toShelf() {
  if (busy || state !== 'table' || !current) return
  busy = true
  sheet.classList.remove('on')
  const p = current
  orbit.on = false
  animate(.6, k => { hinge.rotation.z = -Math.PI * .98 * ease(k) }, () => {
    const s0 = boardG.position.clone(), s1 = p.grp.position.clone().setY(TOP + p.s.h + .01)
    animate(.45, k => { const e = ease(k); boardG.position.lerpVectors(s0, s1, e); boardG.scale.setScalar(1 - .55 * e) }, () => {
      boardG.visible = false
      closeBox(p)
    })
  })
}
function closeBox(p) {
  const lid = p.lid, l0 = lid.position.clone(), l1 = new THREE.Vector3(0, 0, 0)
  animate(.55, k => { const e = ease(k); lid.position.lerpVectors(l0, l1, e); lid.position.y += Math.sin(Math.PI * e) * .1; lid.rotation.x = 0 }, () => {
    p.base.visible = false
    const from = p.grp.position.clone(), fromQ = p.grp.quaternion.clone()
    const home = p.home.clone(); shelf.localToWorld(home)
    const pulled = home.clone().add(new THREE.Vector3(0, .004, p.fd * .75))
    goCell(p.cell.c, p.cell.r)
    animate(1.3, k => {
      const e = ease(k)
      p.grp.position.lerpVectors(from, pulled, e); p.grp.position.y += Math.sin(Math.PI * e) * .3
      p.grp.quaternion.copy(fromQ).slerp(p.homeQ, e)
    }, () => {
      shiftAbove(p, 1, .3)
      animate(.4, k => p.grp.position.lerpVectors(pulled, home, ease(k)), () => {
        shelf.attach(p.grp); p.grp.position.copy(p.home); p.grp.quaternion.copy(p.homeQ)
        current = null; busy = false
      })
    })
  })
}

// ---------- الدوران حول اللوح ----------
const orbit = { on: false, drag: null }
const sph = new THREE.Spherical()
renderer.domElement.addEventListener('pointerdown', e => { if (orbit.on && !tween) orbit.drag = { x: e.clientX, y: e.clientY } })
addEventListener('pointerup', () => { orbit.drag = null })
renderer.domElement.addEventListener('pointermove', e => {
  if (!orbit.on || !orbit.drag || tween || pinch0) return
  const dx = e.clientX - orbit.drag.x, dy = e.clientY - orbit.drag.y
  orbit.drag = { x: e.clientX, y: e.clientY }
  sph.setFromVector3(camState.pos.clone().sub(camState.tgt))
  sph.theta -= dx * .008
  sph.phi = THREE.MathUtils.clamp(sph.phi - dy * .006, .25, 1.2)
  camState.pos.copy(camState.tgt).add(new THREE.Vector3().setFromSpherical(sph))
})
// تكبير بإصبعين
const touches = new Map()
let pinch0 = null
renderer.domElement.addEventListener('pointerdown', e => { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2) { orbit.drag = null; const [a, b] = [...touches.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), r: camState.pos.distanceTo(camState.tgt) } } })
renderer.domElement.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (orbit.on && pinch0 && touches.size === 2) {
    const [a, b] = [...touches.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    sph.setFromVector3(camState.pos.clone().sub(camState.tgt))
    sph.radius = THREE.MathUtils.clamp(pinch0.r * pinch0.d / d, .3, 1.6)
    camState.pos.copy(camState.tgt).add(new THREE.Vector3().setFromSpherical(sph))
  }
})
const endTouch = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = null }
addEventListener('pointerup', endTouch); addEventListener('pointercancel', endTouch)
renderer.domElement.addEventListener('wheel', e => {
  if (!orbit.on) return
  sph.setFromVector3(camState.pos.clone().sub(camState.tgt))
  sph.radius = THREE.MathUtils.clamp(sph.radius * (1 + e.deltaY * .001), .35, 1.6)
  camState.pos.copy(camState.tgt).add(new THREE.Vector3().setFromSpherical(sph))
}, { passive: true })

// ---------- البطاقة ----------
function fillSheet(g, imgs) {
  $('sName').textContent = g.n
  $('sCat').innerHTML = `<i style="--t:${CATS[g.c][1]}"></i>${CATS[g.c][0]}`
  const range = (a, b) => (b && b !== a ? `⁦${a}–${b}⁩` : a)
  const lvl = g.w < 1.8 ? 'سهلة' : g.w < 2.5 ? 'متوسطة' : g.w < 3.3 ? 'متقدمة' : 'صعبة'
  $('facts').innerHTML = `<div><span>اللاعبين</span><b>${range(g.p[0], g.p[1])}</b></div><div><span>المدة</span><b>${range(g.t[0], g.t[1])} د</b></div><div><span>الصعوبة</span><b>${lvl}</b></div>`
  const th = $('thumbs'); th.innerHTML = ''
  if (imgs.length > 1) imgs.forEach((u, i) => {
    const b = document.createElement('button'); b.style.backgroundImage = `url("${proxy(u, 160)}")`; b.className = i ? '' : 'on'
    b.setAttribute('aria-label', `صورة اللوح ${i + 1}`)
    b.onclick = () => { setBoardImage(u); [...th.children].forEach((x, j) => (x.className = j === i ? 'on' : '')) }
    th.appendChild(b)
  })
}
$('toShelf').onclick = toShelf
backBtn.onclick = () => (state === 'table' ? toShelf() : state === 'cell' ? goOverview() : null)
$('log').onclick = () => { location.href = '../#/log' }

// ---------- اللمس ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
let down = null
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY } })
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  if (state === 'table') return
  const hb = ray.intersectObjects(hitTargets, false)[0]
  if (hb && state === 'cell') { pickBox(hb.object.userData.box); return }
  const hc = ray.intersectObjects(cellHits, false)[0]
  if (hc && !busy) {
    const [c, r] = hc.object.userData.cell
    if (state === 'overview' || (curCell && (curCell[0] !== c || curCell[1] !== r))) goCell(c, r)
    else if (hb) pickBox(hb.object.userData.box)
  }
})

// ---------- الحلقة ----------
const clock = new THREE.Clock()
function frame() {
  const dt = Math.min(.05, clock.getDelta())
  if (tween) {
    tween.t += dt / tween.dur
    const k = ease(Math.min(1, tween.t))
    camState.pos.lerpVectors(tween.from.pos, tween.to.pos, k)
    camState.tgt.lerpVectors(tween.from.tgt, tween.to.tgt, k)
    if (tween.t >= 1) tween = null
  }
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i]; a.t += dt / a.dur
    a.fn(Math.min(1, a.t))
    if (a.t >= 1) { anims.splice(i, 1); a.done?.() }
  }
  camera.position.copy(camState.pos); camera.lookAt(camState.tgt)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  if (!tween) { const v = state === 'overview' ? views.overview() : state === 'cell' ? views.cell(...curCell) : views.table(); camState.pos.copy(v.pos); camState.tgt.copy(v.tgt) }
}
addEventListener('resize', resize)
// لقطة بداية: من باب الغرفة
camState.pos.set(1.6, 1.5, 3.6); camState.tgt.set(-.3, .8, -.6)
function intro() { flyTo(views.overview(), 2.2) }
ui(); frame()
buildBoxes().then(maybeStart)
window.__room = { orbitBy: (dx, dy) => { sph.setFromVector3(camState.pos.clone().sub(camState.tgt)); sph.theta -= dx; sph.phi = THREE.MathUtils.clamp(sph.phi - dy, .25, 1.2); camState.pos.copy(camState.tgt).add(new THREE.Vector3().setFromSpherical(sph)) }, goCell, goOverview, toShelf, pick: n => pickBox(boxes.find(b => b.g.n === n) || boxes.find(b => b.g.n.includes(n))), boxes, get state() { return state } }
void target
