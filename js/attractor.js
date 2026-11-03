/**
 * Carnival Attractor Visual Engine
 * Renders high-fps interactive volumetric God Rays, 3D floating golden stardust,
 * and shimmering atmospheric aura on the Welcome Screen.
 */
class AttractorEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animationFrame = null;
    this.particles = [];
    this.maxParticles = 90;
    this.pointer = { x: -1000, y: -1000 };
    this.isActive = false;
    this.time = 0;

    if (this.canvas) {
      this.init();
    }
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Interactive pointer response
    window.addEventListener('mousemove', (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.pointer.x = e.touches[0].clientX;
        this.pointer.y = e.touches[0].clientY;
      }
    }, { passive: true });

    // Seed particles
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(randomY = false) {
    const w = this.canvas ? this.canvas.width : window.innerWidth;
    const h = this.canvas ? this.canvas.height : window.innerHeight;
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + 10,
      size: Math.random() * 2.8 + 1.2,
      baseSpeedY: -(Math.random() * 0.7 + 0.3),
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.6 + 0.3,
      pulseSpeed: Math.random() * 0.03 + 0.015,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.3 ? '#ffd700' : '#ffe885'
    };
  }

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.resize();
    this.loop();
  }

  stop() {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }

  loop() {
    if (!this.isActive || !this.ctx) return;
    this.time += 0.016;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw Volumetric God Rays from the heavens
    this.drawGodRays(w, h);

    // 2. Draw Floating Shimmering Stardust
    this.drawParticles(w, h);

    this.animationFrame = requestAnimationFrame(() => this.loop());
  }

  drawGodRays(w, h) {
    const originX = w * 0.5;
    const originY = -h * 0.15;
    const rayCount = 7;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < rayCount; i++) {
      const angleOffset = ((i - (rayCount - 1) / 2) * 0.14) + Math.sin(this.time * 0.3 + i) * 0.03;
      const rayWidth = (w * 0.14) * (1 + Math.sin(this.time * 0.5 + i * 2) * 0.2);
      const breath = 0.04 + Math.sin(this.time * 0.8 + i * 1.5) * 0.03;

      const endX = originX + Math.sin(angleOffset) * (h * 1.4);
      const endY = originY + Math.cos(angleOffset) * (h * 1.4);

      const grad = this.ctx.createLinearGradient(originX, originY, endX, endY);
      grad.addColorStop(0, `rgba(255, 225, 120, ${breath * 1.6})`);
      grad.addColorStop(0.3, `rgba(212, 175, 55, ${breath})`);
      grad.addColorStop(0.8, `rgba(180, 140, 30, ${breath * 0.4})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(originX - rayWidth * 0.2, originY);
      this.ctx.lineTo(originX + rayWidth * 0.2, originY);
      this.ctx.lineTo(endX + rayWidth, endY);
      this.ctx.lineTo(endX - rayWidth, endY);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawParticles(w, h) {
    this.ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Swirl around pointer if nearby
      const dx = this.pointer.x - p.x;
      const dy = this.pointer.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140) {
        const force = (1 - dist / 140) * 2;
        p.x -= (dx / dist) * force;
        p.y -= (dy / dist) * force;
      }

      // Natural upward motion with gentle oscillation
      p.y += p.baseSpeedY;
      p.x += p.speedX + Math.sin(this.time + p.phase) * 0.35;

      // Wrap around top
      if (p.y < -10) {
        this.particles[i] = this.createParticle(false);
        continue;
      }

      const currentAlpha = p.opacity * (0.6 + 0.4 * Math.sin(this.time * 2 + p.phase));

      // Glow halo
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${currentAlpha * 0.25})`;
      this.ctx.fill();

      // Sharp core
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 245, 200, ${currentAlpha})`;
      this.ctx.fill();
    }
    this.ctx.restore();
  }
}

// Global engine instance
window.attractorEngine = null;
document.addEventListener('DOMContentLoaded', () => {
  window.attractorEngine = new AttractorEngine('attractor-canvas');
  if (document.getElementById('welcome-screen') && document.getElementById('welcome-screen').classList.contains('active')) {
    window.attractorEngine.start();
  }
});
