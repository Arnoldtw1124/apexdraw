/**
 * Main Application Controller for Apex Legends OBS Plugin
 * Manages Dual Horizontal Carousels (Hero Reel & Weapon Reel),
 * Audio, Hotkeys, Filters, Twitch Integration & OBS Server Polling Cross-Process Sync.
 * Anti-Echo: Mutes Dock audio by default so only OBS Overlay Source emits sound.
 * Stream Overlay View: Displays clean Queue Waitlist (#1, #2, #3, #4) for viewers without setting tabs.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check URL params for OBS overlay mode & channel parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isOverlayMode = urlParams.get('mode') === 'overlay';
  const urlChannel = urlParams.get('channel') || urlParams.get('twitch');
  const urlReward = urlParams.get('reward');

  if (isOverlayMode) {
    document.body.classList.add('overlay-mode');
  }

  // Application State
  const state = {
    activeLegends: [],
    activeWeapons: [],
    spinDuration: 4500,
    soundVolume: 0.65,
    lastSelectedLegend: null,
    lastSelectedWeapon: null,
    twitchChannel: urlChannel ? urlChannel.trim() : '',
    twitchReward: urlReward ? urlReward.trim() : '抽隨機英雄和槍枝',
    twitchStrictPoints: true,
    muteDockAudio: true
  };

  // Load state from localStorage
  loadSavedState();

  if (urlChannel) state.twitchChannel = urlChannel.trim();
  if (urlReward) state.twitchReward = urlReward.trim();

  // --- Audio Anti-Echo Management ---
  function applyAudioMuteState() {
    if (!window.soundEngine) return;

    if (isOverlayMode) {
      // OBS Browser Source Overlay ALWAYS plays sound for stream viewers
      window.soundEngine.setMuted(false);
    } else {
      // Control Panel Dock Muted by default to prevent double sound echo
      window.soundEngine.setMuted(state.muteDockAudio);
    }
  }

  applyAudioMuteState();

  // --- Real-Time Cross-Window & OBS Process Sync (BroadcastChannel + LocalServer Polling) ---
  const syncChannel = new BroadcastChannel('apex_roulette_sync');
  let lastSyncSeq = 0;

  syncChannel.onmessage = (event) => {
    handleSyncEvent(event.data);
  };

  function handleSyncEvent(data) {
    if (!data) return;

    if (data.type === 'SPIN_BOTH') {
      executeSpinBoth(data.legendIndex, data.weaponIndex, false);
    } else if (data.type === 'SPIN_LEGEND') {
      executeSpinLegend(data.legendIndex, false);
    } else if (data.type === 'SPIN_WEAPON') {
      executeSpinWeapon(data.weaponIndex, false);
    } else if (data.type === 'SHOW_RESULT') {
      showResultBannerDirect(data.legendName, data.weaponName);
    } else if (data.type === 'HIDE_RESULT') {
      hideResultBanner();
    } else if (data.type === 'QUEUE_UPDATE') {
      renderQueueUI(data.activeViewer, data.waitingQueue, false);
    }
  }

  // Server Polling Sync for OBS Isolated Browser Sources
  function startOBSPollingSync() {
    setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/poll');
        if (!res.ok) return;
        const data = await res.json();

        // Check if Twitch Channel was updated from Dock
        if (data.twitchChannel && data.twitchChannel !== state.twitchChannel) {
          state.twitchChannel = data.twitchChannel;
          if (twitchIntegration) {
            twitchIntegration.connect(state.twitchChannel);
          }
        }

        // Check if a new spin event sequence occurred
        if (data.seq && data.seq > lastSyncSeq) {
          lastSyncSeq = data.seq;
          if (data.event) {
            handleSyncEvent(data.event);
          }
        }
      } catch (e) {
        // Fallback silently if server offline
      }
    }, 300);
  }

  startOBSPollingSync();

  function postSyncPayload(payload) {
    // 1. Post to BroadcastChannel
    try { syncChannel.postMessage(payload); } catch (e) {}

    // 2. Post to Local Server Sync API for OBS Browser Source
    try {
      fetch('http://localhost:8000/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          twitchChannel: state.twitchChannel,
          twitchReward: state.twitchReward
        })
      }).catch(() => {});
    } catch (e) {}
  }

  // Initialize Canvas Elements
  const heroCanvas = document.getElementById('heroReelCanvas');
  const weaponCanvas = document.getElementById('weaponReelCanvas');

  let heroReel = null;
  let weaponReel = null;
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
    weaponReel = new WeaponReel(weaponCanvas, {
      items: getFilteredWeapons(),
      duration: state.spinDuration,
      onSpinEnd: (item) => {
        state.lastSelectedWeapon = item;
        weaponDone = true;
        checkCombinedResult();
      }
    });
  }

  // --- Twitch Integration Setup ---
  let twitchIntegration = null;

  if (window.TwitchIntegration) {
    twitchIntegration = new TwitchIntegration({
      channel: state.twitchChannel,
      rewardName: state.twitchReward,
      strictPointsOnly: state.twitchStrictPoints,
      onSpinBoth: () => spinBoth(),
      onSpinLegend: () => spinLegendOnly(),
      onSpinWeapon: () => spinWeaponOnly(),
      onStatusChange: (statusState, message) => updateTwitchBadge(statusState, message),
      onTwitchNotice: (msg) => showTwitchNotice(msg),
      onDebugLog: (logText) => appendTwitchLog(logText),
      onQueueUpdate: (activeViewer, waitingQueue) => renderQueueUI(activeViewer, waitingQueue, true)
    });

    if (state.twitchChannel) {
      twitchIntegration.connect(state.twitchChannel);
    }
  }

  function renderQueueUI(activeViewer, waitingQueue, isInitiator = true) {
    // 1. Render Control Dock View (Streamer Control Panel)
    const badge = document.getElementById('queueBadgeCount');
    const activeName = document.getElementById('activePlayerName');
    const waitlistContainer = document.getElementById('queueWaitlistContainer');

    if (badge) {
      const count = (activeViewer ? 1 : 0) + (waitingQueue ? waitingQueue.length : 0);
      badge.innerText = `佇列: ${count} 人`;
    }

    if (activeName) {
      if (activeViewer) {
        activeName.innerText = `@${activeViewer.username}`;
      } else {
        activeName.innerText = `無 (等待觀眾點數兌換)`;
      }
    }

    if (waitlistContainer) {
      waitlistContainer.innerHTML = '';
      if (waitingQueue && waitingQueue.length > 0) {
        waitingQueue.forEach((item, idx) => {
          const chip = document.createElement('span');
          chip.className = 'queue-wait-item';
          chip.innerText = `#${idx + 1} @${item.username}`;
          waitlistContainer.appendChild(chip);
        });
      }
    }

    // 2. Render Stream Broadcast Overlay View (Stream View matching #1, #2, #3, #4 in sketch)
    const overlayActiveName = document.getElementById('overlayActiveName');
    const overlayWaitlistContainer = document.getElementById('overlayWaitlistContainer');

    if (overlayActiveName) {
      overlayActiveName.innerText = activeViewer ? `@${activeViewer.username}` : '無 (等待中)';
    }

    if (overlayWaitlistContainer) {
      overlayWaitlistContainer.innerHTML = '';
      if (waitingQueue && waitingQueue.length > 0) {
        waitingQueue.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = 'overlay-wait-row';
          row.innerHTML = `
            <span class="num">#${idx + 1}</span>
            <span class="name">@${item.username}</span>
          `;
          overlayWaitlistContainer.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'overlay-wait-row empty';
        emptyRow.innerText = '尚無排隊觀眾';
        overlayWaitlistContainer.appendChild(emptyRow);
      }
    }

    if (isInitiator) {
      postSyncPayload({
        type: 'QUEUE_UPDATE',
        activeViewer,
        waitingQueue
      });
    }
  }

  function updateTwitchBadge(statusState, message) {
    const badge = document.getElementById('twitchStatusBadge');
    if (!badge) return;

    badge.className = `twitch-status-badge ${statusState}`;
    badge.innerText = message;
  }

  function showTwitchNotice(msg) {
    const banner = document.getElementById('twitchNoticeBanner');
    const text = document.getElementById('twitchNoticeText');

    if (banner && text) {
      text.innerText = msg;
      banner.style.display = 'block';
      setTimeout(() => {
        banner.style.display = 'none';
      }, 5500);
    }
  }

  function showSaveToast() {
    const toast = document.getElementById('twitchSaveToast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3500);
    }
  }

  function appendTwitchLog(logText) {
    const container = document.getElementById('twitchLogContainer');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerText = logText;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // --- State Persistence & Filters ---

  function loadSavedState() {
    try {
      const savedLegendIds = localStorage.getItem('apex_roulette_legends');
      const savedWeaponIds = localStorage.getItem('apex_roulette_weapons');
      const savedVolume = localStorage.getItem('apex_roulette_volume');
      const savedTwitchCh = localStorage.getItem('apex_roulette_twitch_channel');
      const savedTwitchRw = localStorage.getItem('apex_roulette_twitch_reward');
      const savedTwitchSt = localStorage.getItem('apex_roulette_twitch_strict');
      const savedMuteDock = localStorage.getItem('apex_roulette_mute_dock');

      if (savedLegendIds) {
        const ids = JSON.parse(savedLegendIds);
        const valid = APEX_DATA.legends.filter(l => ids.includes(l.id));
        state.activeLegends = valid.length > 0 ? valid : [...APEX_DATA.legends];
      } else {
        state.activeLegends = [...APEX_DATA.legends];
      }

      if (savedWeaponIds) {
        const ids = JSON.parse(savedWeaponIds);
        const valid = APEX_DATA.weapons.filter(w => ids.includes(w.id));
        state.activeWeapons = valid.length > 0 ? valid : [...APEX_DATA.weapons];
      } else {
        state.activeWeapons = [...APEX_DATA.weapons];
      }

      if (savedVolume !== null) {
        state.soundVolume = parseFloat(savedVolume);
      } else {
        state.soundVolume = 0.65;
      }
      if (window.soundEngine) window.soundEngine.setVolume(state.soundVolume);

      if (savedTwitchCh) state.twitchChannel = savedTwitchCh;
      if (savedTwitchRw) state.twitchReward = savedTwitchRw;
      if (savedTwitchSt !== null) state.twitchStrictPoints = savedTwitchSt === 'true';
      if (savedMuteDock !== null) state.muteDockAudio = savedMuteDock === 'true';

    } catch (e) {
      state.activeLegends = [...APEX_DATA.legends];
      state.activeWeapons = [...APEX_DATA.weapons];
      state.soundVolume = 0.65;
      state.muteDockAudio = true;
    }
  }

  function saveState() {
    try {
      localStorage.setItem('apex_roulette_legends', JSON.stringify(state.activeLegends.map(l => l.id)));
      localStorage.setItem('apex_roulette_weapons', JSON.stringify(state.activeWeapons.map(w => w.id)));
      localStorage.setItem('apex_roulette_volume', state.soundVolume.toString());
      localStorage.setItem('apex_roulette_twitch_channel', state.twitchChannel);
      localStorage.setItem('apex_roulette_twitch_reward', state.twitchReward);
      localStorage.setItem('apex_roulette_twitch_strict', state.twitchStrictPoints.toString());
      localStorage.setItem('apex_roulette_mute_dock', state.muteDockAudio.toString());
    } catch (e) {}
  }

  function getFilteredLegends() {
    return state.activeLegends.length > 0 ? state.activeLegends : APEX_DATA.legends;
  }

  function getFilteredWeapons() {
    return state.activeWeapons.length > 0 ? state.activeWeapons : APEX_DATA.weapons;
  }

  // --- Synchronized Spin Triggers ---

  function spinBoth() {
    const availableLegends = getFilteredLegends();
    const availableWeapons = getFilteredWeapons();

    const legendIndex = Math.floor(Math.random() * availableLegends.length);
    const weaponIndex = Math.floor(Math.random() * availableWeapons.length);

    executeSpinBoth(legendIndex, weaponIndex, true);
  }

  function executeSpinBoth(legendIndex, weaponIndex, isInitiator = true) {
    if ((heroReel && heroReel.isSpinning) || (weaponReel && weaponReel.isSpinning)) return;

    heroDone = false;
    weaponDone = false;
    hideResultBanner();

    if (isInitiator) {
      postSyncPayload({
        type: 'SPIN_BOTH',
        legendIndex,
        weaponIndex
      });
    }

    if (heroReel) {
      heroReel.duration = state.spinDuration;
      heroReel.setItems(getFilteredLegends());
      heroReel.spin(legendIndex);
    }

    if (weaponReel) {
      weaponReel.duration = state.spinDuration + 600;
      weaponReel.setItems(getFilteredWeapons());
      weaponReel.spin(weaponIndex);
    }
  }

  function spinLegendOnly() {
    const availableLegends = getFilteredLegends();
    const legendIndex = Math.floor(Math.random() * availableLegends.length);
    executeSpinLegend(legendIndex, true);
  }

  function executeSpinLegend(legendIndex, isInitiator = true) {
    if (heroReel && !heroReel.isSpinning) {
      heroDone = false;
      weaponDone = true;
      hideResultBanner();

      if (isInitiator) {
        postSyncPayload({ type: 'SPIN_LEGEND', legendIndex });
      }

      heroReel.duration = state.spinDuration;
      heroReel.setItems(getFilteredLegends());
      heroReel.spin(legendIndex);
    }
  }

  function spinWeaponOnly() {
    const availableWeapons = getFilteredWeapons();
    const weaponIndex = Math.floor(Math.random() * availableWeapons.length);
    executeSpinWeapon(weaponIndex, true);
  }

  function executeSpinWeapon(weaponIndex, isInitiator = true) {
    if (weaponReel && !weaponReel.isSpinning) {
      heroDone = true;
      weaponDone = false;
      hideResultBanner();

      if (isInitiator) {
        postSyncPayload({ type: 'SPIN_WEAPON', weaponIndex });
      }

      weaponReel.duration = state.spinDuration;
      weaponReel.setItems(getFilteredWeapons());
      weaponReel.spin(weaponIndex);
    }
  }

  function checkCombinedResult() {
    if (heroDone && weaponDone) {
      showResultBanner();
      triggerConfetti();
    }
  }

  function showResultBanner() {
    let legendName = state.lastSelectedLegend ? state.lastSelectedLegend.name : '';
    let weaponName = state.lastSelectedWeapon ? state.lastSelectedWeapon.name : '';

    showResultBannerDirect(legendName, weaponName);

    postSyncPayload({
      type: 'SHOW_RESULT',
      legendName,
      weaponName
    });
  }

  function showResultBannerDirect(legendName, weaponName) {
    const banner = document.getElementById('resultBanner');
    const resultText = document.getElementById('resultCombination');

    if (banner && resultText) {
      let text = '';
      if (legendName && weaponName) {
        text = `【${legendName}】 + 【${weaponName}】`;
      } else if (legendName) {
        text = `英雄：${legendName}`;
      } else if (weaponName) {
        text = `槍械：${weaponName}`;
      }
      resultText.innerText = text;
      banner.classList.add('active');
    }
  }

  function hideResultBanner() {
    const banner = document.getElementById('resultBanner');
    if (banner) banner.classList.remove('active');
  }

  // --- Confetti Particle Explosion ---
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

  // Queue Control Buttons
  const completeChallengeBtn = document.getElementById('completeChallengeBtn');
  const clearQueueBtn = document.getElementById('clearQueueBtn');

  if (completeChallengeBtn) {
    completeChallengeBtn.addEventListener('click', () => {
      if (twitchIntegration) {
        twitchIntegration.completeCurrentChallenge();
      }
    });
  }

  if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
      if (twitchIntegration) {
        twitchIntegration.clearQueue();
      }
    });
  }

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
          <span>${legend.name}</span>
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
        if (state.activeLegends.length === 0) state.activeLegends = [...APEX_DATA.legends];
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
        if (state.activeWeapons.length === 0) state.activeWeapons = [...APEX_DATA.weapons];
        saveState();
        if (weaponReel) weaponReel.setItems(getFilteredWeapons());
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
      state.activeLegends = [...APEX_DATA.legends];
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
      if (weaponReel) weaponReel.setItems(getFilteredWeapons());
    });
  }

  if (deselectAllWeaponsBtn) {
    deselectAllWeaponsBtn.addEventListener('click', () => {
      state.activeWeapons = [...APEX_DATA.weapons];
      saveState();
      renderWeaponListEditor();
      if (weaponReel) weaponReel.setItems(getFilteredWeapons());
    });
  }

  // Controls Sliders & Twitch Bindings
  const volumeSlider = document.getElementById('volumeSlider');
  const durationSlider = document.getElementById('durationSlider');
  const twitchChannelInput = document.getElementById('twitchChannelInput');
  const twitchRewardInput = document.getElementById('twitchRewardInput');
  const strictPointsOnlyCheck = document.getElementById('strictPointsOnlyCheck');
  const muteDockAudioCheck = document.getElementById('muteDockAudioCheck');
  const connectTwitchBtn = document.getElementById('connectTwitchBtn');
  const testTwitchTriggerBtn = document.getElementById('testTwitchTriggerBtn');

  if (twitchChannelInput) twitchChannelInput.value = state.twitchChannel;
  if (twitchRewardInput) twitchRewardInput.value = state.twitchReward;
  if (strictPointsOnlyCheck) strictPointsOnlyCheck.checked = state.twitchStrictPoints;
  if (muteDockAudioCheck) muteDockAudioCheck.checked = state.muteDockAudio;

  if (muteDockAudioCheck) {
    muteDockAudioCheck.addEventListener('change', (e) => {
      state.muteDockAudio = e.target.checked;
      applyAudioMuteState();
      saveState();
    });
  }

  if (testTwitchTriggerBtn) {
    testTwitchTriggerBtn.addEventListener('click', () => {
      showTwitchNotice(`【測試】觀眾 @TestViewer 兌換了忠誠點數【${state.twitchReward || '抽隨機英雄和槍枝'}】！`);
      if (twitchIntegration) {
        twitchIntegration.enqueueRedemption('TestViewer', state.twitchReward || '抽隨機英雄和槍枝');
      } else {
        spinBoth();
      }
    });
  }

  if (connectTwitchBtn) {
    connectTwitchBtn.addEventListener('click', () => {
      const channel = twitchChannelInput.value.trim();
      state.twitchChannel = channel;
      state.twitchReward = twitchRewardInput.value.trim() || '抽隨機英雄和槍枝';
      state.twitchStrictPoints = strictPointsOnlyCheck ? strictPointsOnlyCheck.checked : true;
      saveState();

      if (twitchIntegration) {
        twitchIntegration.rewardName = state.twitchReward;
        twitchIntegration.strictPointsOnly = state.twitchStrictPoints;
        twitchIntegration.connect(state.twitchChannel);
      }

      postSyncPayload({
        type: 'CONFIG_UPDATE',
        twitchChannel: state.twitchChannel,
        twitchReward: state.twitchReward
      });

      showSaveToast();
    });
  }

  if (strictPointsOnlyCheck) {
    strictPointsOnlyCheck.addEventListener('change', (e) => {
      state.twitchStrictPoints = e.target.checked;
      if (twitchIntegration) twitchIntegration.strictPointsOnly = state.twitchStrictPoints;
      saveState();
    });
  }

  if (twitchRewardInput) {
    twitchRewardInput.addEventListener('change', (e) => {
      state.twitchReward = e.target.value.trim() || '抽隨機英雄和槍枝';
      if (twitchIntegration) twitchIntegration.rewardName = state.twitchReward;
      saveState();
    });
  }

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
