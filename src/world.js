import * as THREE from 'three'
import { makeFloorTexture, makeWallTexture, makeSign, makeGlowTexture, makeSigilTexture } from './textures.js'

export const THEMES = [
  {
    key: 'foundry',
    name: 'THE RUSTED FOUNDRY',
    roman: 'I',
    accent: 0xe2b567,
    accentCss: '#e2b567',
    fog: 0x090705,
    wall: 0x16120e,
    key: 0xffbe78,
    rim: 0xff7426,
    rail: 0xff9a4d,
    bg: 0x030302
  },
  {
    key: 'reliquary',
    name: 'THE DROWNED RELIQUARY',
    roman: 'II',
    accent: 0x4ce3cb,
    accentCss: '#4ce3cb',
    fog: 0x031012,
    wall: 0x0a1718,
    key: 0x9eeaff,
    rim: 0x18d3bd,
    rail: 0x4ce3cb,
    bg: 0x020607
  },
  {
    key: 'chasm',
    name: 'THE BLOOD CHASM',
    roman: 'III',
    accent: 0xff4058,
    accentCss: '#ff4058',
    fog: 0x120306,
    wall: 0x190609,
    key: 0xffc0ac,
    rim: 0xff1e3c,
    rail: 0xff4058,
    bg: 0x060102
  }
]

export function createWorld(scene, renderer) {
  const world = {
    group: new THREE.Group(),
    themeIndex: 0,
    descent: false,
    descentSpeed: 0,
    time: 0,
    sign: makeSign(),
    lampLights: [],
    railLights: [],
    rings: null,
    wallTexture: null,
    bossSigil: null,
    bossBraziers: [],
    dust: null
  }
  scene.add(world.group)

  scene.background = new THREE.Color(0x030302)
  scene.fog = new THREE.FogExp2(0x090705, 0.023)

  // ---------- lighting ----------
  const hemi = new THREE.HemisphereLight(0x51687f, 0x0a0806, 0.55)
  scene.add(hemi)
  world.hemi = hemi

  const key = new THREE.SpotLight(0xffbe78, 110, 60, Math.PI * 0.34, 0.55, 1.15)
  key.position.set(0, 19, 3)
  key.target.position.set(0, 0, 0)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.near = 2
  key.shadow.camera.far = 42
  key.shadow.bias = -0.0007
  key.shadow.radius = 3
  scene.add(key, key.target)
  world.key = key

  const rim = new THREE.PointLight(0xff7426, 45, 34, 1.7)
  rim.position.set(-12, 8, -12)
  scene.add(rim)
  world.rim = rim

  const rim2 = new THREE.PointLight(0xff7426, 30, 30, 1.7)
  rim2.position.set(12, 5, 11)
  scene.add(rim2)
  world.rim2 = rim2

  // ---------- shaft ----------
  const shaft = new THREE.Group()
  world.group.add(shaft)
  world.shaft = shaft

  const wallTexture = makeWallTexture()
  world.wallTexture = wallTexture
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTexture,
    color: 0x16120e,
    metalness: 0.72,
    roughness: 0.58
  })
  world.wallMat = wallMat
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 190, 64, 1, true), wallMat)
  wall.position.y = 32
  shaft.add(wall)

  // vertical structural ribs
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, metalness: 0.9, roughness: 0.42 })
  world.ribMat = ribMat
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.64, 190, 0.9), ribMat)
    rib.position.set(Math.sin(a) * 23.4, 32, Math.cos(a) * 23.4)
    rib.rotation.y = a
    shaft.add(rib)
  }

  // rings scrolling past to sell the descent
  const ringGroup = new THREE.Group()
  shaft.add(ringGroup)
  world.rings = ringGroup
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x2b2116,
    emissive: 0xff7426,
    emissiveIntensity: 1.4,
    metalness: 0.7,
    roughness: 0.35
  })
  world.ringMat = ringMat
  const ringGeo = new THREE.TorusGeometry(23.25, 0.16, 6, 72)
  for (let i = 0; i < 16; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = i * 14 - 66
    ringGroup.add(ring)
    // lamps inset around every other ring
    if (i % 2 === 0) {
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2 + (i % 4) * 0.15
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.34, 0.18),
          new THREE.MeshBasicMaterial({ color: 0xff9a4d })
        )
        panel.position.set(Math.sin(a) * 22.9, i * 14 - 66, Math.cos(a) * 22.9)
        panel.rotation.y = a
        ringGroup.add(panel)
        if (j === 0) world.railLights.push(panel)
      }
    }
  }

  // cables
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, metalness: 0.95, roughness: 0.34 })
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 132, 6), cableMat)
    cable.position.set(Math.sin(a) * 6.4, 72, Math.cos(a) * 6.4)
    shaft.add(cable)
  }

  // ---------- hanging floor signs ----------
  const signMat = new THREE.MeshBasicMaterial({ map: world.sign.texture, transparent: true, side: THREE.DoubleSide, toneMapped: false })
  world.signMat = signMat
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x080a0d, metalness: 0.8, roughness: 0.5 })
  for (const [z, rot] of [[19.85, Math.PI], [-19.85, 0]]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.6, 5.1, 0.28), frameMat)
    frame.position.set(0, 8.2, z + (z > 0 ? 0.14 : -0.14))
    frame.rotation.y = rot
    shaft.add(frame)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.1, 4.55), signMat)
    sign.position.set(0, 8.2, z)
    sign.rotation.y = rot
    shaft.add(sign)
    // overhead spotlight bar
    for (let i = -1; i <= 1; i++) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6), frameMat)
      bolt.rotation.x = Math.PI / 2
      bolt.position.set(i * 3.7, 10.85, z)
      shaft.add(bolt)
    }
  }

  // ---------- platform ----------
  const platform = new THREE.Group()
  world.group.add(platform)
  world.platform = platform

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x11151a, metalness: 0.85, roughness: 0.42 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 9.65, 0.92, 48), baseMat)
  base.position.y = -0.46
  base.receiveShadow = true
  base.castShadow = true
  platform.add(base)

  const floorTex = makeFloorTexture('#e2b567')
  world.floorTex = floorTex
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, metalness: 0.62, roughness: 0.55 })
  world.floorMat = floorMat
  const floor = new THREE.Mesh(new THREE.CircleGeometry(10.07, 64), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  platform.add(floor)

  // rim
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x2a2015, metalness: 0.9, roughness: 0.35, emissive: 0xff7426, emissiveIntensity: 0.12 })
  world.platformRimMat = rimMat
  const platformRim = new THREE.Mesh(new THREE.TorusGeometry(10.02, 0.2, 8, 72), rimMat)
  platformRim.rotation.x = Math.PI / 2
  platformRim.position.y = 0.02
  platform.add(platformRim)

  // under-glow
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff7426 })
  world.glowMat = glowMat
  const underGlow = new THREE.Mesh(new THREE.TorusGeometry(9.45, 0.07, 6, 72), glowMat)
  underGlow.rotation.x = Math.PI / 2
  underGlow.position.y = -0.96
  platform.add(underGlow)

  // below-deck machinery
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x0a0d11, metalness: 0.9, roughness: 0.5 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.6, 2.5), engineMat)
    fin.position.set(Math.sin(a) * 5.4, -1.65, Math.cos(a) * 5.4)
    fin.rotation.y = a
    platform.add(fin)
  }
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 2.7, 3.1, 16), engineMat)
  engine.position.y = -2.9
  platform.add(engine)
  const engineCore = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.3, 16), new THREE.MeshBasicMaterial({ color: 0xff7a2e }))
  engineCore.position.y = -2.9
  platform.add(engineCore)
  world.engineCore = engineCore

  // railing
  const railMat = new THREE.MeshStandardMaterial({ color: 0x262b31, metalness: 0.9, roughness: 0.35 })
  const postGeo = new THREE.BoxGeometry(0.065, 1.22, 0.065)
  world.railLightMats = []
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const post = new THREE.Mesh(postGeo, railMat)
    post.position.set(Math.sin(a) * 9.86, 0.62, Math.cos(a) * 9.86)
    platform.add(post)
    if (i % 3 === 0) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff9a4d }))
      bulb.position.set(Math.sin(a) * 9.86, 1.24, Math.cos(a) * 9.86)
      platform.add(bulb)
      world.railLightMats.push(bulb.material)
    }
  }
  const railRingMat = new THREE.MeshStandardMaterial({ color: 0x31363c, metalness: 0.95, roughness: 0.3 })
  for (const y of [0.58, 1.18]) {
    const bar = new THREE.Mesh(new THREE.TorusGeometry(9.86, 0.045, 5, 96), railRingMat)
    bar.rotation.x = Math.PI / 2
    bar.position.y = y
    platform.add(bar)
  }

  // overhead cage
  const cage = new THREE.Group()
  platform.add(cage)
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.11, 6, 64), railMat)
  topRing.rotation.x = Math.PI / 2
  topRing.position.y = 8.6
  cage.add(topRing)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 8.6, 0.16), railMat)
    beam.position.set(Math.sin(a) * 8.55, 4.3, Math.cos(a) * 8.55)
    beam.rotation.y = a
    cage.add(beam)
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 8.5, 4), new THREE.MeshBasicMaterial({ color: 0x36322a }))
    cable.position.set(Math.sin(a) * 8.55, 4.3, Math.cos(a) * 8.55)
    cage.add(cable)
  }
  // hanging lamps
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2b1c0d, emissive: 0xff9a4d, emissiveIntensity: 2.2, metalness: 0.6, roughness: 0.4 })
  world.lampMat = lampMat
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const x = Math.sin(a) * 6.2, z = Math.cos(a) * 6.2
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.4, 4), railMat)
    chain.position.set(x, 7.4, z)
    cage.add(chain)
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.75, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x171a1e, metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide }))
    shade.position.set(x, 6.15, z)
    cage.add(shade)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), lampMat)
    bulb.position.set(x, 5.88, z)
    cage.add(bulb)
    const light = new THREE.PointLight(0xff9a4d, 11, 14, 1.8)
    light.position.set(x, 5.8, z)
    cage.add(light)
    world.lampLights.push(light)
  }

  // ---------- boss floor dressing ----------
  const sigilMat = new THREE.MeshBasicMaterial({
    map: makeSigilTexture('#ff4058'),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  world.bossSigil = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), sigilMat)
  world.bossSigil.rotation.x = -Math.PI / 2
  world.bossSigil.position.y = 0.012
  world.bossSigil.visible = false
  platform.add(world.bossSigil)

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const brazier = new THREE.Group()
    brazier.position.set(Math.sin(a) * 8.9, 0, Math.cos(a) * 8.9)
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.28, 0.45, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1b1210, metalness: 0.8, roughness: 0.45, side: THREE.DoubleSide })
    )
    bowl.position.y = 0.8
    brazier.add(bowl)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x211714, metalness: 0.85, roughness: 0.4 }))
    stem.position.y = 0.4
    brazier.add(stem)
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }))
    flame.position.y = 1.42
    brazier.add(flame)
    const light = new THREE.PointLight(0xff3a2a, 13, 13, 1.8)
    light.position.y = 1.6
    brazier.add(light)
    brazier.visible = false
    platform.add(brazier)
    world.bossBraziers.push({ group: brazier, flame, light, phase: Math.random() * 6 })
  }

  // ---------- dust / embers ----------
  const dustCount = 360
  const dustGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(dustCount * 3)
  const speeds = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    const r = 6 + Math.random() * 16
    const a = Math.random() * Math.PI * 2
    positions[i * 3] = Math.sin(a) * r
    positions[i * 3 + 1] = Math.random() * 34 - 2
    positions[i * 3 + 2] = Math.cos(a) * r
    speeds[i] = 0.12 + Math.random() * 0.5
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const dustMat = new THREE.PointsMaterial({
    color: 0xffd2a0,
    size: 0.055,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)
  world.dust = dust
  world.dustSpeed = speeds
  world.dustMat = dustMat

  // glow sprite pool is managed by FX; keep a reusable radial texture
  world.glowTexture = makeGlowTexture()

  // ---------- theme ----------
  world.setTheme = (index) => {
    index = Math.max(0, Math.min(THEMES.length - 1, index))
    world.themeIndex = index
    const t = THEMES[index]
    scene.fog.color.setHex(t.fog)
    scene.background.setHex(t.bg)
    world.hemi.color.setHex(t.key)
    world.hemi.groundColor.setHex(t.fog)
    world.key.color.setHex(t.key)
    world.rim.color.setHex(t.rim)
    world.rim2.color.setHex(t.rim)
    world.wallMat.color.setHex(t.wall)
    world.ringMat.emissive.setHex(t.rail)
    world.ringMat.color.setHex(t.rail)
    world.floorMat.emissive = world.floorMat.emissive || new THREE.Color()
    world.floorMat.emissive.setHex(t.rail)
    world.floorMat.emissiveIntensity = 0.035
    world.platformRimMat.emissive.setHex(t.rail)
    world.glowMat.color.setHex(t.rail)
    world.lampMat.emissive.setHex(t.key)
    world.engineCore.material.color.setHex(t.rim)
    world.railLightMats.forEach(m => m.color.setHex(t.rail))
    world.railLights.forEach(m => m.material.color.setHex(t.rail))
    world.lampLights.forEach(l => l.color.setHex(t.key))
    world.dustMat.color.setHex(t.accent)
    world.bossSigil.material.color.setHex(t.accent)
    document.documentElement.style.setProperty('--gold', t.accentCss)
    document.documentElement.style.setProperty('--gold-hot', t.accentCss)
  }
  world.setTheme(0)

  world.setSign = ({ levelRoman, floor, name, accent, boss }) => {
    world.sign.update({ levelRoman, floor, name, accent, boss })
    world.signMat.map.needsUpdate = true
  }
  world.setSign({ levelRoman: 'I', floor: 1, name: THEMES[0].name, accent: THEMES[0].accentCss })
  world.signMat.map.needsUpdate = true

  world.setBossArea = (on) => {
    world.bossSigil.visible = on
    world.bossBraziers.forEach(b => { b.group.visible = on })
  }

  world.setDescent = (on) => {
    world.descent = on
    document.getElementById('descent-streaks')?.classList.toggle('on', on)
  }

  world.update = (dt, t) => {
    world.time = t
    if (world.descent) {
      ringGroup.position.y += dt * 7.2
      if (ringGroup.position.y > 14) ringGroup.position.y -= 14
      if (world.wallTexture) world.wallTexture.offset.y = (world.wallTexture.offset.y + dt * 0.16) % 1
      world.dust.position.y = (world.dust.position.y + dt * 5.5) % 14
    } else {
      world.dust.position.y *= 0.98
    }

    // flicker
    const flicker = 0.9 + Math.sin(t * 13.1) * 0.04 + Math.sin(t * 23.7) * 0.025
    world.key.intensity = 110 * flicker
    world.lampLights.forEach((l, i) => { l.intensity = 11 * (0.82 + Math.sin(t * 7 + i * 1.7) * 0.16) })
    world.engineCore.material.color.offsetHSL(0, 0, Math.sin(t * 3) * 0.002)
    world.railLights.forEach((m, i) => {
      m.material.color.offsetHSL(0, 0, Math.sin(t * 2.2 + i) * 0.0015)
    })

    if (world.bossSigil.visible) {
      world.bossSigil.rotation.z = t * 0.12
      world.bossSigil.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.2
      world.bossBraziers.forEach(b => {
        b.flame.scale.y = 0.85 + Math.sin(t * 9 + b.phase) * 0.2
        b.flame.scale.x = 0.9 + Math.sin(t * 11 + b.phase) * 0.13
        b.light.intensity = 12 + Math.sin(t * 8 + b.phase) * 3
      })
    }

    // dust drift
    const pos = world.dust.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      let ny = y + world.dustSpeed[i] * dt * (world.descent ? 8 : 1)
      if (ny > 32) ny = -2
      pos.setY(i, ny)
    }
    pos.needsUpdate = true
  }

  return world
}
