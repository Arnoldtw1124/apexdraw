/**
 * Horizontal Hero Character Reel Engine
 * Renders a horizontal character selection carousel with image cards,
 * smooth scrolling physics, tick audio triggers, and center target alignment.
 * 
 * Features Aspect-Correct Cover Cropping to prevent any image stretching/distortion.
 * Hero class tag bar removed per user request for a cleaner look.
 */

class HeroReel {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.items = options.items || [];
    this.isSpinning = false;
    this.duration = options.duration || 4000;

    // Callbacks
    this.onSpinStart = options.onSpinStart || null;
    this.onSpinEnd = options.onSpinEnd || null;
    this.onTick = options.onTick || null;

    // Optimized Card dimensions
    this.cardWidth = 155;
    this.cardHeight = 210;
    this.cardGap = 18;
    this.totalCardStep = this.cardWidth + this.cardGap;

    // Scroll state
    this.scrollX = 0;
    this.winnerIndex = -1;
    this.lastTickCardIndex = -1;

    // Cache preloaded images
    this.imageCache = {};
    this.preloadImages();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Delayed resize check to ensure non-zero dimensions after CSS layout reflow
    setTimeout(() => this.resizeCanvas(), 50);
    setTimeout(() => this.resizeCanvas(), 300);
  }

  preloadImages(forceReload = false) {
    if (!this.items) return;

    if (forceReload) {
      this.imageCache = {};
    }

    const timestamp = Date.now();

    this.items.forEach(item => {
      if (!item.id) return;

      const key = item.id;
      if (!forceReload && this.imageCache[key] && this.imageCache[key] instanceof Image) {
        return;
      }

      const fileKey = item.fileKey || item.id;
      const slug = item.id.replace(/_/g, '-');
      const formats = ['.avif', '.webp', '.png', '.jpg'];
      const folders = ['image', 'images'];

      const fileNames = [
        `apex-grid-tile-legends-${fileKey}`,
        `apex-grid-tile-legends-${slug}`,
        `apex-grid-tile-legends-${item.id}`,
        `${fileKey}`,
        `${item.id}`
      ];

      const candidates = [];
      folders.forEach(folder => {
        fileNames.forEach(fn => {
          formats.forEach(ext => {
            candidates.push(`${folder}/${fn}${ext}?t=${timestamp}`);
          });
        });
      });

      let candidateIndex = 0;

      const tryNextCandidate = () => {
        if (candidateIndex >= candidates.length) {
          this.imageCache[key] = 'FAILED';
          this.draw();
          return;
        }

        const imgPath = candidates[candidateIndex++];
        const img = new Image();

        img.onload = () => {
          this.imageCache[key] = img;
          this.draw();
        };

        img.onerror = () => {
          tryNextCandidate();
        };

        img.src = imgPath;
      };

      tryNextCandidate();
    });
  }

  setItems(newItems) {
    this.items = newItems;
    this.winnerIndex = -1;
    this.lastTickCardIndex = -1;
    this.preloadImages();
    this.draw();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    let width = parent.clientWidth || parent.offsetWidth;
    if (!width || width < 200) {
      width = parent.parentElement ? (parent.parentElement.clientWidth || 800) : 800;
    }
    const height = 260;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.centerX = (width * dpr) / 2;
    this.centerY = (height * dpr) / 2;
    this.dpr = dpr;

    this.draw();
  }

  spin(targetIndex = null) {
    if (this.isSpinning || !this.items || this.items.length === 0) return;

    this.isSpinning = true;
    this.winnerIndex = -1;

    if (targetIndex === null || targetIndex < 0 || targetIndex >= this.items.length) {
      targetIndex = Math.floor(Math.random() * this.items.length);
    }
    this.targetWinnerIndex = targetIndex;

    const numItems = this.items.length;
    const step = this.totalCardStep * this.dpr;

    const targetCardCenter = targetIndex * step + (this.cardWidth * this.dpr) / 2;
    const extraLoops = (6 + Math.floor(Math.random() * 4)) * (numItems * step);

    const trackLength = numItems * step;
    const currentNorm = ((this.scrollX % trackLength) + trackLength) % trackLength;
    
    const desiredNorm = targetCardCenter - (this.centerX);
    let delta = desiredNorm - currentNorm;
    if (delta <= 0) delta += trackLength;

    this.startScrollX = this.scrollX;
    this.totalDeltaX = extraLoops + delta;
    this.spinStartTime = performance.now();

    if (this.onSpinStart) this.onSpinStart();
    if (window.soundEngine) window.soundEngine.playSpinStart();

    this.animateSpin();
  }

  animateSpin() {
    const elapsed = performance.now() - this.spinStartTime;
    const progress = Math.min(1, elapsed / this.duration);

    const easeOut = 1 - Math.pow(1 - progress, 3.5);

    const prevX = this.scrollX;
    this.scrollX = this.startScrollX + this.totalDeltaX * easeOut;

    const velocity = (this.scrollX - prevX);

    this.checkTickSound(velocity);
    this.draw();

    if (progress < 1) {
      requestAnimationFrame(() => this.animateSpin());
    } else {
      this.isSpinning = false;
      this.winnerIndex = this.targetWinnerIndex;
      this.draw();

      const winnerItem = this.items[this.winnerIndex];
      if (window.soundEngine) window.soundEngine.playWinFanfare();
      if (this.onSpinEnd) this.onSpinEnd(winnerItem, this.winnerIndex);
    }
  }

  checkTickSound(velocity) {
    if (!this.items || this.items.length === 0) return;

    const step = this.totalCardStep * this.dpr;
    const trackLength = this.items.length * step;
    
    const currentCenterPos = (this.scrollX + this.centerX) % trackLength;
    const currentCardIndex = Math.floor(currentCenterPos / step) % this.items.length;

    if (currentCardIndex !== this.lastTickCardIndex) {
      this.lastTickCardIndex = currentCardIndex;
      if (window.soundEngine) {
        window.soundEngine.playTick(Math.min(1, velocity / 15));
      }
      if (this.onTick) this.onTick(currentCardIndex);
    }
  }

  draw() {
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!this.items || this.items.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = `${16 * dpr}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('無選擇英雄', width / 2, height / 2);
      return;
    }

    const cardW = this.cardWidth * dpr;
    const cardH = this.cardHeight * dpr;
    const step = this.totalCardStep * dpr;

    const minCardIdx = Math.floor((this.scrollX - width) / step) - 2;
    const maxCardIdx = Math.ceil((this.scrollX + width * 2) / step) + 2;

    for (let idx = minCardIdx; idx <= maxCardIdx; idx++) {
      const itemIndex = ((idx % this.items.length) + this.items.length) % this.items.length;
      const item = this.items[itemIndex];

      const cardLeft = idx * step - this.scrollX;
      const cardTop = (height - cardH) / 2;

      const isWinner = (this.winnerIndex === itemIndex);

      this.drawHeroCard(ctx, item, cardLeft, cardTop, cardW, cardH, isWinner, dpr);
    }

    this.drawCenterSelectorFrame(ctx, width, height, dpr);
  }

  drawHeroCard(ctx, item, x, y, w, h, isWinner, dpr) {
    ctx.save();

    if (isWinner) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(1.08, 1.08);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    // Card background
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14 * dpr);
    ctx.fillStyle = 'rgba(20, 23, 32, 0.96)';
    ctx.fill();

    // Card border gradient & glow
    ctx.lineWidth = isWinner ? 4 * dpr : 2 * dpr;
    ctx.strokeStyle = isWinner ? '#FFD44A' : (item.color || '#FF4655');
    if (isWinner) {
      ctx.shadowColor = '#FFD44A';
      ctx.shadowBlur = 22 * dpr;
    } else {
      ctx.shadowColor = item.color || '#FF4655';
      ctx.shadowBlur = 6 * dpr;
    }
    ctx.stroke();

    // Image container dimensions
    const imgObj = item.id ? this.imageCache[item.id] : null;
    const destX = x + 6 * dpr;
    const avatarY = y + 6 * dpr;
    const targetW = w - 12 * dpr;
    const targetH = h * 0.77;

    if (imgObj && imgObj instanceof Image && imgObj.complete && imgObj.naturalWidth > 0) {
      // Object-Fit Cover Cropping: Maintains image aspect ratio without distortion
      const imgW = imgObj.naturalWidth || imgObj.width;
      const imgH = imgObj.naturalHeight || imgObj.height;

      const scale = Math.max(targetW / imgW, targetH / imgH);
      const sw = targetW / scale;
      const sh = targetH / scale;
      const sx = (imgW - sw) / 2;
      const sy = (imgH - sh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(destX, avatarY, targetW, targetH, 10 * dpr);
      ctx.clip();

      ctx.drawImage(imgObj, sx, sy, sw, sh, destX, avatarY, targetW, targetH);

      // Inner gradient shadow overlay
      const shadowGrad = ctx.createLinearGradient(0, avatarY + targetH - 35 * dpr, 0, avatarY + targetH);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shadowGrad.addColorStop(1, 'rgba(20, 23, 32, 0.9)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(destX, avatarY + targetH - 35 * dpr, targetW, 35 * dpr);

      ctx.restore();
    } else {
      // Fallback Emblem
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(destX, avatarY, targetW, targetH, 10 * dpr);
      ctx.fillStyle = item.color || '#333';
      ctx.globalAlpha = 0.25;
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = item.color || '#FFFFFF';
      ctx.font = `bold ${40 * dpr}px "Orbitron", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = item.name ? item.name.charAt(0) : '?';
      ctx.fillText(initial, x + w / 2, avatarY + targetH / 2);
      ctx.restore();
    }

    // Hero Name Footer
    ctx.fillStyle = isWinner ? '#FFD44A' : '#FFFFFF';
    ctx.font = `bold ${15 * dpr}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4 * dpr;
    ctx.fillText(item.name || '', x + w / 2, y + h - 18 * dpr);

    ctx.restore();
  }

  drawCenterSelectorFrame(ctx, width, height, dpr) {
    const frameW = (this.cardWidth + 12) * dpr;
    const frameH = (this.cardHeight + 16) * dpr;
    const frameX = (width - frameW) / 2;
    const frameY = (height - frameH) / 2;

    ctx.save();

    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 16 * dpr);
    ctx.lineWidth = 3.5 * dpr;
    ctx.strokeStyle = '#FF4655';
    ctx.shadowColor = '#FF4655';
    ctx.shadowBlur = 20 * dpr;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2 - 14 * dpr, frameY - 14 * dpr);
    ctx.lineTo(width / 2 + 14 * dpr, frameY - 14 * dpr);
    ctx.lineTo(width / 2, frameY + 4 * dpr);
    ctx.closePath();
    ctx.fillStyle = '#FF4655';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width / 2 - 14 * dpr, frameY + frameH + 14 * dpr);
    ctx.lineTo(width / 2 + 14 * dpr, frameY + frameH + 14 * dpr);
    ctx.lineTo(width / 2, frameY + frameH - 4 * dpr);
    ctx.closePath();
    ctx.fillStyle = '#FF4655';
    ctx.fill();

    ctx.restore();
  }
}

window.HeroReel = HeroReel;
