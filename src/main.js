import * as THREE from 'three'
import { createWorld, THEMES } from './world.js'
import { createHunter, createEnemy, createBoss, createHealthPickup, createProjectileMesh } from './actors.js'
import { makeGlowTexture } from './textures.js'
import { FX } from './fx.js'
import { audio } from './audio.js'

const $ = (id) => document.getElementById(id)
const canvas = $('game')
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 220)
camera.position.set(0, 17.5, 23)
camera.lookAt(0, 1.1, 0)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
const world = createWorld(scene, renderer)
const glow = makeGlowTexture()
const fx = new FX(scene, glow)
const hunter = createHunter(glow)
scene.add(hunter.root)

const raycaster = new THREE.Raycaster()
const pointerNdc = new THREE.Vector2()
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const aimPoint = new THREE.Vector3(0, 0, -4)
const clock = new THREE.Clock()
const keys = new Set()
const enemies = []
const enemyBolts = []
const pickups = []
const ammoNodes = []
const state = {
  mode: 'menu', floor: 1, hp: 100, maxHp: 100, ammo: 6, maxAmmo: 6,
  reloading: 0, fireWait: 0, dashWait: 0, dashTime: 0, invulnerable: 0,
  kills: 0, headshots: 0, damageTaken: 0, damageDealt: 0, elapsed: 0,
  spawnTimer: 0, floorDelay: 0, interact: 0, scoreTime: 0,
  boss: null, bossHp: 1800, bossAttack: 2, bossBanishable: false,
  move: new THREE.Vector3(), lastAim: new THREE.Vector3(0, 0, -1), toastTimer: 0,
  mobileMove: new THREE.Vector2(), touchFire: false
}

for (let i = 0; i < state.maxAmmo; i++) {
  const pip = document.createElement('i')
  $('ammo-pips').appendChild(pip)
  ammoNodes.push(pip)
}
for (let i = 0; i < 10; i++) {
  const pip = document.createElement('i')
  $('floor-pips').appendChild(pip)
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

function toast(text, tone = '') {
  const el = document.createElement('div')
  el.className = `toast ${tone}`
  el.textContent = text
  $('toast-layer').appendChild(el)
  window.setTimeout(() => el.remove(), 2400)
}
function themeForFloor(floor = state.floor) { return Math.min(2, Math.floor((floor - 1) / 10)) }
function isBossFloor() { return state.floor === 30 }
function livingEnemies() { return enemies.filter(e => e.hp > 0) }
function pos(x, z, y = 0) { return new THREE.Vector3(x, y, z) }
function setMode(mode) {
  state.mode = mode
  document.body.classList.toggle('in-menu', mode === 'menu')
  $('hud').classList.toggle('on', mode === 'playing')
  $('hud').setAttribute('aria-hidden', mode !== 'playing' ? 'true' : 'false')
  $('start-screen').classList.toggle('closing', mode !== 'menu')
  $('pause-screen').classList.toggle('hidden', mode !== 'paused')
  $('dead-screen').classList.toggle('hidden', mode !== 'dead')
  $('victory-screen').classList.toggle('hidden', mode !== 'victory')
}
function updateTheme(floor) {
  const ti = themeForFloor(floor), theme = THEMES[ti]
  world.setTheme(ti)
  world.setSign({ levelRoman: theme.roman, floor: ((floor - 1) % 10) + 1, name: theme.name, accent: theme.accentCss, boss: floor === 30 })
  $('level-label').textContent = `LEVEL ${theme.roman} · ${theme.name}`
  $('floor-num').textContent = `-${String(floor).padStart(2, '0')}`
  $('floor-num').classList.toggle('boss', floor === 30)
  $('floor-pips').classList.toggle('boss', floor === 30)
  Array.from($('floor-pips').children).forEach((el, i) => {
    const localFloor = ((floor - 1) % 10)
    el.className = i < localFloor ? 'done' : i === localFloor ? 'current' : ''
  })
  if (floor === 30) {
    $('objective').textContent = 'DEFEAT THE GRAVE WARDEN'
    $('objective').classList.add('alert')
  } else {
    $('objective').textContent = 'PURGE THE FLOOR'
    $('objective').classList.remove('alert')
  }
}
function clearActors() {
  for (const e of enemies) scene.remove(e.actor.root)
  enemies.length = 0
  for (const p of enemyBolts) { scene.remove(p.mesh.group); p.mesh.group.traverse(o => { if (o.geometry) o.geometry.dispose() }) }
  enemyBolts.length = 0
  for (const p of pickups) scene.remove(p.actor.group)
  pickups.length = 0
  if (state.boss) { scene.remove(state.boss.actor.root); state.boss = null }
  world.setBossArea(false)
  $('boss-ui').classList.remove('show')
}
function spawnEnemy(type, x, z, extra = {}) {
  const actor = createEnemy(type, glow)
  actor.root.position.set(x, 0, z)
  scene.add(actor.root)
  const difficulty = 1 + (state.floor - 1) * 0.035
  const stats = {
    husk: { hp: 70, speed: 1.55, damage: 8, range: 1.55, scale: 1 },
    crawler: { hp: 45, speed: 2.45, damage: 6, range: 1.2, scale: 0.82 },
    brute: { hp: 150, speed: 0.92, damage: 17, range: 1.9, scale: 1.25 },
    wretch: { hp: 58, speed: 1.12, damage: 8, range: 7.5, scale: 0.92 }
  }[type]
  actor.root.scale.setScalar(stats.scale)
  enemies.push({ actor, type, hp: stats.hp * difficulty, maxHp: stats.hp * difficulty,
    speed: stats.speed * (1 + (state.floor - 1) * 0.006), damage: stats.damage, range: stats.range,
    attack: 0.5 + Math.random() * 1.2, hitFlash: 0, ...extra })
  return enemies[enemies.length - 1]
}
function spawnFloor() {
  clearActors()
  updateTheme(state.floor)
  state.floorDelay = 0
  state.spawnTimer = 0
  state.interact = 0
  state.bossBanishable = false
  hunter.root.position.set(0, 0, 4.2)
  hunter.root.rotation.y = Math.PI
  if (isBossFloor()) {
    world.setBossArea(true)
    const actor = createBoss(glow)
    actor.root.position.set(0, 0, -2.7)
    scene.add(actor.root)
    state.boss = { actor, hp: state.bossHp, maxHp: state.bossHp, attack: 1.7, slam: 3.8, hurt: 0 }
    $('boss-ui').classList.add('show')
    $('boss-name').textContent = 'THE GRAVE WARDEN'
    $('boss-state').textContent = 'BANISH THE WARDEN'
    toast('THE GRAVE WARDEN AWAKENS', 'red')
    audio.bossRoar()
  } else {
    const count = Math.min(3 + Math.floor(state.floor * 0.62), 14)
    const types = state.floor < 4 ? ['husk', 'crawler'] : state.floor < 11 ? ['husk', 'crawler', 'brute'] : state.floor < 21 ? ['husk', 'crawler', 'brute', 'wretch'] : ['crawler', 'brute', 'wretch']
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2 + Math.random() * 0.3
      const radius = 5.5 + Math.random() * 2.1
      const type = types[Math.floor(Math.random() * types.length)]
      spawnEnemy(type, Math.cos(a) * radius, Math.sin(a) * radius - 0.8)
    }
    $('hostile-count').textContent = String(count)
  }
  updateHud()
}
function startGame() {
  state.hp = state.maxHp; state.ammo = state.maxAmmo; state.reloading = 0; state.fireWait = 0
  state.dashWait = 0; state.dashTime = 0; state.invulnerable = 0; state.kills = 0
  state.headshots = 0; state.damageTaken = 0; state.damageDealt = 0; state.elapsed = 0
  state.floor = 1; state.bossHp = 1800
  $('start-screen').classList.remove('closing')
  setMode('playing')
  audio.init(); audio.startAmbient()
  spawnFloor()
  toast('DESCEND INTO THE DARK', 'gold')
}
function updateHud() {
  const hp = Math.max(0, state.hp / state.maxHp)
  $('hp-fill').style.transform = `scaleX(${hp})`
  $('hp-fill').classList.toggle('low', hp < 0.3)
  $('hp-text').textContent = String(Math.ceil(state.hp))
  $('dash-label').textContent = state.dashWait <= 0 ? 'DASH READY' : `DASH ${state.dashWait.toFixed(1)}s`
  $('dash-label').classList.toggle('ready', state.dashWait <= 0)
  $('dash-pips').classList.toggle('ready', state.dashWait <= 0)
  $('hostile-count').textContent = String(livingEnemies().length + (state.boss && state.boss.hp > 0 ? 1 : 0))
  $('hostile-count').classList.toggle('clear', livingEnemies().length === 0 && !state.boss)
  $('kill-count').textContent = String(state.kills)
  $('stat-damage').textContent = `${Math.round(state.damageDealt)} DMG`
  ammoNodes.forEach((node, i) => node.classList.toggle('spent', i >= state.ammo))
  $('reload-label').textContent = state.reloading > 0 ? `RELOADING ${state.reloading.toFixed(1)}s` : state.ammo === 0 ? 'PRESS R TO RELOAD' : 'READY'
  $('reload-label').classList.toggle('reloading', state.reloading > 0)
  $('boss-fill').style.transform = `scaleX(${Math.max(0, state.boss ? state.boss.hp / state.boss.maxHp : 0)})`
  $('boss-hp-text').textContent = String(Math.ceil(state.boss?.hp || 0))
  $('low-health').classList.toggle('on', hp < 0.25)
  $('interact').classList.toggle('show', !!state.bossBanishable)
  $('interact-fill').style.width = `${Math.min(1, state.interact / 2.2) * 100}%`
}
function aimFromPointer() {
  raycaster.setFromCamera(pointerNdc, camera)
  const hit = new THREE.Vector3()
  if (raycaster.ray.intersectPlane(groundPlane, hit)) {
    hit.x = THREE.MathUtils.clamp(hit.x, -8.7, 8.7)
    hit.z = THREE.MathUtils.clamp(hit.z, -8.7, 8.7)
    aimPoint.copy(hit)
  }
}
function damagePlayer(amount) {
  if (state.invulnerable > 0 || state.mode !== 'playing') return
  state.hp = Math.max(0, state.hp - amount)
  state.damageTaken += amount
  state.invulnerable = 0.7
  $('damage-flash').classList.remove('hit')
  void $('damage-flash').offsetWidth
  $('damage-flash').classList.add('hit')
  fx.shake = Math.max(fx.shake, 0.18)
  audio.hurt()
  if (state.hp <= 0) {
    $('dead-sub').textContent = `You reached floor -${String(state.floor).padStart(2, '0')} and felled ${state.kills} monsters.`
    setMode('dead')
  }
  updateHud()
}
function reload() {
  if (state.mode !== 'playing' || state.reloading > 0 || state.ammo === state.maxAmmo) return
  state.reloading = 1.15
  audio.reload()
}
function fire() {
  if (state.mode !== 'playing' || state.fireWait > 0 || state.reloading > 0) return
  if (state.ammo <= 0) { audio.empty(); reload(); return }
  state.ammo--; state.fireWait = 0.25; hunter.recoil = 1
  audio.shot()
  const origin = hunter.root.position.clone().add(pos(0, 1.45, 0))
  const target = aimPoint.clone(); target.y = 1.25
  const dir = target.sub(origin).normalize()
  hunter.root.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI
  const targets = []
  for (const e of livingEnemies()) for (const box of e.actor.hitboxes) targets.push({ box, entity: e })
  if (state.boss?.hp > 0) for (const box of state.boss.actor.hitboxes) targets.push({ box, entity: state.boss, boss: true })
  raycaster.set(origin, dir)
  raycaster.far = 35
  const intersections = raycaster.intersectObjects(targets.map(t => t.box), false)
  let end = origin.clone().addScaledVector(dir, 25)
  if (intersections.length) {
    const hit = intersections[0], entry = targets.find(t => t.box === hit.object)
    end.copy(hit.point)
    const headshot = hit.object.userData.hitPart === 'head'
    const chestshot = hit.object.userData.hitPart === 'chest'
    const damage = (headshot ? 105 : chestshot ? 82 : 48) * (entry.boss ? 1 : 1 + (state.floor - 1) * 0.005)
    entry.entity.hp = Math.max(0, entry.entity.hp - damage)
    state.damageDealt += damage
    entry.entity.actor.flash = 1
    audio.hit(headshot)
    fx.hit(hit.point, headshot ? 0xffd28a : 0xff6a48, headshot)
    $('hitmarker').classList.toggle('head', headshot)
    $('hitmarker').classList.remove('show'); void $('hitmarker').offsetWidth; $('hitmarker').classList.add('show')
    if (entry.boss) {
      state.bossHp = entry.entity.hp
      if (entry.entity.hp <= 0) bossDefeated()
    } else if (entry.entity.hp <= 0) killEnemy(entry.entity)
  }
  fx.addBeam(origin, end, 0xffd28a)
  fx.muzzleFlash(origin, dir)
  $('crosshair').classList.add('fire')
  window.setTimeout(() => $('crosshair').classList.remove('fire'), 90)
  if (state.ammo === 0) reload()
  updateHud()
}
function killEnemy(enemy) {
  if (enemy.dead) return
  enemy.dead = true
  state.kills++
  const p = enemy.actor.root.position.clone().add(pos(0, 1, 0))
  fx.death(p, enemy.type === 'wretch' ? 0x4ce3cb : 0xff7138)
  audio.kill()
  scene.remove(enemy.actor.root)
  const i = enemies.indexOf(enemy)
  if (i >= 0) enemies.splice(i, 1)
  if (Math.random() < 0.18 && state.hp < state.maxHp - 12) {
    const actor = createHealthPickup(glow)
    actor.group.position.set(p.x, 0.15, p.z)
    scene.add(actor.group)
    pickups.push({ actor, life: 15 })
  }
  if (!livingEnemies().length) completeFloor()
}
function completeFloor() {
  if (state.floorDelay > 0 || state.floor === 30) return
  state.floorDelay = 2.3
  $('objective').textContent = 'FLOOR PURGED · DESCENDING'
  $('objective').classList.remove('alert')
  toast('FLOOR PURGED', 'gold')
  audio.chime()
}
function advanceFloor() {
  if (state.floor >= 30) return
  state.floor++
  state.hp = Math.min(state.maxHp, state.hp + 10)
  state.ammo = state.maxAmmo
  state.reloading = 0
  world.setDescent(true)
  audio.descend()
  $('level-banner').classList.remove('hidden')
  const t = THEMES[themeForFloor(state.floor)]
  $('banner-title').textContent = `STRATUM ${t.roman}`
  $('banner-sub').textContent = t.name
  $('banner-kicker').textContent = `NOW ENTERING · FLOOR -${String(state.floor).padStart(2, '0')}`
  window.setTimeout(() => $('level-banner').classList.add('hidden'), 1900)
  state.floorDelay = -1.6
  updateHud()
}
function bossDefeated() {
  if (!state.boss || state.boss.hp <= 0) return
  state.boss.hp = 0
  state.bossBanishable = true
  $('boss-state').textContent = 'WARDEN EXPOSED · APPROACH AND HOLD E'
  fx.death(state.boss.actor.root.position.clone().add(pos(0, 3, 0)), 0xff4058, true)
  fx.banishColumn(state.boss.actor.root.position.clone())
  audio.banish()
  toast('THE WARDEN IS EXPOSED', 'gold')
  updateHud()
}
function victory() {
  state.bossBanishable = false
  fx.banishColumn(pos(0, 0, -2.7))
  audio.victory()
  $('stat-time').textContent = `${String(Math.floor(state.elapsed / 60)).padStart(2, '0')}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')}`
  $('stat-kills').textContent = String(state.kills + 1)
  $('stat-headshots').textContent = String(state.headshots)
  $('stat-taken').textContent = String(Math.round(state.damageTaken))
  const best = Number(localStorage.getItem('monsterHunterBest') || Infinity)
  if (state.elapsed < best) localStorage.setItem('monsterHunterBest', String(Math.floor(state.elapsed)))
  $('victory-sub').textContent = `The Warden is bound. You cleared all 30 floors in ${Math.floor(state.elapsed / 60)}m ${Math.floor(state.elapsed % 60)}s.`
  setMode('victory')
}

function updateEnemies(dt, t) {
  const player = hunter.root.position
  for (const enemy of enemies.slice()) {
    const p = enemy.actor.root.position
    const delta = player.clone().sub(p); delta.y = 0
    const distance = delta.length()
    const toward = delta.clone().normalize()
    const isRanged = enemy.type === 'wretch'
    const move = isRanged ? distance > 5.6 : distance > enemy.range
    if (move) {
      p.addScaledVector(toward, enemy.speed * dt)
      p.x = THREE.MathUtils.clamp(p.x, -8.3, 8.3); p.z = THREE.MathUtils.clamp(p.z, -8.3, 8.3)
    }
    enemy.actor.root.rotation.y = Math.atan2(toward.x, toward.z)
    enemy.actor.animate(dt, t, enemy.speed, move)
    enemy.attack -= dt
    if (isRanged && distance < 10 && enemy.attack <= 0) {
      enemy.attack = 2.6 + Math.random() * 0.8
      const mesh = createProjectileMesh(0x5df0d5, 0.23, glow)
      const start = p.clone().add(pos(0, 1.45, 0))
      mesh.group.position.copy(start); scene.add(mesh.group)
      enemyBolts.push({ mesh, pos: start, velocity: toward.multiplyScalar(5.5).add(pos(0, 0.2, 0)), damage: enemy.damage, life: 4 })
      audio.spit()
    } else if (!isRanged && distance < enemy.range + 0.2 && enemy.attack <= 0) {
      enemy.attack = enemy.type === 'brute' ? 1.65 : 1.15
      damagePlayer(enemy.damage)
    }
  }
}
function updateBoss(dt, t) {
  const boss = state.boss
  if (!boss || boss.hp <= 0) return
  const p = boss.actor.root.position, player = hunter.root.position
  const delta = player.clone().sub(p); delta.y = 0
  const d = delta.length(), toward = delta.clone().normalize()
  boss.actor.root.rotation.y = Math.atan2(toward.x, toward.z)
  boss.actor.animate(dt, t, d < 4)
  boss.attack -= dt; boss.slam -= dt
  if (d > 3.2) p.addScaledVector(toward, 0.58 * dt)
  p.x = THREE.MathUtils.clamp(p.x, -5.8, 5.8); p.z = THREE.MathUtils.clamp(p.z, -6.5, 5.3)
  if (d < 3.5 && boss.attack <= 0) {
    boss.attack = 1.8
    damagePlayer(16)
    audio.bossSlam()
    fx.addRing(player.clone(), { color: 0xff4058, radius: 0.5, end: 3.4, life: 0.38 })
  }
  if (boss.slam <= 0 && d > 3.2) {
    boss.slam = 4.6
    const mesh = createProjectileMesh(0xff3048, 0.42, glow)
    const start = p.clone().add(pos(0, 2.5, 0))
    mesh.group.position.copy(start); scene.add(mesh.group)
    enemyBolts.push({ mesh, pos: start, velocity: toward.multiplyScalar(4.4).add(pos(0, 0.2, 0)), damage: 13, life: 5, bossBolt: true })
    audio.bossSlam()
  }
}
function updateProjectiles(dt) {
  for (const b of enemyBolts.slice()) {
    b.pos.addScaledVector(b.velocity, dt)
    b.mesh.group.position.copy(b.pos)
    b.mesh.group.rotation.y += dt * 3
    b.life -= dt
    if (b.pos.distanceTo(hunter.root.position.clone().add(pos(0, 1, 0))) < 0.8) {
      damagePlayer(b.damage); b.life = 0
      fx.hit(b.pos, b.bossBolt ? 0xff3048 : 0x5df0d5)
    }
    if (b.life <= 0 || Math.abs(b.pos.x) > 10 || Math.abs(b.pos.z) > 10) {
      scene.remove(b.mesh.group)
      enemyBolts.splice(enemyBolts.indexOf(b), 1)
    }
  }
}
function updatePickups(dt, t) {
  for (const p of pickups.slice()) {
    p.life -= dt
    p.actor.group.rotation.y += dt * 1.3
    p.actor.group.position.y = 0.18 + Math.sin(t * 3 + p.life) * 0.12
    if (p.actor.group.position.distanceTo(hunter.root.position) < 1.2) {
      state.hp = Math.min(state.maxHp, state.hp + 24)
      scene.remove(p.actor.group); pickups.splice(pickups.indexOf(p), 1)
      audio.pickup(); toast('VITALITY RESTORED', 'gold')
    } else if (p.life <= 0) {
      scene.remove(p.actor.group); pickups.splice(pickups.indexOf(p), 1)
    }
  }
}

function update(dt) {
  const t = clock.elapsedTime
  world.update(dt, t)
  fx.update(dt)
  if (state.mode !== 'playing') return
  state.elapsed += dt
  state.fireWait = Math.max(0, state.fireWait - dt)
  state.dashWait = Math.max(0, state.dashWait - dt)
  state.invulnerable = Math.max(0, state.invulnerable - dt)
  if (state.reloading > 0) {
    state.reloading -= dt
    if (state.reloading <= 0) { state.reloading = 0; state.ammo = state.maxAmmo; audio.click() }
  }
  aimFromPointer()
  let mx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + state.mobileMove.x
  let mz = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0) + state.mobileMove.y
  const move = new THREE.Vector3(mx, 0, mz)
  if (move.lengthSq() > 1) move.normalize()
  state.move.copy(move)
  const speed = state.dashTime > 0 ? 14 : 5.1
  if (state.dashTime > 0) state.dashTime -= dt
  if (move.lengthSq()) {
    hunter.root.position.addScaledVector(move, speed * dt)
    hunter.root.position.x = THREE.MathUtils.clamp(hunter.root.position.x, -8.7, 8.7)
    hunter.root.position.z = THREE.MathUtils.clamp(hunter.root.position.z, -8.7, 8.7)
    if (state.dashTime <= 0) hunter.root.rotation.y = Math.atan2(aimPoint.x - hunter.root.position.x, aimPoint.z - hunter.root.position.z) + Math.PI
  }
  hunter.animate(dt, move.lengthSq() > 0, speed, t)
  if (state.touchFire || keys.has(' ') || mouseDown) fire()
  updateEnemies(dt, t)
  updateBoss(dt, t)
  updateProjectiles(dt)
  updatePickups(dt, t)
  if (state.floorDelay > 0) { state.floorDelay -= dt; if (state.floorDelay <= 0) advanceFloor() }
  else if (state.floorDelay < 0) { state.floorDelay += dt; if (state.floorDelay >= 0) { state.floorDelay = 0; world.setDescent(false); spawnFloor() } }
  if (state.bossBanishable) {
    const near = hunter.root.position.distanceTo(state.boss.actor.root.position) < 3.2
    if (near && keys.has('e')) state.interact += dt
    else state.interact = Math.max(0, state.interact - dt * 1.4)
    if (state.interact >= 2.2) victory()
  }
  const shake = fx.shake
  camera.position.set(Math.sin(t * 37) * shake, 17.5 + Math.sin(t * 29) * shake * 0.45, 23 + Math.cos(t * 31) * shake)
  camera.lookAt(0, 1.1, 0)
  updateHud()
}
let mouseDown = false
function frame() {
  const dt = Math.min(clock.getDelta(), 0.04)
  update(dt)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault()
  keys.add(key)
  if (key === 'r') reload()
  if (key === ' ' && state.mode === 'playing' && state.dashWait <= 0) {
    const dir = state.move.lengthSq() ? state.move.clone() : state.lastAim.clone().negate()
    state.lastAim.copy(dir); state.dashWait = 1.55; state.dashTime = 0.18; state.invulnerable = 0.3; audio.dash()
    fx.burst(hunter.root.position.clone().add(pos(0, 0.8, 0)), { color: 0x5df0d5, count: 15, speed: 4, life: 0.35, gravity: 0, up: 0.2 })
  }
  if (key === 'escape' && state.mode === 'playing') { setMode('paused'); mouseDown = false }
  else if (key === 'escape' && state.mode === 'paused') setMode('playing')
})
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))
window.addEventListener('blur', () => { keys.clear(); mouseDown = false })
window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  pointerNdc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
})
window.addEventListener('mousedown', (e) => { if (e.button === 0 && state.mode === 'playing') { mouseDown = true; audio.init() } })
window.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false })
canvas.addEventListener('contextmenu', e => e.preventDefault())
$('start-btn').addEventListener('click', startGame)
$('resume-btn').addEventListener('click', () => setMode('playing'))
$('quit-btn').addEventListener('click', () => { clearActors(); setMode('menu') })
$('dead-quit-btn').addEventListener('click', () => { clearActors(); setMode('menu') })
$('retry-btn').addEventListener('click', () => { state.hp = state.maxHp; state.ammo = state.maxAmmo; setMode('playing'); spawnFloor() })
$('again-btn').addEventListener('click', startGame)
$('victory-quit-btn').addEventListener('click', () => { clearActors(); setMode('menu') })
$('best-run').textContent = localStorage.getItem('monsterHunterBest') ? `BEST DESCENT · ${Math.floor(Number(localStorage.getItem('monsterHunterBest')) / 60)}:${String(Number(localStorage.getItem('monsterHunterBest')) % 60).padStart(2, '0')}` : 'NO HUNT RECORDED'

const touchStick = $('touch-stick'), stickKnob = touchStick.querySelector('i')
let touchId = null
function touchMove(e) {
  const touch = [...e.changedTouches].find(t => t.identifier === touchId)
  if (!touch) return
  const r = touchStick.getBoundingClientRect(), dx = touch.clientX - (r.left + r.width / 2), dy = touch.clientY - (r.top + r.height / 2)
  const len = Math.min(38, Math.hypot(dx, dy)), a = Math.atan2(dy, dx)
  const x = Math.cos(a) * len, y = Math.sin(a) * len
  stickKnob.style.transform = `translate(${x}px,${y}px)`
  state.mobileMove.set(x / 38, y / 38)
  pointerNdc.set((touch.clientX / innerWidth) * 2 - 1, -(touch.clientY / innerHeight) * 2 + 1)
}
touchStick.addEventListener('touchstart', e => { e.preventDefault(); touchId = e.changedTouches[0].identifier; touchMove(e) }, { passive: false })
touchStick.addEventListener('touchmove', e => { e.preventDefault(); touchMove(e) }, { passive: false })
touchStick.addEventListener('touchend', e => { if ([...e.changedTouches].some(t => t.identifier === touchId)) { touchId = null; state.mobileMove.set(0, 0); stickKnob.style.transform = '' } })
$('touch-fire').addEventListener('touchstart', e => { e.preventDefault(); state.touchFire = true }, { passive: false })
$('touch-fire').addEventListener('touchend', () => { state.touchFire = false })
$('touch-dash').addEventListener('touchstart', e => { e.preventDefault(); if (state.dashWait <= 0) { state.dashWait = 1.55; state.dashTime = 0.18; state.invulnerable = 0.3; audio.dash() } }, { passive: false })
