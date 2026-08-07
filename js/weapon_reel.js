/**
 * Horizontal Weapon Selection Reel Engine
 * Matches the exact AAA horizontal carousel feel of the Hero Selector.
 * 
 * Features Aspect-Correct CONTAIN Fitting so full gun models (barrel to stock) are 100% visible!
 */

if (typeof window.safeRoundRect !== 'function') {
  window.safeRoundRect = function(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      let r = typeof radius === 'number' ? radius : 8;
      r = Math.min(r, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.arcTo(x + width, y, x + width, y + r, r);
      ctx.lineTo(x + width, y + height - r);
      ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
      ctx.lineTo(x + r, y + height);
      ctx.arcTo(x, y + height, x, y + height - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }
  };
}

class WeaponReel {
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

    // 3-Card Wide Layout for full weapon visibility
    this.cardWidth = 280;
    this.cardHeight = 210;
    this.cardGap = 24;
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

    setTimeout(() => this.resizeCanvas(), 50);
    setTimeout(() => this.resizeCanvas(), 300);
  }

  preloadImages(forceReload = false) {
    if (!this.items || !Array.isArray(this.items)) return;

    if (forceReload) {
      this.imageCache = {};
    }

    this.items.forEach(item => {
      if (!item || !item.id) return;

      const key = item.id;
      if (!forceReload && this.imageCache[key] && this.imageCache[key] instanceof Image) {
        return;
      }

      const fileKey = item.fileKey || item.id;

      const candidates = [
        `image/${fileKey}.webp`,
        `image/${fileKey}.avif`,
        `image/${fileKey}.png`,
        `image/apex-grid-tile-weapons-${fileKey}.avif`,
        `image/apex-grid-tile-weapons-${fileKey}.webp`,
        `images/${fileKey}.webp`,
        `images/${fileKey}.png`
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

    if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = `${16 * dpr}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('無選擇槍械', width / 2, height / 2);
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
      if (!item) continue;

      const cardLeft = idx * step - this.scrollX;
      const cardTop = (height - cardH) / 2;

      const isWinner = (this.winnerIndex === itemIndex);

      try {
        this.drawWeaponCard(ctx, item, cardLeft, cardTop, cardW, cardH, isWinner, dpr);
      } catch(e) {
        console.error('Error drawing weapon card:', e);
      }
    }

    this.drawCenterSelectorFrame(ctx, width, height, dpr);
  }

  drawWeaponCard(ctx, item, x, y, w, h, isWinner, dpr) {
    if (!item) return;
    ctx.save();

    if (isWinner) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(1.06, 1.06);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    // Card background
    ctx.beginPath();
    window.safeRoundRect(ctx, x, y, w, h, 14 * dpr);
    ctx.fillStyle = 'rgba(20, 23, 32, 0.96)';
    ctx.fill();

    // Weapon category accent border
    const catData = (APEX_DATA && APEX_DATA.weaponCategories) ? (APEX_DATA.weaponCategories[item.category] || {}) : {};
    const themeColor = item.color || catData.color || '#00BCD4';

    ctx.lineWidth = isWinner ? 4 * dpr : 2 * dpr;
    ctx.strokeStyle = isWinner ? '#FFD44A' : themeColor;
    if (isWinner) {
      ctx.shadowColor = '#FFD44A';
      ctx.shadowBlur = 22 * dpr;
    } else {
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 6 * dpr;
    }
    ctx.stroke();

    // Image / Badge container
    const imgObj = item.id ? this.imageCache[item.id] : null;
    const destX = x + 8 * dpr;
    const avatarY = y + 8 * dpr;
    const targetW = w - 16 * dpr;
    const targetH = h * 0.77;

    if (imgObj && imgObj instanceof Image && imgObj.complete && imgObj.naturalWidth > 0) {
      // Object-Fit Contain Mode: Fits 100% of weapon from barrel to stock without cropping
      const imgW = imgObj.naturalWidth || imgObj.width;
      const imgH = imgObj.naturalHeight || imgObj.height;

      const scale = Math.min(targetW / imgW, targetH / imgH);
      const renderW = imgW * scale;
      const renderH = imgH * scale;
      const renderX = destX + (targetW - renderW) / 2;
      const renderY = avatarY + (targetH - renderH) / 2;

      ctx.save();
      ctx.beginPath();
      window.safeRoundRect(ctx, destX, avatarY, targetW, targetH, 10 * dpr);
      ctx.clip();

      ctx.drawImage(imgObj, 0, 0, imgW, imgH, renderX, renderY, renderW, renderH);

      const shadowGrad = ctx.createLinearGradient(0, avatarY + targetH - 25 * dpr, 0, avatarY + targetH);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shadowGrad.addColorStop(1, 'rgba(20, 23, 32, 0.85)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(destX, avatarY + targetH - 25 * dpr, targetW, 25 * dpr);

      ctx.restore();
    } else {
      // Stylized Apex Weapon Badge Graphics (Fallback)
      ctx.save();
      ctx.beginPath();
      window.safeRoundRect(ctx, destX, avatarY, targetW, targetH, 10 * dpr);
      ctx.fillStyle = themeColor;
      ctx.globalAlpha = 0.15;
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = themeColor;
      ctx.font = `bold ${32 * dpr}px "Orbitron", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const shortCat = (catData.name || '').split(' ')[0] || 'GUN';
      ctx.fillText(shortCat, x + w / 2, avatarY + targetH / 2 - 10 * dpr);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `bold ${11 * dpr}px sans-serif`;
      ctx.fillText(item.name || 'WEAPON', x + w / 2, avatarY + targetH / 2 + 18 * dpr);

      ctx.restore();
    }

    // Weapon Name Footer
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
    window.safeRoundRect(ctx, frameX, frameY, frameW, frameH, 16 * dpr);
    ctx.lineWidth = 3.5 * dpr;
    ctx.strokeStyle = '#00BCD4'; // Cyan neon accent for weapon reticle
    ctx.shadowColor = '#00BCD4';
    ctx.shadowBlur = 20 * dpr;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2 - 14 * dpr, frameY - 14 * dpr);
    ctx.lineTo(width / 2 + 14 * dpr, frameY - 14 * dpr);
    ctx.lineTo(width / 2, frameY + 4 * dpr);
    ctx.closePath();
    ctx.fillStyle = '#00BCD4';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width / 2 - 14 * dpr, frameY + frameH + 14 * dpr);
    ctx.lineTo(width / 2 + 14 * dpr, frameY + frameH + 14 * dpr);
    ctx.lineTo(width / 2, frameY + frameH - 4 * dpr);
    ctx.closePath();
    ctx.fillStyle = '#00BCD4';
    ctx.fill();

    ctx.restore();
  }
}

window.WeaponReel = WeaponReel;
