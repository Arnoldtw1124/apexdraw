/**
 * Main Application Controller for Apex Legends OBS Plugin
 * Manages Horizontal Hero Reel, Weapon Wheel, Audio, Hotkeys & LocalStorage.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check URL params for OBS overlay mode
  const urlParams = new URLSearchParams(window.location.search);
  const isOverlayMode = urlParams.get('mode') === 'overlay';

  if (isOverlayMode) {
    document.body.classList.add('overlay-mode');
  }

  // Application State
  const state = {
    activeLegends: [],
    activeWeapons: [],
    spinDuration: 4500,
    soundVolume: 0.5,
    lastSelectedLegend: null,
    lastSelectedWeapon: null
  };

  // Load state from localStorage
  loadSavedState();

  // Initialize Canvas Elements
  const heroCanvas = document.getElementById('heroReelCanvas');
  const weaponCanvas = document.getElementById('weaponWheelCanvas');

  let heroReel = null;
  let weaponWheel = null;
  let heroDone = false;
  let weaponDone = false;

  if (heroCanvas) {
    heroReel = new HeroReel(heroCanvas, {
      items: getFilteredLegends(),
      duration: state.spinDuration,
      onSpinEnd: (item) => {
        state.lastSelectedLegend = item;
        heroDone = true;
        checkCombinedResult();
      }
    });
  }

  if (weaponCanvas) {
    weaponWheel = new RouletteWheel(weaponCanvas, {
      title: '槍械輪盤',
      items: getFilteredWeapons(),
      duration: state.spinDuration,
      onSpinEnd: (item) => {
        state.lastSelectedWeapon = item;
        weaponDone = true;
        checkCombinedResult();
      }
    });
  }

  // --- State Persistence & Filters ---

  function loadSavedState() {
    try {
      const savedLegendIds = localStorage.getItem('apex_roulette_legends');
      const savedWeaponIds = localStorage.getItem('apex_roulette_weapons');
      const savedVolume = localStorage.getItem('apex_roulette_volume');

      if (savedLegendIds) {
        const ids = JSON.parse(savedLegendIds);
        state.activeLegends = APEX_DATA.legends.filter(l => ids.includes(l.id));
      } else {
        state.activeLegends = [...APEX_DATA.legends];
      }

      if (savedWeaponIds) {
        const ids = JSON.parse(savedWeaponIds);
        state.activeWeapons = APEX_DATA.weapons.filter(w => ids.includes(w.id));
      } else {
        state.activeWeapons = [...APEX_DATA.weapons];
      }

      if (savedVolume !== null) {
        state.soundVolume = parseFloat(savedVolume);
        if (window.soundEngine) window.soundEngine.setVolume(state.soundVolume);
      }
    } catch (e) {
      state.activeLegends = [...APEX_DATA.legends];
      state.activeWeapons = [...APEX_DATA.weapons];
    }
  }

  function saveState() {
    try {
      localStorage.setItem('apex_roulette_legends', JSON.stringify(state.activeLegends.map(l => l.id)));
      localStorage.setItem('apex_roulette_weapons', JSON.stringify(state.activeWeapons.map(w => w.id)));
      localStorage.setItem('apex_roulette_volume', state.soundVolume.toString());
    } catch (e) {}
  }

  function getFilteredLegends() {
    return state.activeLegends.length > 0 ? state.activeLegends : APEX_DATA.legends;
  }

  function getFilteredWeapons() {
    return state.activeWeapons.length > 0 ? state.activeWeapons : APEX_DATA.weapons;
  }

  // --- Spin Triggers ---

  function spinBoth() {
    if ((heroReel && heroReel.isSpinning) || (weaponWheel && weaponWheel.isSpinning)) return;

    heroDone = false;
    weaponDone = false;
    hideResultBanner();

    if (heroReel) {
      heroReel.duration = state.spinDuration;
      heroReel.setItems(getFilteredLegends());
      heroReel.spin();
    }

    if (weaponWheel) {
      weaponWheel.duration = state.spinDuration + 600; // Weapon finishes slightly after hero
      weaponWheel.setItems(getFilteredWeapons());
      weaponWheel.spin();
    }
  }

  function spinLegendOnly() {
    if (heroReel && !heroReel.isSpinning) {
      heroDone = false;
      weaponDone = true;
      hideResultBanner();
      heroReel.duration = state.spinDuration;
      heroReel.setItems(getFilteredLegends());
      heroReel.spin();
    }
  }

  function spinWeaponOnly() {
    if (weaponWheel && !weaponWheel.isSpinning) {
      heroDone = true;
      weaponDone = false;
      hideResultBanner();
      weaponWheel.duration = state.spinDuration;
      weaponWheel.setItems(getFilteredWeapons());
      weaponWheel.spin();
    }
  }

  function checkCombinedResult() {
    if (heroDone && weaponDone) {
      showResultBanner();
      triggerConfetti();
    }
  }

  function showResultBanner() {
    const banner = document.getElementById('resultBanner');
    const resultText = document.getElementById('resultCombination');

    if (banner && resultText) {
      let text = '';
      if (state.lastSelectedLegend && state.lastSelectedWeapon) {
        text = `【${state.lastSelectedLegend.name}】 ⚔️ 【${state.lastSelectedWeapon.name}】`;
      } else if (state.lastSelectedLegend) {
        text = `英雄：${state.lastSelectedLegend.name}`;
      } else if (state.lastSelectedWeapon) {
        text = `槍械：${state.lastSelectedWeapon.name}`;
      }
      resultText.innerText = text;
      banner.classList.add('active');
    }
  }

  function hideResultBanner() {
    const banner = document.getElementById('resultBanner');
    if (banner) banner.classList.remove('active');
  }

  // --- Confetti Animation ---
  function triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ff4655', '#4af2ff', '#ffd44a', '#4aff85', '#ffffff', '#b84aff'];

    for (let i = 0; i < 95; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.85) * 18,
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    let startTime = performance.now();

    function drawConfetti() {
      const elapsed = performance.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach(p => {
        if (p.opacity <= 0) return;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.014;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (alive && elapsed < 2600) {
        requestAnimationFrame(drawConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    drawConfetti();
  }

  // --- UI Event Bindings ---

  const spinBothBtn = document.getElementById('spinBothBtn');
  const spinLegendBtn = document.getElementById('spinLegendBtn');
  const spinWeaponBtn = document.getElementById('spinWeaponBtn');

  if (spinBothBtn) spinBothBtn.addEventListener('click', spinBoth);
  if (spinLegendBtn) spinLegendBtn.addEventListener('click', spinLegendOnly);
  if (spinWeaponBtn) spinWeaponBtn.addEventListener('click', spinWeaponOnly);

  // Keyboard Hotkeys
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    if (e.code === 'Space' || e.code === 'KeyS') {
      e.preventDefault();
      spinBoth();
    }
  });

  // Sidebar Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Render Checkbox Editors
  renderLegendListEditor();
  renderWeaponListEditor();

  function renderLegendListEditor() {
    const container = document.getElementById('legendListEditor');
    if (!container) return;

    container.innerHTML = '';
    APEX_DATA.legends.forEach(legend => {
      const isChecked = state.activeLegends.some(l => l.id === legend.id);
      const row = document.createElement('div');
      row.className = 'item-checkbox-row';
      row.style.borderLeftColor = legend.color;

      row.innerHTML = `
        <label>
          <input type="checkbox" data-id="${legend.id}" ${isChecked ? 'checked' : ''} />
          <span>${legend.name} (${legend.englishName || ''})</span>
        </label>
      `;

      row.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!state.activeLegends.some(l => l.id === legend.id)) {
            state.activeLegends.push(legend);
          }
        } else {
          state.activeLegends = state.activeLegends.filter(l => l.id !== legend.id);
        }
        saveState();
        if (heroReel) heroReel.setItems(getFilteredLegends());
      });

      container.appendChild(row);
    });
  }

  function renderWeaponListEditor() {
    const container = document.getElementById('weaponListEditor');
    if (!container) return;

    container.innerHTML = '';
    APEX_DATA.weapons.forEach(weapon => {
      const isChecked = state.activeWeapons.some(w => w.id === weapon.id);
      const row = document.createElement('div');
      row.className = 'item-checkbox-row';
      row.style.borderLeftColor = weapon.color;

      row.innerHTML = `
        <label>
          <input type="checkbox" data-id="${weapon.id}" ${isChecked ? 'checked' : ''} />
          <span>${weapon.name}</span>
        </label>
      `;

      row.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!state.activeWeapons.some(w => w.id === weapon.id)) {
            state.activeWeapons.push(weapon);
          }
        } else {
          state.activeWeapons = state.activeWeapons.filter(w => w.id !== weapon.id);
        }
        saveState();
        if (weaponWheel) weaponWheel.setItems(getFilteredWeapons());
      });

      container.appendChild(row);
    });
  }

  // Filter Buttons
  const selectAllLegendsBtn = document.getElementById('selectAllLegendsBtn');
  const deselectAllLegendsBtn = document.getElementById('deselectAllLegendsBtn');

  if (selectAllLegendsBtn) {
    selectAllLegendsBtn.addEventListener('click', () => {
      state.activeLegends = [...APEX_DATA.legends];
      saveState();
      renderLegendListEditor();
      if (heroReel) heroReel.setItems(getFilteredLegends());
    });
  }

  if (deselectAllLegendsBtn) {
    deselectAllLegendsBtn.addEventListener('click', () => {
      state.activeLegends = [];
      saveState();
      renderLegendListEditor();
      if (heroReel) heroReel.setItems(getFilteredLegends());
    });
  }

  const selectAllWeaponsBtn = document.getElementById('selectAllWeaponsBtn');
  const deselectAllWeaponsBtn = document.getElementById('deselectAllWeaponsBtn');

  if (selectAllWeaponsBtn) {
    selectAllWeaponsBtn.addEventListener('click', () => {
      state.activeWeapons = [...APEX_DATA.weapons];
      saveState();
      renderWeaponListEditor();
      if (weaponWheel) weaponWheel.setItems(getFilteredWeapons());
    });
  }

  if (deselectAllWeaponsBtn) {
    deselectAllWeaponsBtn.addEventListener('click', () => {
      state.activeWeapons = [];
      saveState();
      renderWeaponListEditor();
      if (weaponWheel) weaponWheel.setItems(getFilteredWeapons());
    });
  }

  // Controls Sliders
  const volumeSlider = document.getElementById('volumeSlider');
  const durationSlider = document.getElementById('durationSlider');

  if (volumeSlider) {
    volumeSlider.value = state.soundVolume;
    volumeSlider.addEventListener('input', (e) => {
      state.soundVolume = parseFloat(e.target.value);
      if (window.soundEngine) window.soundEngine.setVolume(state.soundVolume);
      saveState();
    });
  }

  if (durationSlider) {
    durationSlider.addEventListener('input', (e) => {
      state.spinDuration = parseInt(e.target.value, 10);
    });
  }

  // OBS Guide Modal
  const obsGuideBtn = document.getElementById('obsGuideBtn');
  const obsGuideModal = document.getElementById('obsGuideModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  if (obsGuideBtn && obsGuideModal) {
    obsGuideBtn.addEventListener('click', () => obsGuideModal.classList.add('active'));
  }
  if (closeModalBtn && obsGuideModal) {
    closeModalBtn.addEventListener('click', () => obsGuideModal.classList.remove('active'));
  }
});
