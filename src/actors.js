import * as THREE from 'three'

const SKIN = 0xc7a37a

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.12, ...opts })
}

function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  if (parent) parent.add(m)
  return m
}

function glowSprite(texture, color, size, opacity = 0.8) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(size, size, 1)
  return sprite
}

// ---------------------------------------------------------------- hunter
export function createHunter(glowTexture) {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const leather = mat(0x252c35, { roughness: 0.78, metalness: 0.08 })
  const leatherDark = mat(0x12171d, { roughness: 0.82 })
  const cloth = mat(0x5b1d26, { roughness: 0.9 })
  const metal = mat(0x60646a, { metalness: 0.85, roughness: 0.33 })
  const skin = mat(SKIN, { roughness: 0.85 })

  const coat = mesh(new THREE.CylinderGeometry(0.34, 0.54, 1.08, 10), leather, 0, 1.16, 0, body)
  coat.scale.z = 0.82
  mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 10), leatherDark, 0, 0.64, 0, body)
  // chest rig
  mesh(new THREE.BoxGeometry(0.5, 0.44, 0.34), leatherDark, 0, 1.52, 0.02, body)
  const strapL = mesh(new THREE.BoxGeometry(0.07, 0.56, 0.05), cloth, -0.18, 1.53, 0.19, body)
  strapL.rotation.z = 0.42
  const strapR = mesh(new THREE.BoxGeometry(0.07, 0.56, 0.05), cloth, 0.18, 1.53, 0.19, body)
  strapR.rotation.z = -0.42
  mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), metal, 0, 1.44, 0.25, body)

  // shoulder mantle
  const mantle = mesh(new THREE.CylinderGeometry(0.52, 0.34, 0.25, 10, 1, true), leatherDark, 0, 1.68, 0, body)
  mantle.scale.z = 0.85
  // scarf
  mesh(new THREE.TorusGeometry(0.245, 0.07, 6, 12), cloth, 0, 1.82, 0, body).rotation.x = Math.PI / 2

  // head + hat
  const head = mesh(new THREE.SphereGeometry(0.225, 12, 10), skin, 0, 2.0, 0.01, body)
  head.scale.set(0.9, 1.05, 0.9)
  mesh(new THREE.SphereGeometry(0.035, 6, 6), mat(0x161616), -0.08, 2.02, 0.19, body)
  mesh(new THREE.SphereGeometry(0.035, 6, 6), mat(0x161616), 0.08, 2.02, 0.19, body)
  const brim = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.035, 16), leatherDark, 0, 2.16, 0, body)
  brim.rotation.z = 0.035
  const crown = mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.34, 12), leatherDark, 0, 2.32, 0, body)
  crown.rotation.z = 0.035
  mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.045, 12), cloth, 0, 2.16, 0, body)
  // coat tails
  for (let i = -1; i <= 1; i++) {
    const tail = mesh(new THREE.BoxGeometry(0.22, 0.78, 0.06), leather, i * 0.2, 0.7, -0.35, body)
    tail.rotation.x = -0.16
    tail.rotation.z = i * 0.08
  }

  // legs
  const legs = []
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.2, 0.78, 0)
    body.add(pivot)
    const thigh = mesh(new THREE.BoxGeometry(0.2, 0.62, 0.23), leatherDark, 0, -0.3, 0, pivot)
    thigh.scale.z = 0.9
    const boot = mesh(new THREE.BoxGeometry(0.24, 0.28, 0.38), mat(0x0c0e11, { roughness: 0.66, metalness: 0.35 }), 0, -0.72, 0.06, pivot)
    boot.rotation.x = 0.06
    legs.push({ pivot, side })
  }

  // arms
  const arms = []
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.46, 1.6, 0)
    body.add(pivot)
    const upper = mesh(new THREE.BoxGeometry(0.17, 0.46, 0.2), leather, 0, -0.19, 0, pivot)
    upper.rotation.x = 0.2
    const forearm = mesh(new THREE.BoxGeometry(0.15, 0.38, 0.17), leatherDark, side * 0.02, -0.5, 0.19, pivot)
    forearm.rotation.x = -0.9
    const glove = mesh(new THREE.SphereGeometry(0.11, 8, 8), mat(0x191c20, { roughness: 0.8 }), side * 0.03, -0.56, 0.4, pivot)
    arms.push({ pivot, side, glove })
  }

  // revolver held at chest height, pointing +Z
  const gun = new THREE.Group()
  gun.position.set(0.05, 1.34, 0.3)
  body.add(gun)
  mesh(new THREE.BoxGeometry(0.13, 0.19, 0.36), mat(0x2b3038, { metalness: 0.9, roughness: 0.28 }), 0, 0, 0.12, gun)
  const barrel = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.48, 8), mat(0x4b515a, { metalness: 0.95, roughness: 0.2 }), 0, 0.045, 0.44, gun)
  barrel.rotation.x = Math.PI / 2
  const chamber = mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.1, 12), mat(0x5a3a1b, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0.15, gun)
  chamber.rotation.x = Math.PI / 2
  const chamberGlow = mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.106, 8), new THREE.MeshBasicMaterial({ color: 0xffc36b }), 0, 0, 0.15, gun)
  chamberGlow.rotation.x = Math.PI / 2
  const grip = mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), mat(0x3a2317, { roughness: 0.8 }), 0, -0.18, 0.02, gun)
  grip.rotation.x = -0.22
  const muzzle = new THREE.Object3D()
  muzzle.position.set(0, 0.045, 0.7)
  gun.add(muzzle)

  const muzzleGlow = glowSprite(glowTexture, 0xffb14e, 0.35, 0)
  muzzleGlow.position.copy(muzzle.position)
  gun.add(muzzleGlow)

  // soft ground shadow accent (helps on top of real shadows)
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  )
  blob.rotation.x = -Math.PI / 2
  blob.position.y = 0.02
  root.add(blob)

  return {
    root,
    body,
    legs,
    arms,
    gun,
    muzzle,
    muzzleGlow,
    chamberGlow,
    recoil: 0,
    walkPhase: 0,
    animate(dt, moving, speed, t) {
      this.walkPhase += dt * (moving ? speed * 1.7 : 1.2)
      const stride = moving ? Math.min(1.2, speed / 5.5) : 0
      for (const leg of legs) {
        const s = Math.sin(this.walkPhase + (leg.side > 0 ? Math.PI : 0))
        leg.pivot.rotation.x = s * 0.58 * stride
        leg.pivot.position.y = 0.78 + Math.abs(s) * 0.03 * stride
      }
      const bob = Math.abs(Math.sin(this.walkPhase)) * 0.045 * stride
      body.position.y = bob + Math.sin(t * 2.2) * 0.006
      body.rotation.z = Math.sin(this.walkPhase) * 0.03 * stride
      for (const arm of arms) {
        arm.pivot.rotation.x = -0.12 + Math.sin(this.walkPhase * 0.5 + arm.side) * 0.04 * stride
      }
      this.recoil = Math.max(0, this.recoil - dt * 7)
      gun.position.z = 0.3 - this.recoil * 0.08
      gun.rotation.x = this.recoil * 0.22
      muzzleGlow.material.opacity = Math.max(0, this.recoil - 0.3) * 1.2
      this.chamberGlow.material.color.setHSL(0.1, 1, 0.55 + Math.sin(t * 4) * 0.08)
      blob.material.opacity = 0.3
    }
  }
}

// ---------------------------------------------------------------- enemies
const enemyPalettes = {
  husk: { body: 0x3b4149, dark: 0x1c2025, eye: 0xff7b32, eye2: 0xffcf74 },
  crawler: { body: 0x3d2f3e, dark: 0x211826, eye: 0xff3366, eye2: 0xffa3b5 },
  brute: { body: 0x3d3130, dark: 0x1f1717, eye: 0xff5b2b, eye2: 0xffbe74 },
  wretch: { body: 0x2c3d3b, dark: 0x142421, eye: 0x5df0d5, eye2: 0xbcfff4 }
}

function addHitbox(root, hitboxes, radius, y, part, scale = [1, 1, 1]) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  )
  m.position.y = y
  m.scale.set(...scale)
  m.userData.hitPart = part
  root.add(m)
  hitboxes.push(m)
  return m
}

export function createEnemy(type, glowTexture) {
  const palette = enemyPalettes[type]
  const root = new THREE.Group()
  const rig = new THREE.Group()
  root.add(rig)
  const hitboxes = []
  const flashMats = []
  const eyeMats = []

  const bodyMat = mat(palette.body, { roughness: 0.76, metalness: 0.18 })
  const darkMat = mat(palette.dark, { roughness: 0.86, metalness: 0.15 })
  const boneMat = mat(0x8b8170, { roughness: 0.84 })
  const eyeMat = new THREE.MeshBasicMaterial({ color: palette.eye })
  flashMats.push(bodyMat, darkMat)
  eyeMats.push(eyeMat)

  const eyes = (parent, x, y, z, size = 0.055) => {
    const e1 = mesh(new THREE.SphereGeometry(size, 6, 6), eyeMat, -x, y, z, parent)
    const e2 = mesh(new THREE.SphereGeometry(size, 6, 6), eyeMat, x, y, z, parent)
    eyes.forEach?.(() => {})
    return [e1, e2]
  }

  const parts = { head: null, arms: [], legs: [], jaw: null, eyeGlow: [] }

  if (type === 'husk') {
    const torso = mesh(new THREE.CylinderGeometry(0.24, 0.38, 1.05, 8), bodyMat, 0, 1.42, 0, rig)
    torso.scale.z = 0.72
    mesh(new THREE.CylinderGeometry(0.39, 0.44, 0.2, 8), darkMat, 0, 0.9, 0, rig)
    const ribs = mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.62, 8, 1, true), darkMat, 0, 1.6, 0, rig)
    ribs.scale.z = 0.74
    const neck = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.22, 6), boneMat, 0, 2.08, 0, rig)
    neck.rotation.z = 0.08
    const head = mesh(new THREE.SphereGeometry(0.22, 9, 8), bodyMat, 0, 2.3, 0.02, rig)
    head.scale.set(0.82, 1.02, 0.9)
    parts.head = head
    const jaw = mesh(new THREE.BoxGeometry(0.22, 0.1, 0.24), darkMat, 0, 2.19, 0.13, rig)
    jaw.rotation.x = 0.16
    parts.jaw = jaw
    const e = []
    e.push(mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat, -0.08, 2.34, 0.18, rig))
    e.push(mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat, 0.08, 2.34, 0.18, rig))
    parts.eyeGlow = e
    for (const side of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(side * 0.36, 1.86, 0)
      rig.add(arm)
      const upper = mesh(new THREE.BoxGeometry(0.13, 0.6, 0.14), darkMat, 0, -0.26, 0, arm)
      upper.rotation.z = side * 0.08
      const fore = mesh(new THREE.BoxGeometry(0.11, 0.56, 0.12), boneMat, side * 0.04, -0.74, 0.1, arm)
      fore.rotation.x = -0.32
      for (let c = 0; c < 3; c++) {
        const claw = mesh(new THREE.ConeGeometry(0.035, 0.28, 5), boneMat, side * 0.04 + (c - 1) * 0.07, -1.05, 0.24, arm)
        claw.rotation.x = 2.7
      }
      parts.arms.push(arm)
      const leg = new THREE.Group()
      leg.position.set(side * 0.18, 0.86, 0)
      rig.add(leg)
      mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), darkMat, 0, -0.36, 0, leg)
      mesh(new THREE.BoxGeometry(0.2, 0.16, 0.36), bodyMat, 0, -0.78, 0.08, leg)
      parts.legs.push(leg)
    }
    addHitbox(root, hitboxes, 0.56, 1.35, 'body', [1, 1.55, 0.85])
    addHitbox(root, hitboxes, 0.28, 2.3, 'head')
  }

  if (type === 'crawler') {
    const torso = mesh(new THREE.SphereGeometry(0.48, 10, 8), bodyMat, 0, 0.74, 0, rig)
    torso.scale.set(1.15, 0.72, 1.35)
    const back = mesh(new THREE.ConeGeometry(0.28, 0.9, 6), darkMat, 0, 1.08, -0.2, rig)
    back.rotation.x = -0.7
    const head = mesh(new THREE.SphereGeometry(0.27, 8, 7), bodyMat, 0, 0.82, 0.62, rig)
    head.scale.set(1, 0.8, 1.1)
    parts.head = head
    const jawMat = darkMat
    const jaw = mesh(new THREE.ConeGeometry(0.14, 0.36, 5), jawMat, 0, 0.68, 0.88, rig)
    jaw.rotation.x = 1.35
    parts.jaw = jaw
    parts.eyeGlow = [
      mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeMat, -0.11, 0.92, 0.83, rig),
      mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeMat, 0.11, 0.92, 0.83, rig)
    ]
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const leg = new THREE.Group()
        leg.position.set(side * 0.45, 0.62, i === 0 ? 0.35 : -0.35)
        rig.add(leg)
        const upper = mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), darkMat, side * 0.15, -0.15, 0, leg)
        upper.rotation.z = side * 0.8
        mesh(new THREE.BoxGeometry(0.09, 0.46, 0.09), boneMat, side * 0.36, -0.5, 0, leg)
        leg.rotation.x = (i === 0 ? 1 : -1) * 0.12
        parts.legs.push({ pivot: leg, side, index: i })
      }
    }
    addHitbox(root, hitboxes, 0.55, 0.78, 'body', [1.1, 0.75, 1.4])
    addHitbox(root, hitboxes, 0.25, 0.84, 'head')
  }

  if (type === 'brute') {
    const torso = mesh(new THREE.CylinderGeometry(0.62, 0.82, 1.5, 10), bodyMat, 0, 1.9, 0, rig)
    torso.scale.z = 0.85
    mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.32, 10), darkMat, 0, 1.2, 0, rig)
    const chestPlate = mesh(new THREE.BoxGeometry(0.9, 0.8, 0.16), darkMat, 0, 2.18, 0.58, rig)
    chestPlate.rotation.x = 0.08
    const shoulderL = mesh(new THREE.SphereGeometry(0.42, 8, 8), darkMat, -0.86, 2.5, 0, rig)
    shoulderL.scale.set(1.1, 0.8, 1)
    const shoulderR = shoulderL.clone()
    shoulderR.position.x = 0.86
    rig.add(shoulderR)
    const head = mesh(new THREE.SphereGeometry(0.27, 8, 7), bodyMat, 0, 2.86, 0.08, rig)
    head.scale.set(0.9, 0.8, 1)
    parts.head = head
    const jaw = mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), darkMat, 0, 2.73, 0.25, rig)
    parts.jaw = jaw
    const hornMat = mat(0x8c7b63, { roughness: 0.75 })
    for (const side of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(0.1, 0.6, 6), hornMat, side * 0.19, 3.08, 0.05, rig)
      horn.rotation.z = side * -0.55
      horn.rotation.x = -0.18
    }
    parts.eyeGlow = [
      mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeMat, -0.1, 2.9, 0.3, rig),
      mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeMat, 0.1, 2.9, 0.3, rig)
    ]
    for (const side of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(side * 0.92, 2.42, 0)
      rig.add(arm)
      const upper = mesh(new THREE.BoxGeometry(0.32, 0.86, 0.34), darkMat, 0, -0.36, 0, arm)
      upper.rotation.z = side * 0.12
      const fore = mesh(new THREE.BoxGeometry(0.3, 0.74, 0.32), bodyMat, side * 0.08, -0.99, 0.08, arm)
      const fist = mesh(new THREE.SphereGeometry(0.32, 8, 8), darkMat, side * 0.1, -1.38, 0.12, arm)
      fist.scale.set(1.15, 0.9, 1.2)
      parts.arms.push(arm)
      const leg = new THREE.Group()
      leg.position.set(side * 0.34, 1.2, 0)
      rig.add(leg)
      mesh(new THREE.BoxGeometry(0.33, 0.8, 0.38), darkMat, 0, -0.4, 0, leg)
      mesh(new THREE.BoxGeometry(0.38, 0.22, 0.58), bodyMat, 0, -0.84, 0.1, leg)
      parts.legs.push({ pivot: leg, side, index: 0 })
    }
    const spikeMat = mat(0x6a6255, { metalness: 0.4, roughness: 0.7 })
    for (let i = 0; i < 4; i++) {
      const spike = mesh(new THREE.ConeGeometry(0.12, 0.55, 5), spikeMat, (i - 1.5) * 0.25, 2.55, -0.54, rig)
      spike.rotation.x = -2.2
    }
    addHitbox(root, hitboxes, 0.95, 1.9, 'body', [1, 1.55, 0.9])
    addHitbox(root, hitboxes, 0.3, 2.88, 'head')
  }

  if (type === 'wretch') {
    const robe = mesh(new THREE.ConeGeometry(0.62, 1.65, 9), bodyMat, 0, 1.38, 0, rig)
    robe.rotation.y = 0.4
    const shoulders = mesh(new THREE.SphereGeometry(0.42, 8, 8), darkMat, 0, 1.95, 0, rig)
    shoulders.scale.set(1.2, 0.55, 0.85)
    const hood = mesh(new THREE.SphereGeometry(0.34, 9, 8, 0, Math.PI * 2, 0, Math.PI * 0.78), darkMat, 0, 2.18, 0.02, rig)
    hood.rotation.x = 0.2
    const face = mesh(new THREE.SphereGeometry(0.19, 8, 6), mat(0x080b0c, { roughness: 1 }), 0, 2.12, 0.24, rig)
    parts.head = face
    parts.eyeGlow = [
      mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat, -0.08, 2.17, 0.34, rig),
      mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat, 0.08, 2.17, 0.34, rig)
    ]
    const mouth = mesh(new THREE.BoxGeometry(0.18, 0.08, 0.04), eyeMat, 0, 2.02, 0.36, rig)
    parts.jaw = mouth
    for (const side of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(side * 0.46, 1.92, 0.02)
      rig.add(arm)
      const sleeve = mesh(new THREE.ConeGeometry(0.16, 0.8, 6, 1, true), darkMat, side * 0.06, -0.34, 0.08, arm)
      sleeve.rotation.z = side * 0.25
      const hand = mesh(new THREE.SphereGeometry(0.09, 6, 6), eyeMat, side * 0.12, -0.74, 0.16, arm)
      hand.scale.set(0.7, 0.7, 1.5)
      parts.arms.push(arm)
    }
    const aura = glowSprite(glowTexture, palette.eye, 1.7, 0.16)
    aura.position.y = 1.5
    rig.add(aura)
    addHitbox(root, hitboxes, 0.62, 1.5, 'body', [1, 1.55, 0.9])
    addHitbox(root, hitboxes, 0.27, 2.15, 'head')
  }

  const eyeSprites = parts.eyeGlow.map(e => {
    const s = glowSprite(glowTexture, palette.eye, 0.45, 0.55)
    s.position.copy(e.position)
    rig.add(s)
    return s
  })

  return {
    type,
    root,
    rig,
    hitboxes,
    parts,
    eyeSprites,
    eyeMats,
    flashMats,
    baseColors: flashMats.map(m => m.color.clone()),
    flash: 0,
    hover: type === 'wretch',
    animate(dt, t, speed, moving) {
      this.flash = Math.max(0, this.flash - dt * 5)
      flashMats.forEach((m, i) => {
        m.emissive.setRGB(this.flash * 0.9, this.flash * 0.55, this.flash * 0.25)
        m.emissiveIntensity = this.flash * 1.6
      })
      const walk = t * (moving ? speed * 2.2 : 1.4)
      if (type === 'husk') {
        parts.legs.forEach((leg, i) => {
          const s = Math.sin(walk + (i % 2 ? Math.PI : 0))
          leg.rotation.x = s * 0.55
        })
        parts.arms.forEach((arm, i) => {
          arm.rotation.x = Math.sin(walk + (i % 2 ? Math.PI : 0)) * 0.32 - 0.12
        })
        rig.position.y = Math.abs(Math.sin(walk)) * 0.035
        rig.rotation.z = Math.sin(walk * 0.5) * 0.02
      } else if (type === 'crawler') {
        parts.legs.forEach(leg => {
          leg.pivot.rotation.x = (leg.index === 0 ? 1 : -1) * 0.12 + Math.sin(walk * 1.5 + leg.side + leg.index) * 0.65
          leg.pivot.rotation.z = leg.side * 0.1
        })
        rig.position.y = Math.abs(Math.sin(walk * 1.5)) * 0.05
        parts.jaw.rotation.x = 1.35 + Math.sin(t * 8) * 0.18
      } else if (type === 'brute') {
        parts.legs.forEach((leg, i) => {
          leg.pivot.rotation.x = Math.sin(walk + (i % 2 ? Math.PI : 0)) * 0.4
        })
        parts.arms.forEach((arm, i) => {
          arm.rotation.x = Math.sin(walk + (i % 2 ? Math.PI : 0)) * 0.22 - 0.08
        })
        rig.rotation.z = Math.sin(walk * 0.5) * 0.025
      } else if (type === 'wretch') {
        rig.position.y = 0.16 + Math.sin(t * 1.8) * 0.12
        rig.rotation.z = Math.sin(t * 1.1) * 0.035
        parts.arms.forEach((arm, i) => {
          arm.rotation.x = Math.sin(t * 1.6 + i) * 0.14
          arm.rotation.z = (i ? 1 : -1) * (0.1 + Math.sin(t * 2.4 + i) * 0.05)
        })
        parts.jaw.scale.x = 1 + Math.sin(t * 5) * 0.12
      }
      eyeSprites.forEach((s, i) => {
        s.material.opacity = 0.38 + Math.sin(t * 4 + i) * 0.16
        s.scale.setScalar(0.38 + Math.sin(t * 3 + i) * 0.05)
      })
    }
  }
}

// ---------------------------------------------------------------- boss
export function createBoss(glowTexture) {
  const root = new THREE.Group()
  const rig = new THREE.Group()
  root.add(rig)
  const hitboxes = []
  const flashMats = []
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2138 })

  const skin = mat(0x2d1519, { roughness: 0.7, metalness: 0.2 })
  const dark = mat(0x130a0d, { roughness: 0.8, metalness: 0.25 })
  const bone = mat(0x8e7562, { roughness: 0.72 })
  const metal = mat(0x45343a, { metalness: 0.8, roughness: 0.35 })
  flashMats.push(skin, dark)

  const torso = mesh(new THREE.SphereGeometry(1.55, 14, 12), skin, 0, 3.15, 0, rig)
  torso.scale.set(1.35, 1.15, 0.95)
  const belly = mesh(new THREE.SphereGeometry(1.05, 12, 10), dark, 0, 2.45, 0.34, rig)
  belly.scale.set(1.1, 0.85, 0.8)
  const collar = mesh(new THREE.TorusGeometry(0.95, 0.18, 8, 16), metal, 0, 3.9, 0, rig)
  collar.rotation.x = Math.PI / 2
  const chain = mesh(new THREE.TorusGeometry(0.78, 0.08, 6, 14), metal, 0, 3.72, 0.5, rig)
  chain.rotation.x = 0.2

  const head = mesh(new THREE.SphereGeometry(0.72, 12, 10), skin, 0, 4.25, 0.28, rig)
  head.scale.set(0.95, 0.86, 0.95)
  const brow = mesh(new THREE.BoxGeometry(1.15, 0.22, 0.4), dark, 0, 4.5, 0.58, rig)
  brow.rotation.x = -0.1
  const jaw = mesh(new THREE.BoxGeometry(0.82, 0.3, 0.6), dark, 0, 3.9, 0.55, rig)
  jaw.rotation.x = 0.2
  const teeth = []
  for (let i = 0; i < 5; i++) {
    const t = mesh(new THREE.ConeGeometry(0.07, 0.3, 5), bone, (i - 2) * 0.17, 4.02, 0.82, rig)
    t.rotation.x = Math.PI
    teeth.push(t)
  }
  const horns = []
  for (const side of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(0.22, 1.65, 7), bone, side * 0.62, 4.9, 0.18, rig)
    horn.rotation.z = side * -0.52
    horn.rotation.x = -0.22
    horns.push(horn)
    const horn2 = mesh(new THREE.ConeGeometry(0.12, 0.8, 6), bone, side * 1.1, 4.65, 0.05, rig)
    horn2.rotation.z = side * -1.1
  }
  const eyes = [
    mesh(new THREE.SphereGeometry(0.12, 7, 7), eyeMat, -0.3, 4.34, 0.88, rig),
    mesh(new THREE.SphereGeometry(0.12, 7, 7), eyeMat, 0.3, 4.34, 0.88, rig)
  ]
  for (const e of eyes) {
    const s = glowSprite(glowTexture, 0xff2138, 0.85, 0.6)
    s.position.copy(e.position)
    rig.add(s)
  }

  const sigilMat = new THREE.MeshBasicMaterial({
    color: 0xff4058,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  const sigil = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), sigilMat)
  sigil.position.set(0, 3.18, 1.36)
  rig.add(sigil)
  const sigilRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 6, 24), sigilMat)
  sigilRing.position.set(0, 3.18, 1.34)
  rig.add(sigilRing)
  const chestLight = new THREE.PointLight(0xff3048, 12, 12, 1.8)
  chestLight.position.set(0, 3.2, 1.2)
  rig.add(chestLight)

  const arms = []
  for (const side of [-1, 1]) {
    const arm = new THREE.Group()
    arm.position.set(side * 1.85, 3.55, 0)
    rig.add(arm)
    const shoulder = mesh(new THREE.SphereGeometry(0.62, 10, 8), dark, 0, 0, 0, arm)
    const upper = mesh(new THREE.BoxGeometry(0.55, 1.55, 0.62), skin, side * 0.08, -0.85, 0, arm)
    upper.rotation.z = side * 0.16
    const fore = mesh(new THREE.BoxGeometry(0.48, 1.35, 0.5), skin, side * 0.2, -2.08, 0.18, arm)
    fore.rotation.x = -0.14
    const fist = mesh(new THREE.SphereGeometry(0.58, 9, 8), dark, side * 0.25, -2.85, 0.35, arm)
    fist.scale.set(1.2, 0.9, 1.25)
    const spike = mesh(new THREE.ConeGeometry(0.14, 0.5, 5), bone, side * 0.28, -2.85, 0.9, arm)
    spike.rotation.x = 1.4
    arms.push({ pivot: arm, side })
  }
  const legs = []
  for (const side of [-1, 1]) {
    const leg = new THREE.Group()
    leg.position.set(side * 0.75, 2.1, 0)
    rig.add(leg)
    const thigh = mesh(new THREE.BoxGeometry(0.62, 1.35, 0.72), skin, 0, -0.6, 0, leg)
    const shin = mesh(new THREE.BoxGeometry(0.54, 1.1, 0.6), dark, 0, -1.7, 0.16, leg)
    shin.rotation.x = -0.12
    const hoof = mesh(new THREE.BoxGeometry(0.66, 0.36, 0.95), metal, 0, -2.25, 0.38, leg)
    legs.push({ pivot: leg, side })
  }

  // spikes along back
  for (let i = 0; i < 5; i++) {
    const spike = mesh(new THREE.ConeGeometry(0.2, 1.0, 6), bone, 0, 4.4 - i * 0.32, -0.9 - i * 0.12, rig)
    spike.rotation.x = -0.85
  }

  const aura = glowSprite(glowTexture, 0xff2138, 6.5, 0.14)
  aura.position.y = 3
  rig.add(aura)

  addHitbox(root, hitboxes, 1.55, 2.8, 'body', [1.25, 1.25, 0.95])
  addHitbox(root, hitboxes, 0.62, 3.2, 'chest', [1.2, 1, 1])
  addHitbox(root, hitboxes, 0.68, 4.28, 'head')

  return {
    root,
    rig,
    hitboxes,
    flashMats,
    parts: { head, jaw, arms, legs, sigil, sigilRing, chestLight, eyes, horns },
    flash: 0,
    pose: 0,
    animate(dt, t, moving) {
      this.flash = Math.max(0, this.flash - dt * 4.5)
      flashMats.forEach(m => {
        m.emissive.setRGB(this.flash * 0.9, this.flash * 0.15, this.flash * 0.18)
        m.emissiveIntensity = this.flash * 1.9
      })
      this.pose += dt
      const breathe = Math.sin(t * 1.25) * 0.035
      rig.position.y = breathe
      torso.scale.y = 1.15 + breathe * 0.5
      head.rotation.x = Math.sin(t * 0.8) * 0.04
      jaw.rotation.x = 0.2 + Math.sin(t * 1.4) * 0.05
      sigil.rotation.z = t * 0.7
      sigilRing.rotation.z = -t * 1.2
      sigilMat.opacity = 0.62 + Math.sin(t * 3.1) * 0.2
      chestLight.intensity = 11 + Math.sin(t * 3.1) * 3
      arms.forEach((arm, i) => {
        arm.pivot.rotation.x = Math.sin(t * 1.1 + i * 2) * 0.06 - 0.05
        arm.pivot.rotation.z = arm.side * (0.08 + Math.sin(t * 0.8 + i) * 0.02)
      })
      if (!moving) {
        legs.forEach((leg, i) => { leg.pivot.rotation.x = Math.sin(t * 0.7 + i) * 0.02 })
      }
    }
  }
}

// ---------------------------------------------------------------- pickups / projectiles
export function createHealthPickup(glowTexture) {
  const group = new THREE.Group()
  const vialMat = new THREE.MeshStandardMaterial({
    color: 0x1a8a76,
    emissive: 0x3df0c5,
    emissiveIntensity: 1.3,
    metalness: 0.4,
    roughness: 0.2,
    transparent: true,
    opacity: 0.92
  })
  const vial = mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.34, 8), vialMat, 0, 0.24, 0, group)
  const cap = mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.11, 8), mat(0xd3bd92, { metalness: 0.8, roughness: 0.3 }), 0, 0.47, 0, group)
  const glow = glowSprite(glowTexture, 0x5df0d5, 1.1, 0.5)
  glow.position.y = 0.25
  group.add(glow)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.012, 4, 24),
    new THREE.MeshBasicMaterial({ color: 0x5df0d5, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.03
  group.add(ring)
  return { group, vial, glow, ring }
}

export function createProjectileMesh(color = 0xff5a3c, size = 0.16, glowTexture) {
  const group = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(size, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff0d0 })
  )
  group.add(core)
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(size * 1.9, 8, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  group.add(shell)
  if (glowTexture) {
    const glow = glowSprite(glowTexture, color, size * 9, 0.65)
    group.add(glow)
  }
  return { group, core, shell }
}
