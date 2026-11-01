/**
 * Temple Codex Cinematic Audio Synthesizer
 * Uses Web Audio API and Audio Element to create authentic Hollywood-grade sound effects:
 *  - Background Soundtrack Support (assets/Jumanji - The Video Game.mp3) with pure chime fallback
 *  - Stone Slab Slam (Deep bass impact with textural stone grind)
 *  - Angelic Harp Chime (Triumphant multi-harmonic chord for correct answers)
 *  - War Drum Thunder Impact (Sub-bass rumble and dissonant crash for wrong answers)
 *  - Mystical Shimmer (Ascending celestial arpeggio for tile reveal)
 *  - Royal Trumpet Fanfare (Grand major brass triumph for full image victory)
 *  - Tension Clock Tick & Timeout Gong (For the carnival countdown timer)
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('picture_reveal_muted') === 'true';
    this.chimeTimer = null;
    this.isAmbienceActive = false;
    this.bgAudio = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('picture_reveal_muted', this.muted);

    if (this.bgAudio) {
      this.bgAudio.muted = this.muted;
      this.bgAudio.volume = this.muted ? 0 : 0.25;
    }

    if (this.muted) {
      this.stopWelcomeAmbience();
    } else {
      if (window.gameApp && !window.gameApp.isGameActive) {
        this.startWelcomeAmbience();
      }
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Welcome Screen Soundtrack & Pure Chimes
  // Plays MP3 soundtrack from assets if present, with zero-buzz fallback
  startWelcomeAmbience() {
    this.init();
    if (this.muted) return;
    if (this.isAmbienceActive) return;

    this.isAmbienceActive = true;

    // Try playing MP3 soundtrack from assets if available
    if (!this.bgAudio) {
      try {
        this.bgAudio = new Audio('assets/Jumanji - The Video Game.mp3');
        this.bgAudio.loop = true;
        this.bgAudio.volume = this.muted ? 0 : 0.25;
      } catch (e) {
        this.bgAudio = null;
      }
    }

    if (this.bgAudio) {
      this.bgAudio.muted = this.muted;
      this.bgAudio.volume = this.muted ? 0 : 0.25;
      const playPromise = this.bgAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy blocks HTMLAudio until gesture or file missing, use pure chimes
          this.playCelestialChimeRipples();
        });
      }
    } else {
      this.playCelestialChimeRipples();
    }

    // Gentle backup periodic chime scheduler if no MP3 playing
    const scheduleNext = () => {
      if (!this.isAmbienceActive || this.muted) return;
      this.chimeTimer = setTimeout(() => {
        if (!this.isAmbienceActive || this.muted) return;
        if (!this.bgAudio || this.bgAudio.paused) {
          this.playCelestialChimeRipples();
        }
        scheduleNext();
      }, 5000);
    };

    scheduleNext();
  }

  playCelestialChimeRipples() {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const chords = [
      [659.25, 830.61, 987.77, 1318.51], // E Major
      [587.33, 739.99, 880.00, 1174.66], // D Major
      [659.25, 783.99, 1046.50, 1318.51] // C Major 7
    ];

    const chord = chords[Math.floor(Math.random() * chords.length)];

    chord.forEach((freq, idx) => {
      const noteTime = t + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.035, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 2.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 2.85);
    });
  }

  stopWelcomeAmbience() {
    this.isAmbienceActive = false;
    if (this.chimeTimer) {
      clearTimeout(this.chimeTimer);
      this.chimeTimer = null;
    }
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
        this.bgAudio.currentTime = 0;
      } catch (e) {}
    }
  }

  // Quick subtle UI click
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Heavy stone slab slam when clicking a tile
  playStoneSlam() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.35);

    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.4);

    // Stone scrape noise burst
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, t);
    filter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  // Angelic celestial harp chime (Correct Answer)
  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22];
    notes.forEach((freq, idx) => {
      const startTime = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.85);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.9);
    });
  }

  // Deep War Drum / Thunder Impact (Wrong Answer)
  playIncorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const lowFreqs = [82.4, 116.5, 123.4];
    lowFreqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, t + 0.6);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, t);
      filter.frequency.exponentialRampToValueAtTime(70, t + 0.6);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.7);
    });
  }

  // Mystical upward shimmer on tile reveal
  playReveal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    freqs.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  // Royal Trumpet Fanfare (Grand Reveal / Victory)
  playWinFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const fanfareSequence = [
      { notes: [392.00, 523.25], time: 0, dur: 0.18 },
      { notes: [523.25, 659.25], time: 0.2, dur: 0.18 },
      { notes: [659.25, 783.99], time: 0.4, dur: 0.22 },
      { notes: [783.99, 1046.50], time: 0.65, dur: 0.22 },
      { notes: [659.25, 783.99, 1046.50, 1318.51], time: 0.95, dur: 1.8 }
    ];

    fanfareSequence.forEach(({ notes, time, dur }) => {
      const startTime = this.ctx.currentTime + time;
      notes.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(0.24, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + dur + 0.1);
      });
    });
  }

  // Tension clock tick (Countdown Timer)
  playTick(isUrgent = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isUrgent ? 1100 : 800, t);
    osc.frequency.exponentialRampToValueAtTime(isUrgent ? 500 : 350, t + 0.03);

    gain.gain.setValueAtTime(isUrgent ? 0.2 : 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Deep Timeout Gong (Timer ran out)
  playTimeout() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [180, 220, 290];
    freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 1.2);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 1.25);
    });
  }
}

window.soundEngine = new SoundEngine();
