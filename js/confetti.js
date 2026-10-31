/**
 * Standalone Canvas Confetti Engine
 * Zero dependencies, high performance 60fps particle physics for celebrations.
 */
class ConfettiEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animId = null;
    this.colors = [
      '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db',
      '#2ecc71', '#d4af37', '#ffd700', '#ffffff', '#e5c158'
    ];
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 160) {
    if (!this.canvas) return;
    this.resize();

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Launch particles from left, center, and right cannons
    const origins = [
      { x: w * 0.2, y: h * 0.7, angle: -60, spread: 50 },
      { x: w * 0.5, y: h * 0.6, angle: -90, spread: 80 },
      { x: w * 0.8, y: h * 0.7, angle: -120, spread: 50 }
    ];

    origins.forEach((origin) => {
      const perOrigin = Math.floor(count / origins.length);
      for (let i = 0; i < perOrigin; i++) {
        const rad = (origin.angle + (Math.random() - 0.5) * origin.spread) * (Math.PI / 180);
        const speed = 12 + Math.random() * 18;

        this.particles.push({
          x: origin.x,
          y: origin.y,
          vx: Math.cos(rad) * speed,
          vy: Math.sin(rad) * speed,
          size: 6 + Math.random() * 8,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          wobble: Math.random() * 10,
          wobbleSpeed: 0.05 + Math.random() * 0.1,
          gravity: 0.35 + Math.random() * 0.25,
          drag: 0.965,
          opacity: 1,
          decay: 0.005 + Math.random() * 0.005,
          shape: Math.random() > 0.4 ? 'rect' : 'circle'
        });
      }
    });

    if (!this.animId) {
      this.loop();
    }
  }

  loop() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;

      p.x += p.vx;
      p.y += p.vy;

      p.rotation += p.rotSpeed;
      p.wobble += p.wobbleSpeed;
      p.opacity -= p.decay;

      if (p.opacity <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.scale(Math.cos(p.wobble), 1);
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.animId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  clear() {
    this.particles = [];
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

window.confettiEngine = new ConfettiEngine();
