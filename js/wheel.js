/**
 * HTML5 Canvas Helper Utilities & Roulette Wheel Engine
 * Explicitly defines window.safeRoundRect for cross-browser rounded rectangle drawing.
 */

window.safeRoundRect = function(ctx, x, y, w, h, r) {
  if (!ctx) return;
  if (w <= 0 || h <= 0) return;
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));

  if (typeof ctx.roundRect === 'function') {
    try {
      ctx.roundRect(x, y, w, h, r);
      return;
    } catch (e) {}
  }

  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

class RouletteWheel {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    this.title = options.title || '輪盤';
    this.items = options.items || [];
    this.isSpinning = false;
    
    this.angle = 0;
    this.velocity = 0;
    this.friction = 0.985;
    this.minVelocity = 0.001;
    this.duration = options.duration || 5000;
    
    this.onSpinStart = options.onSpinStart || null;
    this.onSpinEnd = options.onSpinEnd || null;
    this.onTick = options.onTick || null;
    
    this.winnerIndex = -1;
    this.lastTickSliceIndex = -1;
    this.pointerAngle = -Math.PI / 2;

    this.defaultColors = [
      '#FF4A4A', '#4AF2FF', '#FFD44A', '#4AFF85', '#B84AFF',
      '#FF7979', '#00D2D3', '#FECA57', '#1DD1A1', '#A55EEA'
    ];

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  setItems(newItems) {
    this.items = newItems;
    this.winnerIndex = -1;
    this.lastTickSliceIndex = -1;
    this.draw();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    
    const size = Math.min(parent.clientWidth || 400, parent.clientHeight || 400);
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    
    this.radius = (size * dpr) / 2 - 20 * dpr;
    this.centerX = (size * dpr) / 2;
    this.centerY = (size * dpr) / 2;
    this.dpr = dpr;

    this.draw();
  }

  spin(targetIndex = null) {
    if (this.isSpinning || this.items.length === 0) return;

    this.isSpinning = true;
    this.winnerIndex = -1;

    if (targetIndex === null || targetIndex < 0 || targetIndex >= this.items.length) {
      targetIndex = Math.floor(Math.random() * this.items.length);
    }
    this.targetWinnerIndex = targetIndex;

    const sliceAngle = (Math.PI * 2) / this.items.length;
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    const requiredModuloAngle = (1.5 * Math.PI - targetSliceCenter) % (Math.PI * 2);
    let normalizedRequired = (requiredModuloAngle + Math.PI * 4) % (Math.PI * 2);
    
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.7);
    normalizedRequired += jitter;

    const extraRotations = (5 + Math.floor(Math.random() * 3)) * Math.PI * 2;
    const currentNorm = (this.angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const totalRotation = extraRotations + (normalizedRequired - currentNorm + Math.PI * 2) % (Math.PI * 2);

    this.targetAngle = this.angle + totalRotation;
    this.startAngle = this.angle;
    this.startTime = performance.now();

    if (typeof this.onSpinStart === 'function') {
      this.onSpinStart();
    }

    this.animate();
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  animate() {
    if (!this.isSpinning) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const easedProgress = this.easeOutCubic(progress);

    this.angle = this.startAngle + (this.targetAngle - this.startAngle) * easedProgress;

    const sliceAngle = (Math.PI * 2) / this.items.length;
    const normalizedPointerAngle = (1.5 * Math.PI - (this.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const currentSliceIndex = Math.floor(normalizedPointerAngle / sliceAngle) % this.items.length;

    if (currentSliceIndex !== this.lastTickSliceIndex) {
      this.lastTickSliceIndex = currentSliceIndex;
      if (typeof this.onTick === 'function') {
        this.onTick((1 - progress));
      }
    }

    this.draw();

    if (progress < 1) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isSpinning = false;
      this.winnerIndex = this.targetWinnerIndex;
      this.draw();

      if (typeof this.onSpinEnd === 'function') {
        this.onSpinEnd(this.items[this.winnerIndex]);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const dpr = this.dpr || 1;

    ctx.clearRect(0, 0, w, h);

    if (this.items.length === 0) return;

    const sliceAngle = (Math.PI * 2) / this.items.length;

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle);

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = item.color || this.defaultColors[i % this.defaultColors.length];
      ctx.fill();

      ctx.strokeStyle = 'rgba(15, 16, 21, 0.8)';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(11, 14 * dpr)}px "Noto Sans TC", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4 * dpr;

      const textMargin = this.radius - 22 * dpr;
      ctx.fillText(item.name, textMargin, 5 * dpr);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 32 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#161923';
    ctx.fill();
    ctx.strokeStyle = '#FF4655';
    ctx.lineWidth = 3 * dpr;
    ctx.stroke();

    ctx.restore();
    this.drawPointer();
  }

  drawPointer() {
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const topX = this.centerX;
    const topY = this.centerY - this.radius - 8 * dpr;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(topX - 14 * dpr, topY - 15 * dpr);
    ctx.lineTo(topX + 14 * dpr, topY - 15 * dpr);
    ctx.lineTo(topX, topY + 12 * dpr);
    ctx.closePath();

    ctx.fillStyle = '#FF4655';
    ctx.shadowColor = '#FF4655';
    ctx.shadowBlur = 12 * dpr;
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
    ctx.restore();
  }
}

window.RouletteWheel = RouletteWheel;
