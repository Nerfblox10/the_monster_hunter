// Procedural audio. No assets: every sound is synthesized with WebAudio.
export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.ambient = null
    this.noise = null
    this.creakTimer = null
    this.muted = false
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 22
    comp.ratio.value = 5
    comp.attack.value = 0.004
    comp.release.value = 0.22
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.72
    this.master.connect(comp)
    comp.connect(this.ctx.destination)
    this.noise = this.makeNoise(2)
    this.startAmbient()
  }

  makeNoise(seconds = 1) {
    const rate = this.ctx.sampleRate
    const buffer = this.ctx.createBuffer(1, rate * seconds, rate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.04 * white) / 1.04
      data[i] = last * 2.6
    }
    return buffer
  }

  now() { return this.ctx ? this.ctx.currentTime : 0 }

  tone({ freq = 220, end = freq, dur = 0.2, type = 'sine', gain = 0.15, delay = 0, slide = 'exp' }) {
    if (!this.ctx) return
    const t = this.now() + delay
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(20, freq), t)
    if (end !== freq) {
      if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur)
      else osc.frequency.linearRampToValueAtTime(Math.max(20, end), t + dur)
    }
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.012, dur * 0.2))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }

  noiseBurst({ dur = 0.2, gain = 0.2, freq = 1200, q = 0.8, type = 'lowpass', delay = 0, sweep = null }) {
    if (!this.ctx) return
    const t = this.now() + delay
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t)
    filter.Q.value = q
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    src.start(t, Math.random() * 0.5)
    src.stop(t + dur + 0.02)
  }

  startAmbient() {
    if (!this.ctx) return
    const t = this.now()
    const bus = this.ctx.createGain()
    bus.gain.value = 0
    bus.gain.linearRampToValueAtTime(0.11, t + 2.5)
    bus.connect(this.master)

    const drone = this.ctx.createOscillator()
    drone.type = 'sawtooth'
    drone.frequency.value = 42
    const droneFilter = this.ctx.createBiquadFilter()
    droneFilter.type = 'lowpass'
    droneFilter.frequency.value = 120
    droneFilter.Q.value = 3
    const droneGain = this.ctx.createGain()
    droneGain.gain.value = 0.22
    drone.connect(droneFilter)
    droneFilter.connect(droneGain)
    droneGain.connect(bus)
    drone.start(t)

    const fifth = this.ctx.createOscillator()
    fifth.type = 'sine'
    fifth.frequency.value = 63.5
    const fifthGain = this.ctx.createGain()
    fifthGain.gain.value = 0.1
    fifth.connect(fifthGain)
    fifthGain.connect(bus)
    fifth.start(t)

    const wind = this.ctx.createBufferSource()
    wind.buffer = this.noise
    wind.loop = true
    const windFilter = this.ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 240
    windFilter.Q.value = 0.6
    const windGain = this.ctx.createGain()
    windGain.gain.value = 0.16
    wind.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(bus)
    wind.start(t)

    const lfo = this.ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.06
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 38
    lfo.connect(lfoGain)
    lfoGain.connect(droneFilter.frequency)
    lfo.start(t)

    this.ambient = { bus, drone, fifth, wind, lfo }
    this.scheduleCreak()
  }

  scheduleCreak() {
    if (!this.ctx) return
    clearTimeout(this.creakTimer)
    const delay = 5000 + Math.random() * 9000
    this.creakTimer = setTimeout(() => {
      if (!this.ctx) return
      this.noiseBurst({ dur: 0.9, gain: 0.035, freq: 700 + Math.random() * 700, q: 9, type: 'bandpass', sweep: 220 })
      this.tone({ freq: 90 + Math.random() * 30, end: 55, dur: 1.4, type: 'triangle', gain: 0.025 })
      this.scheduleCreak()
    }, delay)
  }

  setDepth(intensity = 0) {
    if (!this.ambient || !this.ctx) return
    this.ambient.wind.playbackRate.value = 1 + intensity * 0.7
    this.ambient.bus.gain.setTargetAtTime(0.11 + intensity * 0.07, this.now(), 0.3)
  }

  shot() {
    this.noiseBurst({ dur: 0.14, gain: 0.34, freq: 5200, q: 1.1, type: 'highpass', sweep: 900 })
    this.tone({ freq: 150, end: 44, dur: 0.22, type: 'sawtooth', gain: 0.22 })
    this.tone({ freq: 880, end: 160, dur: 0.1, type: 'square', gain: 0.055 })
  }
  empty() { this.tone({ freq: 260, end: 180, dur: 0.05, type: 'square', gain: 0.05 }) }
  reload() {
    this.noiseBurst({ dur: 0.05, gain: 0.1, freq: 2600, q: 2, type: 'bandpass' })
    this.tone({ freq: 340, end: 220, dur: 0.06, type: 'square', gain: 0.04, delay: 0.28 })
    this.noiseBurst({ dur: 0.07, gain: 0.12, freq: 1800, q: 2, type: 'bandpass', delay: 0.48 })
    this.tone({ freq: 620, end: 420, dur: 0.08, type: 'triangle', gain: 0.045, delay: 0.72 })
  }
  hit(head = false) {
    if (head) {
      this.tone({ freq: 1250, end: 820, dur: 0.09, type: 'triangle', gain: 0.14 })
      this.noiseBurst({ dur: 0.06, gain: 0.12, freq: 3800, q: 2, type: 'bandpass' })
    } else {
      this.tone({ freq: 520, end: 340, dur: 0.05, type: 'square', gain: 0.06 })
      this.noiseBurst({ dur: 0.045, gain: 0.09, freq: 2200, q: 1.5, type: 'bandpass' })
    }
  }
  kill() {
    this.tone({ freq: 180, end: 42, dur: 0.5, type: 'sawtooth', gain: 0.13 })
    this.noiseBurst({ dur: 0.45, gain: 0.12, freq: 1100, q: 0.7, sweep: 180 })
  }
  hurt() {
    this.tone({ freq: 120, end: 38, dur: 0.35, type: 'sawtooth', gain: 0.22 })
    this.noiseBurst({ dur: 0.25, gain: 0.2, freq: 900, q: 0.6, sweep: 120 })
  }
  dash() {
    this.noiseBurst({ dur: 0.26, gain: 0.18, freq: 600, q: 0.7, type: 'bandpass', sweep: 3200 })
    this.tone({ freq: 320, end: 700, dur: 0.18, type: 'sine', gain: 0.045 })
  }
  pickup() {
    this.tone({ freq: 620, end: 880, dur: 0.12, type: 'sine', gain: 0.1 })
    this.tone({ freq: 930, end: 1240, dur: 0.16, type: 'sine', gain: 0.07, delay: 0.08 })
  }
  chime() {
    this.tone({ freq: 523.25, dur: 0.8, type: 'sine', gain: 0.12 })
    this.tone({ freq: 659.25, dur: 1.0, type: 'sine', gain: 0.08, delay: 0.12 })
    this.tone({ freq: 783.99, dur: 1.3, type: 'sine', gain: 0.06, delay: 0.26 })
  }
  bossRoar() {
    this.tone({ freq: 58, end: 31, dur: 2.2, type: 'sawtooth', gain: 0.3 })
    this.tone({ freq: 92, end: 44, dur: 1.8, type: 'square', gain: 0.11, delay: 0.08 })
    this.noiseBurst({ dur: 2.1, gain: 0.2, freq: 700, q: 0.5, sweep: 90 })
  }
  bossSlam() {
    this.tone({ freq: 82, end: 24, dur: 0.8, type: 'sawtooth', gain: 0.32 })
    this.noiseBurst({ dur: 0.7, gain: 0.3, freq: 500, q: 0.4, sweep: 60 })
  }
  spit() {
    this.tone({ freq: 210, end: 95, dur: 0.25, type: 'sawtooth', gain: 0.07 })
    this.noiseBurst({ dur: 0.22, gain: 0.08, freq: 800, q: 3, sweep: 280 })
  }
  descend(stop = false) {
    if (stop) {
      this.noiseBurst({ dur: 0.22, gain: 0.16, freq: 600, q: 0.6, type: 'lowpass', sweep: 90 })
      this.tone({ freq: 68, end: 42, dur: 0.5, type: 'sine', gain: 0.2 })
      return
    }
    this.noiseBurst({ dur: 1.9, gain: 0.13, freq: 320, q: 0.5, type: 'lowpass', sweep: 80 })
    this.tone({ freq: 55, end: 36, dur: 1.9, type: 'sawtooth', gain: 0.1 })
  }
  banish() {
    this.tone({ freq: 146.8, dur: 3.2, type: 'sine', gain: 0.18 })
    this.tone({ freq: 220, dur: 3.0, type: 'sine', gain: 0.12, delay: 0.28 })
    this.tone({ freq: 293.6, dur: 2.8, type: 'sine', gain: 0.1, delay: 0.56 })
    this.tone({ freq: 440, dur: 2.6, type: 'sine', gain: 0.08, delay: 0.9 })
    this.noiseBurst({ dur: 2.8, gain: 0.14, freq: 500, q: 0.8, type: 'bandpass', sweep: 4200 })
  }
  victory() {
    const notes = [261.6, 329.6, 392, 523.3, 659.3]
    notes.forEach((f, i) => this.tone({ freq: f, dur: 1.6 + i * 0.2, type: 'sine', gain: 0.09, delay: i * 0.22 }))
  }
  click() { this.tone({ freq: 880, end: 520, dur: 0.05, type: 'square', gain: 0.04 }) }
}

export const audio = new AudioEngine()
