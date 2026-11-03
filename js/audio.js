/**
 * Temple Codex Cinematic Audio Engine
 * Uses Web Audio API for tactical game sound effects and dedicated HTML5 Audio for the background track:
 *  - Continuous Background Soundtrack: 'assets/Jumanji - The Video Game.mp3'
 *  - Audio Ducking: High-energy on Welcome Screen (45%), soft background during Game & Questions (20% default)
 *  - Live Volume Control via mini range slider
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
    this.isAmbienceActive = false;
    this.bgAudio = null;
    this.trackUrl = 'assets/Jumanji - The Video Game.mp3';
    this.currentMode = 'welcome'; // 'welcome' | 'game'
    this.welcomeVolume = 0.45;
    this.gameVolume = parseFloat(localStorage.getItem('picture_reveal_game_volume')) || 0.20;
    this.fadeInterval = null;
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

  ensureBgAudioLoaded() {
    if (!this.bgAudio) {
      try {
        this.bgAudio = new Audio(encodeURI(this.trackUrl));
        this.bgAudio.loop = true;
      } catch (e) {
        this.bgAudio = null;
      }
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('picture_reveal_muted', this.muted);

    if (this.bgAudio) {
      this.bgAudio.muted = this.muted;
      if (this.muted) {
        this.bgAudio.volume = 0;
      } else {
        const target = this.currentMode === 'welcome' ? this.welcomeVolume : this.gameVolume;
        this.bgAudio.volume = target;
        if (this.bgAudio.paused) {
          this.bgAudio.play().catch(() => {});
        }
      }
    }

    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  setGameVolume(vol) {
    this.gameVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('picture_reveal_game_volume', this.gameVolume);

    if (this.bgAudio && !this.muted && this.currentMode === 'game') {
      this.bgAudio.volume = this.gameVolume;
    }
  }

  getGameVolume() {
    return this.gameVolume;
  }

  fadeAudioTo(targetVol, durationMs = 500) {
    if (!this.bgAudio || this.muted) return;
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const startVol = this.bgAudio.volume;
    const diff = targetVol - startVol;
    const steps = 15;
    const stepTime = durationMs / steps;
    let stepCount = 0;

    this.fadeInterval = setInterval(() => {
      stepCount++;
      const progress = stepCount / steps;
      this.bgAudio.volume = Math.max(0, Math.min(1, startVol + diff * progress));
      if (stepCount >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        this.bgAudio.volume = targetVol;
      }
    }, stepTime);
  }

  // Welcome Screen: Higher energy (45% volume)
  startWelcomeAmbience() {
    this.init();
    this.currentMode = 'welcome';
    this.ensureBgAudioLoaded();

    if (!this.bgAudio) return;
    this.isAmbienceActive = true;

    this.bgAudio.muted = this.muted;
    this.bgAudio.volume = this.muted ? 0 : this.welcomeVolume;

    if (this.bgAudio.paused) {
      const playPromise = this.bgAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn('Soundtrack waiting for user gesture:', e.message);
        });
      }
    } else {
      this.fadeAudioTo(this.welcomeVolume, 400);
    }
  }

  // Duck soundtrack when playing the game (drops down to 20% by default)
  duckToGameVolume() {
    this.init();
    this.currentMode = 'game';
    this.ensureBgAudioLoaded();

    if (!this.bgAudio) return;
    this.isAmbienceActive = true;

    this.bgAudio.muted = this.muted;

    if (this.bgAudio.paused) {
      this.bgAudio.volume = this.muted ? 0 : this.gameVolume;
      this.bgAudio.play().catch(() => {});
    } else {
      this.fadeAudioTo(this.muted ? 0 : this.gameVolume, 600);
    }
  }

  // Unduck soundtrack when returning to welcome screen (swells to 45%)
  unduckToWelcomeVolume() {
    this.init();
    this.currentMode = 'welcome';
    this.ensureBgAudioLoaded();

    if (!this.bgAudio) return;

    if (this.bgAudio.paused) {
      this.bgAudio.volume = this.muted ? 0 : this.welcomeVolume;
      this.bgAudio.play().catch(() => {});
    } else {
      this.fadeAudioTo(this.muted ? 0 : this.welcomeVolume, 600);
    }
  }

  stopWelcomeAmbience() {
    this.isAmbienceActive = false;
    if (this.bgAudio) {
      try {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        const audio = this.bgAudio;
        const fadeStep = 0.05;
        this.fadeInterval = setInterval(() => {
          if (audio.volume > fadeStep) {
            audio.volume = Math.max(0, audio.volume - fadeStep);
          } else {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
            audio.pause();
            audio.currentTime = 0;
            audio.volume = this.muted ? 0 : this.welcomeVolume;
          }
        }, 50);
      } catch (e) {
        try {
          this.bgAudio.pause();
        } catch (err) {}
      }
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
