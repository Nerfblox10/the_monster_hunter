import * as THREE from 'three'

function makeParticleSystem(scene, count, { size = 0.09, additive = true, opacity = 1 } = {}) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setDrawRange(0, 0)
  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    sizeAttenuation: true
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 6
  scene.add(points)
  return {
    points,
    geometry,
    material,
    positions,
    colors,
    count,
    data: [],
    cursor: 0
  }
}

export class FX {
  constructor(scene, glowTexture) {
    this.scene = scene
    this.glowTexture = glowTexture
    this.sparks = makeParticleSystem(scene, 900, { size: 0.085, additive: true })
    this.debris = makeParticleSystem(scene, 500, { size: 0.075, additive: false })
    this.beams = []
    this.rings = []
    this.muzzle = null
    this.muzzleLight = new THREE.PointLight(0xffb14e, 0, 10, 2)
    scene.add(this.muzzleLight)
    this.shake = 0
    this.shakeDecay = 5
  }

  spawnParticle(system, p, v, color, life, gravity) {
    const i = system.cursor
    system.cursor = (system.cursor + 1) % system.count
    system.data[i] = { vx: v.x, vy: v.y, vz: v.z, life, maxLife: life, gravity }
    system.positions[i * 3] = p.x
    system.positions[i * 3 + 1] = p.y
    system.positions[i * 3 + 2] = p.z
    system.colors[i * 3] = color.r
    system.colors[i * 3 + 1] = color.g
    system.colors[i * 3 + 2] = color.b
    system.geometry.setDrawRange(0, system.count)
  }

  burst(position, opts = {}) {
    const {
      count = 12,
      color = 0xffc36b,
      speed = 5,
      drag = 0.94,
      life = 0.5,
      gravity = -9,
      spread = 1,
      up = 0.5,
      debris = false,
      size = 1
    } = opts
    const system = debris ? this.debris : this.sparks
    const c = new THREE.Color(color)
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2 * spread,
        Math.random() * up + 0.15,
        (Math.random() - 0.5) * 2 * spread
      ).normalize()
      const p = position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      ))
      const v = dir.multiplyScalar(speed * (0.35 + Math.random() * 0.9))
      this.spawnParticle(system, p, v, c, life * (0.6 + Math.random() * 0.7), gravity)
    }
    system.material.size = Math.max(0.05, size * 0.09)
  }

  hit(position, color = 0xffd28a, head = false) {
    this.burst(position, {
      count: head ? 16 : 9,
      color,
      speed: head ? 7 : 5,
      life: 0.32,
      gravity: -13,
      up: 0.8
    })
    this.addRing(position.clone().setY(position.y + 0.05), {
      color,
      radius: head ? 0.45 : 0.3,
      end: head ? 0.9 : 0.55,
      life: 0.22,
      opacity: 0.65
    })
    this.shake = Math.max(this.shake, 0.035)
  }

  blood(position, color = 0x7d0f1d) {
    this.burst(position, {
      count: 11,
      color,
      speed: 4.5,
      life: 0.48,
      gravity: -15,
      up: 0.7,
      debris: true,
      size: 1.4
    })
    this.burst(position, {
      count: 4,
      color: 0xff4058,
      speed: 3,
      life: 0.25,
      gravity: -9,
      up: 0.5
    })
  }

  death(position, color = 0xff7b32, large = false) {
    this.burst(position, {
      count: large ? 55 : 26,
      color,
      speed: large ? 12 : 7,
      life: large ? 0.9 : 0.65,
      gravity: -7,
      up: 1.4,
      size: 1.3
    })
    this.burst(position, {
      count: large ? 35 : 16,
      color: 0x56121a,
      speed: large ? 9 : 5,
      life: 0.75,
      gravity: -16,
      up: 1,
      debris: true,
      size: 1.6
    })
    this.addRing(position.clone().setY(0.03), {
      color,
      radius: large ? 1 : 0.4,
      end: large ? 7 : 2.2,
      life: large ? 0.7 : 0.45,
      opacity: 0.8
    })
    this.shake = Math.max(this.shake, large ? 0.45 : 0.12)
  }

  spawnPortal(position, color = 0xff7b32) {
    this.addRing(position.clone().setY(0.04), { color, radius: 0.3, end: 1.8, life: 0.6, opacity: 0.9 })
    this.burst(position.clone().setY(0.4), {
      count: 16,
      color,
      speed: 2.4,
      life: 0.7,
      gravity: 1.5,
      up: 1.8
    })
  }

  muzzleFlash(position, direction, color = 0xffb14e) {
    if (!this.muzzle) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTexture,
        color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }))
      sprite.scale.set(1.1, 1.1, 1)
      this.scene.add(sprite)
      this.muzzle = sprite
    }
    this.muzzle.position.copy(position).add(direction.clone().multiplyScalar(0.28))
    this.muzzle.material.opacity = 0.95
    this.muzzle.material.color.setHex(color)
    this.muzzle.scale.setScalar(0.8 + Math.random() * 0.45)
    this.muzzleLight.position.copy(position).add(direction.clone().multiplyScalar(0.4))
    this.muzzleLight.color.setHex(color)
    this.muzzleLight.intensity = 18
    this.burst(position, {
      count: 6,
      color,
      speed: 6.5,
      life: 0.18,
      gravity: -2,
      up: 0.4,
      spread: 0.45
    })
  }

  addBeam(from, to, color = 0xffe2a6) {
    let beam = this.beams.find(b => !b.active)
    if (!beam) {
      if (this.beams.length >= 24) return
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 4, 1, true), material)
      mesh.renderOrder = 5
      this.scene.add(mesh)
      beam = { mesh, material, active: false, life: 0, maxLife: 1 }
      this.beams.push(beam)
    }
    const dir = to.clone().sub(from)
    const len = dir.length()
    beam.mesh.position.copy(from).add(dir.multiplyScalar(0.5))
    beam.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
    beam.mesh.scale.set(1, len, 1)
    beam.material.color.setHex(color)
    beam.material.opacity = 0.85
    beam.mesh.visible = true
    beam.active = true
    beam.life = 0.075
    beam.maxLife = 0.075
  }

  addRing(position, { color = 0xff4058, radius = 0.5, end = 3, life = 0.5, opacity = 0.8, thickness = 0.12 } = {}) {
    let ring = this.rings.find(r => !r.active)
    if (!ring) {
      if (this.rings.length >= 20) return
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const mesh = new THREE.Mesh(new THREE.RingGeometry(1 - thickness, 1, 64), material)
      mesh.rotation.x = -Math.PI / 2
      mesh.renderOrder = 4
      this.scene.add(mesh)
      ring = { mesh, material, active: false }
      this.rings.push(ring)
    }
    ring.mesh.position.copy(position)
    ring.mesh.scale.setScalar(radius)
    ring.mesh.visible = true
    ring.material.color.setHex(color)
    ring.material.opacity = opacity
    ring.active = true
    ring.life = life
    ring.maxLife = life
    ring.start = radius
    ring.end = end
    ring.opacity = opacity
  }

  banishColumn(position, color = 0xffd58d) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 1.4
      const p = position.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.2, Math.sin(a) * r))
      const v = new THREE.Vector3(Math.cos(a) * 0.5, 3.5 + Math.random() * 3.5, Math.sin(a) * 0.5)
      this.spawnParticle(this.sparks, p, v, new THREE.Color(color), 1.2, 1.4)
    }
  }

  update(dt) {
    const updateSystem = (system, drag, floorY) => {
      if (system.data.length === 0) return
      const pos = system.positions
      const col = system.colors
      let any = false
      for (let i = 0; i < system.count; i++) {
        const d = system.data[i]
        if (!d || d.life <= 0) {
          if (d) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0
          continue
        }
        any = true
        d.life -= dt
        d.vx *= Math.pow(drag, dt * 60)
        d.vz *= Math.pow(drag, dt * 60)
        d.vy += d.gravity * dt
        pos[i * 3] += d.vx * dt
        pos[i * 3 + 1] += d.vy * dt
        pos[i * 3 + 2] += d.vz * dt
        if (pos[i * 3 + 1] < floorY) {
          pos[i * 3 + 1] = floorY
          d.vy *= -0.25
          d.vx *= 0.5
          d.vz *= 0.5
        }
        const fade = Math.max(0, d.life / d.maxLife)
        col[i * 3] *= Math.pow(fade, 0.35)
        col[i * 3 + 1] *= Math.pow(fade, 0.35)
        col[i * 3 + 2] *= Math.pow(fade, 0.35)
      }
      if (!any) system.geometry.setDrawRange(0, 0)
      system.geometry.attributes.position.needsUpdate = true
      system.geometry.attributes.color.needsUpdate = true
    }
    updateSystem(this.sparks, 0.94, 0.03)
    updateSystem(this.debris, 0.9, 0.03)

    for (const beam of this.beams) {
      if (!beam.active) continue
      beam.life -= dt
      const f = Math.max(0, beam.life / beam.maxLife)
      beam.material.opacity = f
      if (beam.life <= 0) {
        beam.active = false
        beam.mesh.visible = false
      }
    }

    for (const ring of this.rings) {
      if (!ring.active) continue
      ring.life -= dt
      const t = 1 - Math.max(0, ring.life / ring.maxLife)
      const r = ring.start + (ring.end - ring.start) * (1 - Math.pow(1 - t, 2))
      ring.mesh.scale.setScalar(r)
      ring.material.opacity = ring.opacity * (1 - t)
      if (ring.life <= 0) {
        ring.active = false
        ring.mesh.visible = false
      }
    }

    if (this.muzzle) {
      this.muzzle.material.opacity = Math.max(0, this.muzzle.material.opacity - dt * 18)
    }
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 150)
    this.shake = Math.max(0, this.shake - dt * this.shakeDecay)
  }
}
