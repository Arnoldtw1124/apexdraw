/**
 * Web Audio API Sound Synthesizer
 * No external audio files needed - zero loading failures!
 * Default volume set to 65% (0.65).
 */
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
    this.volume = 0.65;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Mechanical tick sound when wheel passes pins
  playTick(velocityRatio = 1.0) {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      const freq = 600 + (velocityRatio * 400) + Math.random() * 50;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.03);

      gain.gain.setValueAtTime(this.volume * 0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.035);
    } catch (e) {}
  }

  // Sound played when spin initiates
  playSpinStart() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    } catch (e) {}
  }

  // Fanfare / victory sound when winner is picked
  playWinFanfare() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const notes = [
        { note: 523.25, duration: 0.1, delay: 0 },
        { note: 659.25, duration: 0.1, delay: 0.1 },
        { note: 783.99, duration: 0.1, delay: 0.2 },
        { note: 1046.50, duration: 0.4, delay: 0.3 }
      ];

      notes.forEach(n => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.note, this.audioCtx.currentTime + n.delay);

        gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime + n.delay);
        gain.gain.linearRampToValueAtTime(this.volume * 0.5, this.audioCtx.currentTime + n.delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + n.delay + n.duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(this.audioCtx.currentTime + n.delay);
        osc.stop(this.audioCtx.currentTime + n.delay + n.duration);
      });
    } catch (e) {}
  }

  playWin() {
    this.playWinFanfare();
  }
}

window.SoundEngine = SoundEngine;
window.soundEngine = new SoundEngine();
