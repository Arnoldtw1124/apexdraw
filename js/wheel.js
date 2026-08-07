/**
 * HTML5 Canvas Roulette Wheel Engine
 * Handles rendering, spin physics, sound tick events, and winning animations.
 */
class RouletteWheel {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    this.title = options.title || '輪盤';
    this.items = options.items || [];
    this.isSpinning = false;
    
    // Rotation state (in radians)
    this.angle = 0;
    this.velocity = 0;
    this.friction = 0.985;
    this.minVelocity = 0.001;
    this.duration = options.duration || 5000; // spin duration in ms
    
    // Callback events
    this.onSpinStart = options.onSpinStart || null;
    this.onSpinEnd = options.onSpinEnd || null;
    this.onTick = options.onTick || null;
    
    // Visual settings
    this.winnerIndex = -1;
    this.lastTickSliceIndex = -1;
    this.pointerAngle = -Math.PI / 2; // Top pointer (12 o'clock)

    // Palette fallback if item color is not set
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

  /**
   * Start spinning towards a targeted index or random item
   */
  spin(targetIndex = null) {
    if (this.isSpinning || this.items.length === 0) return;

    this.isSpinning = true;
    this.winnerIndex = -1;

    if (targetIndex === null || targetIndex < 0 || targetIndex >= this.items.length) {
      targetIndex = Math.floor(Math.random() * this.items.length);
    }
    this.targetWinnerIndex = targetIndex;

    // Calculate slice parameters
    const sliceAngle = (Math.PI * 2) / this.items.length;
    
    // We want the target slice to align with pointerAngle (-PI/2) when stopped
    // Slice center angle relative to wheel origin = targetIndex * sliceAngle + sliceAngle/2
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    
    // Desired final angle theta_final such that (theta_final + targetSliceCenter) % 2PI == 3PI/2 (top pointer)
    const requiredModuloAngle = (1.5 * Math.PI - targetSliceCenter) % (Math.PI * 2);
    let normalizedRequired = (requiredModuloAngle + Math.PI * 4) % (Math.PI * 2);
    
    // Add random micro-offset inside the slice so pointer doesn't always land dead-center
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.7);
    normalizedRequired += jitter;

    // Full rotations before stopping (e.g. 5 to 8 turns)
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * Math.PI * 2;
    
    // Current angle normalized
    const currentNorm = this.angle % (Math.PI * 2);
    let delta = normalizedRequired - currentNorm;
    if (delta <= 0) delta += Math.PI * 2;

    this.totalSpinAngle = extraRotations + delta;
    this.startAngle = this.angle;
    this.spinStartTime = performance.now();

    if (this.onSpinStart) this.onSpinStart();
    if (window.soundEngine) window.soundEngine.playSpinStart();

    this.animateSpin();
  }

  animateSpin() {
    const elapsed = performance.now() - this.spinStartTime;
    const progress = Math.min(1, elapsed / this.duration);

    // Ease-out cubic curve for realistic friction deceleration
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    const prevAngle = this.angle;
    this.angle = this.startAngle + this.totalSpinAngle * easeOut;
    
    // Velocity estimation for sound pitch
    const currentVelocity = (this.angle - prevAngle);

    // Check if pointer passed a slice border
    this.checkTickSound(prevAngle, this.angle, currentVelocity);

    this.draw();

    if (progress < 1) {
      requestAnimationFrame(() => this.animateSpin());
    } else {
      this.isSpinning = false;
      this.winnerIndex = this.targetWinnerIndex;
      this.draw();
      
      const winningItem = this.items[this.winnerIndex];
      if (window.soundEngine) window.soundEngine.playWinFanfare();
      if (this.onSpinEnd) this.onSpinEnd(winningItem, this.winnerIndex);
    }
  }

  checkTickSound(prevAngle, currAngle, velocity) {
    if (this.items.length === 0) return;

    const sliceAngle = (Math.PI * 2) / this.items.length;
    // Current slice index under top pointer (-PI/2)
    const pointerAbs = 1.5 * Math.PI;
    
    const prevSlice = Math.floor(((pointerAbs - prevAngle) % (Math.PI * 2) + Math.PI * 4) / sliceAngle) % this.items.length;
    const currSlice = Math.floor(((pointerAbs - currAngle) % (Math.PI * 2) + Math.PI * 4) / sliceAngle) % this.items.length;

    if (currSlice !== this.lastTickSliceIndex) {
      this.lastTickSliceIndex = currSlice;
      if (window.soundEngine) {
        window.soundEngine.playTick(Math.min(1, velocity * 10));
      }
      if (this.onTick) this.onTick(currSlice);
    }
  }

  draw() {
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!this.items || this.items.length === 0) {
      // Empty state
      ctx.save();
      ctx.fillStyle = '#999';
      ctx.font = `${16 * dpr}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('無候選項目', this.centerX, this.centerY);
      ctx.restore();
      return;
    }

    const numSlices = this.items.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    // Outer wheel glow ring
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6 * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff4655';
    ctx.lineWidth = 4 * dpr;
    ctx.shadowColor = 'rgba(255, 70, 85, 0.6)';
    ctx.shadowBlur = 15 * dpr;
    ctx.stroke();

    // Draw slices
    for (let i = 0; i < numSlices; i++) {
      const item = this.items[i];
      const startA = this.angle + i * sliceAngle;
      const endA = startA + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.radius, startA, endA);
      ctx.closePath();

      // Slice color fill
      const baseColor = item.color || this.defaultColors[i % this.defaultColors.length];
      
      if (this.winnerIndex === i) {
        // Highlight winner slice
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 20 * dpr;
      } else {
        ctx.fillStyle = baseColor;
        ctx.shadowBlur = 0;
      }
      ctx.fill();

      // Divider lines
      ctx.strokeStyle = 'rgba(15, 15, 20, 0.8)';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // Text label rendering
      ctx.save();
      const midAngle = startA + sliceAngle / 2;
      ctx.rotate(midAngle);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = (this.winnerIndex === i) ? '#000000' : '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4 * dpr;

      // Font size scales with slice count
      const fontSize = Math.max(10, Math.min(16, 260 / numSlices)) * dpr;
      ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, sans-serif`;

      // Text label truncation if needed
      let text = item.name || '';
      const maxTextLength = Math.floor(this.radius * 0.7);
      
      ctx.fillText(text, this.radius - 15 * dpr, 0, maxTextLength);
      ctx.restore();
    }

    // Central cap
    ctx.beginPath();
    ctx.arc(0, 0, 24 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#161922';
    ctx.fill();
    ctx.strokeStyle = '#ff4655';
    ctx.lineWidth = 3 * dpr;
    ctx.stroke();

    // Apex Logo / Title in Center
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${10 * dpr}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('APEX', 0, 0);

    ctx.restore();

    // Top Pointer Arrow (12 o'clock)
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
