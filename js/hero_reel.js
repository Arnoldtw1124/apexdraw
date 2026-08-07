/**
 * Horizontal Hero Character Carousel Selector Reel (HeroReel)
 * 60 FPS smooth physics interpolation, dynamic card bounds scaling,
 * high-contrast bold fonts for OBS stream corner scaling readability.
 * Guaranteed Non-Zero Canvas Bounds for OBS CEF Browser Source.
 */

class HeroReel {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = options.items || [];
    this.duration = options.duration || 4500;
    this.onSpinEnd = options.onSpinEnd || null;

    this.cardWidth = 135;
    this.cardHeight = 150;
    this.cardGap = 12;

    this.currentOffset = 0;
    this.targetOffset = 0;
    this.startOffset = 0;
    this.isSpinning = false;
    this.startTime = null;
    this.winnerIndex = -1;
    this.lastTickCardIndex = -1;

    this.imageCache = {};
    this.preloadImages();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('load', () => this.resizeCanvas());
    setTimeout(() => this.resizeCanvas(), 300);
    setTimeout(() => this.resizeCanvas(), 1000);
  }

  preloadImages() {
    this.items.forEach(item => {
      const key = item.id;
      if (!key || this.imageCache[key]) return;

      const fileKey = item.fileKey || item.id;
      const slug = item.id.replace(/_/g, '-');

      const candidates = [
        `image/apex-grid-tile-legends-${fileKey}.avif`,
        `image/apex-grid-tile-legends-${slug}.avif`,
        `image/apex-grid-tile-legends-${fileKey}.webp`,
        `image/apex-grid-tile-legends-${fileKey}.png`,
        `image/${fileKey}.avif`,
        `images/apex-grid-tile-legends-${fileKey}.avif`
      ];

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
    if (newItems && newItems.length > 0) {
      this.items = newItems;
    } else if (typeof APEX_DATA !== 'undefined' && APEX_DATA.legends) {
      this.items = [...APEX_DATA.legends];
    }
    this.winnerIndex = -1;
    this.lastTickCardIndex = -1;
    this.preloadImages();
    this.draw();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    let width = 800;
    let height = 200;

    if (parent) {
      width = parent.clientWidth || parent.offsetWidth || 800;
      height = parent.clientHeight || parent.offsetHeight || 200;
    }

    if (width < 100) width = 800;
    if (height < 50) height = 200;

    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.cardHeight = Math.min(185, height * 0.88);
    this.cardWidth = Math.round(this.cardHeight * 0.88);

    this.draw();
  }

  spin(targetItemIndex = null) {
    if (this.isSpinning || this.items.length === 0) return;

    if (targetItemIndex === null || targetItemIndex < 0 || targetItemIndex >= this.items.length) {
      targetItemIndex = Math.floor(Math.random() * this.items.length);
    }
    this.winnerIndex = targetItemIndex;

    const totalCards = this.items.length;
    const itemStep = this.cardWidth + this.cardGap;

    const minLaps = 5;
    const targetCardPosition = minLaps * totalCards + targetItemIndex;
    this.targetOffset = targetCardPosition * itemStep;

    this.startOffset = this.currentOffset % (totalCards * itemStep);
    this.isSpinning = true;
    this.startTime = performance.now();
    this.lastTickCardIndex = -1;

    if (window.soundEngine) {
      window.soundEngine.playSpinStart();
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

    this.currentOffset = this.startOffset + (this.targetOffset - this.startOffset) * easedProgress;

    const itemStep = this.cardWidth + this.cardGap;
    const currentPassIndex = Math.floor((this.currentOffset + itemStep / 2) / itemStep);
    if (currentPassIndex !== this.lastTickCardIndex) {
      this.lastTickCardIndex = currentPassIndex;
      if (window.soundEngine) {
        window.soundEngine.playTick();
      }
    }

    this.draw();

    if (progress < 1) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isSpinning = false;
      const finalItem = this.items[this.winnerIndex];

      if (window.soundEngine) {
        window.soundEngine.playWin();
      }

      if (typeof this.onSpinEnd === 'function') {
        this.onSpinEnd(finalItem);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    if (!this.items || this.items.length === 0) {
      if (typeof APEX_DATA !== 'undefined' && APEX_DATA.legends) {
        this.items = [...APEX_DATA.legends];
      } else {
        return;
      }
    }

    const itemStep = (this.cardWidth + this.cardGap) * dpr;
    const cardW = this.cardWidth * dpr;
    const cardH = this.cardHeight * dpr;
    const centerY = (h - cardH) / 2;
    const centerX = w / 2;

    const totalItems = this.items.length;
    const visibleHalfCount = Math.ceil(w / (2 * itemStep)) + 2;

    const baseIndex = Math.floor((this.currentOffset * dpr) / itemStep);
    const offsetWithinStep = (this.currentOffset * dpr) % itemStep;

    // Draw scrolling hero cards
    for (let i = -visibleHalfCount; i <= visibleHalfCount; i++) {
      const cardAbsoluteIndex = baseIndex + i;
      let wrappedIndex = cardAbsoluteIndex % totalItems;
      if (wrappedIndex < 0) wrappedIndex += totalItems;

      const item = this.items[wrappedIndex];
      const cardX = centerX - (this.cardWidth * dpr) / 2 + (i * itemStep) - offsetWithinStep;

      const isWinnerCard = (!this.isSpinning && wrappedIndex === this.winnerIndex && Math.abs(cardX + cardW / 2 - centerX) < itemStep / 2);

      this.drawCard(ctx, item, cardX, centerY, cardW, cardH, isWinnerCard, dpr);
    }

    // Center Aiming Reticle (Apex Style Pointer)
    this.drawCenterReticle(ctx, centerX, centerY, cardW, cardH, dpr);
  }

  drawCard(ctx, item, x, y, w, h, isWinner, dpr) {
    if (!item) return;
    ctx.save();

    if (isWinner) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(1.06, 1.06);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    // Card background
    ctx.beginPath();
    window.safeRoundRect(ctx, x, y, w, h, 12 * dpr);
    ctx.fillStyle = 'rgba(20, 23, 32, 0.96)';
    ctx.fill();

    // Card border gradient & glow
    ctx.lineWidth = isWinner ? 4 * dpr : 2 * dpr;
    ctx.strokeStyle = isWinner ? '#FFD44A' : (item.color || '#FF4655');
    if (isWinner) {
      ctx.shadowColor = '#FFD44A';
      ctx.shadowBlur = 20 * dpr;
    } else {
      ctx.shadowColor = item.color || '#FF4655';
      ctx.shadowBlur = 5 * dpr;
    }
    ctx.stroke();

    // Image container dimensions
    const imgObj = item.id ? this.imageCache[item.id] : null;
    const destX = x + 4 * dpr;
    const avatarY = y + 4 * dpr;
    const targetW = w - 8 * dpr;
    const targetH = h * 0.74;

    if (imgObj && imgObj instanceof Image && imgObj.complete && imgObj.naturalWidth > 0) {
      const imgW = imgObj.naturalWidth || imgObj.width;
      const imgH = imgObj.naturalHeight || imgObj.height;

      const scale = Math.max(targetW / imgW, targetH / imgH);
      const sw = targetW / scale;
      const sh = targetH / scale;
      const sx = (imgW - sw) / 2;
      const sy = (imgH - sh) / 2;

      ctx.save();
      ctx.beginPath();
      window.safeRoundRect(ctx, destX, avatarY, targetW, targetH, 10 * dpr);
      ctx.clip();

      ctx.drawImage(imgObj, sx, sy, sw, sh, destX, avatarY, targetW, targetH);

      const shadowGrad = ctx.createLinearGradient(0, avatarY + targetH - 30 * dpr, 0, avatarY + targetH);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shadowGrad.addColorStop(1, 'rgba(15, 17, 24, 0.95)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(destX, avatarY + targetH - 30 * dpr, targetW, 30 * dpr);

      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath();
      window.safeRoundRect(ctx, destX, avatarY, targetW, targetH, 10 * dpr);
      ctx.fillStyle = item.color || '#333';
      ctx.globalAlpha = 0.25;
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = item.color || '#FFFFFF';
      ctx.font = `bold ${32 * dpr}px "Orbitron", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = item.name ? item.name.charAt(0) : '?';
      ctx.fillText(initial, x + w / 2, avatarY + targetH / 2);
      ctx.restore();
    }

    // Hero Name Footer - BOLD HIGH-CONTRAST FOR CORNER STREAM SCALING
    ctx.save();
    ctx.fillStyle = isWinner ? '#FFD44A' : '#FFFFFF';
    ctx.font = `900 ${16 * dpr}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 6 * dpr;
    ctx.fillText(item.name, x + w / 2, y + h - 5 * dpr);
    ctx.restore();

    ctx.restore();
  }

  drawCenterReticle(ctx, centerX, centerY, cardW, cardH, dpr) {
    ctx.save();

    const pointerSize = 14 * dpr;
    const topY = centerY - 6 * dpr;
    const bottomY = centerY + cardH + 6 * dpr;

    // Top Red Pointer
    ctx.beginPath();
    ctx.moveTo(centerX - pointerSize, topY - pointerSize);
    ctx.lineTo(centerX + pointerSize, topY - pointerSize);
    ctx.lineTo(centerX, topY);
    ctx.closePath();
    ctx.fillStyle = '#FF4655';
    ctx.shadowColor = '#FF4655';
    ctx.shadowBlur = 12 * dpr;
    ctx.fill();

    // Bottom Red Pointer
    ctx.beginPath();
    ctx.moveTo(centerX - pointerSize, bottomY + pointerSize);
    ctx.lineTo(centerX + pointerSize, bottomY + pointerSize);
    ctx.lineTo(centerX, bottomY);
    ctx.closePath();
    ctx.fillStyle = '#FF4655';
    ctx.shadowColor = '#FF4655';
    ctx.shadowBlur = 12 * dpr;
    ctx.fill();

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeroReel;
}
