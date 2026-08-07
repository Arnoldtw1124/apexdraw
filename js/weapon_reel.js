/**
 * Horizontal Weapon Reel Selector (WeaponReel)
 * 60 FPS smooth physics interpolation, dynamic card bounds scaling,
 * high-contrast bold fonts for OBS stream corner scaling readability.
 */

class WeaponReel {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = options.items || [];
    this.duration = options.duration || 4500;
    this.onSpinEnd = options.onSpinEnd || null;

    this.cardWidth = 145;
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
  }

  preloadImages() {
    this.items.forEach(item => {
      const key = item.id;
      if (!key || this.imageCache[key]) return;

      const fileKey = item.fileKey || item.id;
      const slug = item.id.replace(/_/g, '-');

      const candidates = [
        `image/apex-grid-tile-weapons-${fileKey}.avif`,
        `image/apex-grid-tile-weapons-${slug}.avif`,
        `image/apex-grid-tile-weapons-${fileKey}.webp`,
        `image/apex-grid-tile-weapons-${fileKey}.png`,
        `image/${fileKey}.avif`,
        `images/apex-grid-tile-weapons-${fileKey}.avif`
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
    let height = parent.clientHeight || parent.offsetHeight || 180;
    if (height < 100) height = 180;

    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.cardHeight = Math.min(185, height * 0.88);
    this.cardWidth = Math.round(this.cardHeight * 0.92);

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
    }

    this.draw();

    if (progress < 1) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isSpinning = false;
      const finalItem = this.items[this.winnerIndex];

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

    if (this.items.length === 0) return;

    const itemStep = (this.cardWidth + this.cardGap) * dpr;
    const cardW = this.cardWidth * dpr;
    const cardH = this.cardHeight * dpr;
    const centerY = (h - cardH) / 2;
    const centerX = w / 2;

    const totalItems = this.items.length;
    const visibleHalfCount = Math.ceil(w / (2 * itemStep)) + 2;

    const baseIndex = Math.floor((this.currentOffset * dpr) / itemStep);
    const offsetWithinStep = (this.currentOffset * dpr) % itemStep;

    for (let i = -visibleHalfCount; i <= visibleHalfCount; i++) {
      const cardAbsoluteIndex = baseIndex + i;
      let wrappedIndex = cardAbsoluteIndex % totalItems;
      if (wrappedIndex < 0) wrappedIndex += totalItems;

      const item = this.items[wrappedIndex];
      const cardX = centerX - (this.cardWidth * dpr) / 2 + (i * itemStep) - offsetWithinStep;

      const isWinnerCard = (!this.isSpinning && wrappedIndex === this.winnerIndex && Math.abs(cardX + cardW / 2 - centerX) < itemStep / 2);

      this.drawCard(ctx, item, cardX, centerY, cardW, cardH, isWinnerCard, dpr);
    }

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
    ctx.strokeStyle = isWinner ? '#4AF2FF' : (item.color || '#FF4655');
    if (isWinner) {
      ctx.shadowColor = '#4AF2FF';
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

      const scale = Math.min(targetW / imgW, targetH / imgH) * 0.95;
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = destX + (targetW - drawW) / 2;
      const drawY = avatarY + (targetH - drawH) / 2;

      ctx.save();
      ctx.beginPath();
      window.safeRoundRect(ctx, destX, avatarY, targetW, targetH, 10 * dpr);
      ctx.clip();

      ctx.drawImage(imgObj, 0, 0, imgW, imgH, drawX, drawY, drawW, drawH);

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
      ctx.font = `bold ${28 * dpr}px "Orbitron", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = item.name ? item.name.charAt(0) : '?';
      ctx.fillText(initial, x + w / 2, avatarY + targetH / 2);
      ctx.restore();
    }

    // Weapon Name Footer - BOLD HIGH-CONTRAST FOR CORNER STREAM SCALING
    ctx.save();
    ctx.fillStyle = isWinner ? '#4AF2FF' : '#FFFFFF';
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

    // Top Cyan Pointer
    ctx.beginPath();
    ctx.moveTo(centerX - pointerSize, topY - pointerSize);
    ctx.lineTo(centerX + pointerSize, topY - pointerSize);
    ctx.lineTo(centerX, topY);
    ctx.closePath();
    ctx.fillStyle = '#4AF2FF';
    ctx.shadowColor = '#4AF2FF';
    ctx.shadowBlur = 12 * dpr;
    ctx.fill();

    // Bottom Cyan Pointer
    ctx.beginPath();
    ctx.moveTo(centerX - pointerSize, bottomY + pointerSize);
    ctx.lineTo(centerX + pointerSize, bottomY + pointerSize);
    ctx.lineTo(centerX, bottomY);
    ctx.closePath();
    ctx.fillStyle = '#4AF2FF';
    ctx.shadowColor = '#4AF2FF';
    ctx.shadowBlur = 12 * dpr;
    ctx.fill();

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeaponReel;
}
