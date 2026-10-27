export class Soundscape {
  constructor(enabled = false) { this.enabled = enabled; this.context = null; this.lastShot = 0; }
  unlock() {
    if (!this.enabled) return;
    try { this.context ??= new (window.AudioContext || window.webkitAudioContext)(); this.context.resume().catch(() => {}); } catch { this.context = null; }
  }
  tone(frequency, duration = .12, type = 'sine', volume = .035, delay = 0, endFrequency = frequency) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context, start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
  }
  play(kind) {
    if (!this.enabled || !this.context) return;
    if (kind === 'kill') {
      if (this.context.currentTime - this.lastShot < .09) return;
      this.lastShot = this.context.currentTime; this.tone(380, .08, 'triangle', .018, 0, 170);
    } else if (kind === 'pickup') {
      this.tone(880, .07, 'sine', .018, 0, 1100);
    } else if (kind === 'hurt') {
      this.tone(120, .18, 'sawtooth', .035, 0, 50);
    } else if (kind === 'level') {
      [440, 554.37, 659.25, 880].forEach((f, i) => this.tone(f, .4, 'sine', .04, i * .085));
    } else if (kind === 'choose') {
      [330, 440, 660].forEach((f, i) => this.tone(f, .25, 'triangle', .025, i * .065));
    } else if (kind === 'start') {
      [110, 164.81, 220, 329.63].forEach((f, i) => this.tone(f, .8, 'sine', .035, i * .13));
    } else if (kind === 'boss') {
      [65.41, 69.3, 98].forEach((f, i) => this.tone(f, 1.1, 'triangle', .05, i * .18));
    } else if (kind === 'won') {
      [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => this.tone(f, .7, 'sine', .04, i * .14));
    } else if (kind === 'dead') {
      [220, 196, 146.83, 110].forEach((f, i) => this.tone(f, .65, 'triangle', .035, i * .19));
    }
  }
}
