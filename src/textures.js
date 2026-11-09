import * as THREE from 'three'

function canvas(width, height) {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

function grain(ctx, w, h, amount = 1200, alpha = 0.16) {
  for (let i = 0; i < amount; i++) {
    const v = Math.random() * 255 | 0
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
}

function rivet(ctx, x, y, r = 3) {
  ctx.fillStyle = '#050608'
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,235,200,.14)'
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill()
}

export function makeFloorTexture(accent = '#e2b567') {
  const w = 1024, h = 1024
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  const cx = w / 2, cy = h / 2

  ctx.fillStyle = '#0b0e12'
  ctx.fillRect(0, 0, w, h)

  // radial deck plates
  const wedges = 16
  for (let i = 0; i < wedges; i++) {
    const a0 = (i / wedges) * Math.PI * 2
    const a1 = ((i + 1) / wedges) * Math.PI * 2
    const tone = 18 + (i % 3) * 5 + (i % 2) * 4
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, 500, a0, a1)
    ctx.closePath()
    ctx.fillStyle = `rgb(${tone},${tone + 2},${tone + 5})`
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,.6)'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // concentric grooves
  for (const r of [128, 240, 358, 470]) {
    ctx.strokeStyle = 'rgba(0,0,0,.65)'
    ctx.lineWidth = 7
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,240,210,.055)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.stroke()
  }

  // radial seams + rivets
  for (let i = 0; i < wedges; i++) {
    const a = (i / wedges) * Math.PI * 2
    ctx.strokeStyle = 'rgba(0,0,0,.55)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90)
    ctx.lineTo(cx + Math.cos(a) * 500, cy + Math.sin(a) * 500)
    ctx.stroke()
    for (let r = 165; r < 500; r += 72) {
      rivet(ctx, cx + Math.cos(a + 0.05) * r, cy + Math.sin(a + 0.05) * r, 2.6)
    }
  }

  // central occult sigil
  ctx.save()
  ctx.translate(cx, cy)
  const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, 220)
  aura.addColorStop(0, 'rgba(255,255,255,.06)')
  aura.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = aura
  ctx.beginPath(); ctx.arc(0, 0, 220, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, 176, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, 142, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 2.5
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 142, Math.sin(a) * 142)
    ctx.lineTo(Math.cos(a) * 176, Math.sin(a) * 176)
    ctx.stroke()
  }
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5
    const x = Math.cos(a) * 118, y = Math.sin(a) * 118
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.globalAlpha = 0.95
  ctx.fillStyle = accent
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // hazard band at edge
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.35)
  ctx.globalAlpha = 0.34
  ctx.fillStyle = '#e2b567'
  for (let x = -720; x < 720; x += 56) {
    ctx.beginPath()
    ctx.rect(x, 476, 22, 34)
    ctx.fill()
  }
  ctx.restore()

  // scratches and grime
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(255,235,205,${Math.random() * 0.045})`
    ctx.lineWidth = Math.random() * 1.6
    const x = Math.random() * w, y = Math.random() * h
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 90)
    ctx.stroke()
  }
  grain(ctx, w, h, 2500, 0.11)

  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export function makeWallTexture() {
  const w = 512, h = 1024
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#11151a'
  ctx.fillRect(0, 0, w, h)

  // large plates
  for (let row = 0; row < 4; row++) {
    const y = row * 256
    ctx.fillStyle = row % 2 ? 'rgba(255,255,255,.018)' : 'rgba(0,0,0,.1)'
    ctx.fillRect(0, y, w, 256)
    ctx.strokeStyle = 'rgba(0,0,0,.7)'
    ctx.lineWidth = 8
    ctx.strokeRect(-4, y, w + 8, 256)
    ctx.strokeStyle = 'rgba(255,240,210,.04)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, y + 8); ctx.lineTo(w, y + 8); ctx.stroke()
    for (let x = 12; x < w; x += 46) {
      rivet(ctx, x, y + 18, 3)
      rivet(ctx, x, y + 238, 3)
    }
  }

  // vertical seams
  for (let x = 0; x < w; x += 128) {
    ctx.strokeStyle = 'rgba(0,0,0,.55)'
    ctx.lineWidth = 9
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,240,210,.045)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x + 6, 0); ctx.lineTo(x + 6, h); ctx.stroke()
  }

  // rust / damp streaks
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const len = 40 + Math.random() * 240
    const g = ctx.createLinearGradient(x, y, x, y + len)
    const warm = 60 + Math.random() * 30
    g.addColorStop(0, `rgba(${warm + 30},${warm * 0.55},${warm * 0.25},${Math.random() * 0.14})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x, y, 1 + Math.random() * 8, len)
  }

  // diagonal grime
  ctx.globalAlpha = 0.12
  ctx.strokeStyle = '#000'
  for (let i = 0; i < 28; i++) {
    ctx.lineWidth = 4 + Math.random() * 16
    ctx.beginPath()
    ctx.moveTo(-50, Math.random() * h)
    ctx.lineTo(w + 50, Math.random() * h)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  grain(ctx, w, h, 1800, 0.13)

  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 8)
  texture.anisotropy = 8
  return texture
}

export function makeSign() {
  const w = 1024, h = 512
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  function update({ levelRoman = 'I', floor = 1, name = 'THE RUSTED FOUNDRY', accent = '#e2b567', boss = false }) {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(3,5,8,.92)'
    ctx.fillRect(0, 0, w, h)

    const glow = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, 430)
    glow.addColorStop(0, boss ? 'rgba(255,40,60,.16)' : 'rgba(226,181,103,.12)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.48
    ctx.lineWidth = 3
    ctx.strokeRect(22, 22, w - 44, h - 44)
    ctx.globalAlpha = 0.2
    ctx.strokeRect(36, 36, w - 72, h - 72)
    ctx.globalAlpha = 1

    // corner ticks
    ctx.strokeStyle = accent
    ctx.lineWidth = 5
    for (const [x, y, dx, dy] of [[22, 22, 1, 1], [w - 22, 22, -1, 1], [22, h - 22, 1, -1], [w - 22, h - 22, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + dy * 42); ctx.lineTo(x, y); ctx.lineTo(x + dx * 42, y); ctx.stroke()
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = accent
    ctx.font = '600 27px ui-monospace, Menlo, Consolas, monospace'
    ctx.letterSpacing = '13px'
    ctx.fillText(`STRATUM ${levelRoman}`, w / 2, 108)
    ctx.letterSpacing = '0px'

    ctx.fillStyle = '#f0eadb'
    ctx.font = '400 168px Georgia, serif'
    ctx.fillText(`-${String(floor).padStart(2, '0')}`, w / 2, 288)

    ctx.fillStyle = boss ? '#ff596e' : accent
    ctx.globalAlpha = 0.85
    ctx.font = '600 26px ui-monospace, Menlo, Consolas, monospace'
    ctx.letterSpacing = '10px'
    ctx.fillText(name, w / 2, 358)
    ctx.letterSpacing = '0px'
    ctx.globalAlpha = 1

    // floor pips
    const pipW = 58, gap = 12, total = 10 * pipW + 9 * gap
    let x = (w - total) / 2
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i < floor ? accent : 'rgba(255,255,255,.12)'
      ctx.globalAlpha = i + 1 === floor ? 1 : 0.7
      ctx.fillRect(x, 410, pipW, 6)
      x += pipW + gap
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = 'rgba(233,227,211,.4)'
    ctx.font = '500 17px ui-monospace, Menlo, Consolas, monospace'
    ctx.letterSpacing = '8px'
    ctx.fillText(boss ? 'THE WARDEN WAITS' : 'DESCEND TO PURGE', w / 2, 462)
    ctx.letterSpacing = '0px'

    texture.needsUpdate = true
  }

  return { texture, update }
}

export function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const size = 128
  const c = canvas(size, size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.32, inner.replace(/[\d.]+\)$/, '0.55)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function makeSigilTexture(accent = '#ff3d50') {
  const size = 512
  const c = canvas(size, size)
  const ctx = c.getContext('2d')
  const cx = size / 2, cy = size / 2
  ctx.translate(cx, cy)
  ctx.strokeStyle = accent
  ctx.globalAlpha = 1
  ctx.lineWidth = 4
  for (const r of [230, 188, 154]) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.lineWidth = 3
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 154, Math.sin(a) * 154)
    ctx.lineTo(Math.cos(a) * 188, Math.sin(a) * 188)
    ctx.stroke()
  }
  ctx.beginPath()
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i * 6 * Math.PI) / 7
    const x = Math.cos(a) * 140, y = Math.sin(a) * 140
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 2
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 195, Math.sin(a) * 195)
    ctx.lineTo(Math.cos(a) * 226, Math.sin(a) * 226)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
