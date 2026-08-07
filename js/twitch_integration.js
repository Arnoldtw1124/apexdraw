/**
 * Twitch Integration Module for Apex OBS Visual Roulette
 * Zero-Setup WebSocket Client: No API keys, No OAuth tokens, No complex login!
 * Listens directly to Twitch IRC tags (`custom-reward-id`) for instant point redemptions.
 */

class TwitchIntegration {
  constructor(options = {}) {
    this.channel = options.channel || '';
    this.rewardName = options.rewardName || '抽隨機英雄和槍枝';
    this.strictPointsOnly = options.strictPointsOnly !== false;

    // Callbacks
    this.onSpinBoth = options.onSpinBoth || null;
    this.onSpinLegend = options.onSpinLegend || null;
    this.onSpinWeapon = options.onSpinWeapon || null;
    this.onStatusChange = options.onStatusChange || null;
    this.onTwitchNotice = options.onTwitchNotice || null;
    this.onDebugLog = options.onDebugLog || null;
    this.onQueueUpdate = options.onQueueUpdate || null;

    this.ircWs = null;
    this.isConnected = false;

    // Queue system for streamer manual control
    this.redemptionQueue = [];
    this.currentActiveViewer = null;
  }

  log(msg) {
    console.log(`[TwitchIntegration] ${msg}`);
    if (this.onDebugLog) {
      const time = new Date().toLocaleTimeString();
      this.onDebugLog(`[${time}] ${msg}`);
    }
  }

  connect(channelName) {
    if (!channelName) return;

    this.channel = channelName.trim().toLowerCase().replace(/^#/, '');
    this.disconnect();
    this.updateStatus('connecting', `正在連線至 Twitch 頻道 #${this.channel}...`);
    this.log(`🚀 開始建立開箱即用連線: #${this.channel}`);

    try {
      this.ircWs = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ircWs.onopen = () => {
        this.log('聊天室 WebSocket 已開啟，授權頻道標頭...');
        this.ircWs.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        this.ircWs.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 10000)}`);
        this.ircWs.send(`JOIN #${this.channel}`);
      };

      this.ircWs.onmessage = (event) => {
        this.handleIRCMessage(event.data);
      };

      this.ircWs.onerror = (error) => {
        this.log(`連線錯誤: ${error.message || '連線受阻'}`);
        this.updateStatus('error', 'Twitch 連線失敗');
      };

      this.ircWs.onclose = () => {
        this.log('Twitch 連線已關閉');
        this.updateStatus('disconnected', 'Twitch 未連線');
      };
    } catch (e) {
      this.log(`建立失敗: ${e.message}`);
      this.updateStatus('error', '無法建立 WebSocket 連線');
    }
  }

  disconnect() {
    if (this.ircWs) {
      try { this.ircWs.close(); } catch (e) {}
      this.ircWs = null;
    }
    this.isConnected = false;
    this.updateStatus('disconnected', 'Twitch 未連線');
  }

  handleIRCMessage(rawMessage) {
    const lines = rawMessage.split('\r\n');

    lines.forEach(line => {
      if (!line) return;

      if (line.startsWith('PING')) {
        if (this.ircWs && this.ircWs.readyState === WebSocket.OPEN) {
          this.ircWs.send('PONG :tmi.twitch.tv');
        }
        return;
      }

      if (line.includes(`JOIN #${this.channel}`)) {
        this.isConnected = true;
        this.updateStatus('connected', `已成功連線至 Twitch 頻道: #${this.channel}`);
        this.log(`🟢 已成功加入頻道 #${this.channel}！開箱即用運作中！`);
        if (this.onTwitchNotice) {
          this.onTwitchNotice(`成功連結 Twitch 頻道 #${this.channel} 的忠誠點數！`);
        }
        return;
      }

      if (line.includes('PRIVMSG')) {
        this.parseIRCLine(line);
      }
    });
  }

  parseIRCLine(rawLine) {
    try {
      let tags = {};
      let messageContent = '';
      let username = '觀眾';

      if (rawLine.startsWith('@')) {
        const tagString = rawLine.substring(1, rawLine.indexOf(' '));
        tagString.split(';').forEach(tag => {
          const [k, v] = tag.split('=');
          tags[k] = v;
        });
      }

      if (tags['display-name']) {
        username = tags['display-name'];
      } else {
        const match = rawLine.match(/:(\w+)!/);
        if (match) username = match[1];
      }

      const msgIndex = rawLine.indexOf(` PRIVMSG #${this.channel} :`);
      if (msgIndex !== -1) {
        messageContent = rawLine.substring(msgIndex + ` PRIVMSG #${this.channel} :`.length).trim();
      }

      // Check if real custom reward tag is attached to this IRC message
      const customRewardId = tags['custom-reward-id'];
      const isVerifiedRewardTag = Boolean(customRewardId) || rawLine.includes('custom-reward-id=');

      // STRICT MODE: Ignore free chat text!
      if (this.strictPointsOnly && !isVerifiedRewardTag) {
        return;
      }

      if (isVerifiedRewardTag) {
        this.log(`🎯 [點數扣點驗證成功] 觀眾 @${username} 兌換了忠誠點數！`);
        this.enqueueRedemption(username, this.rewardName || '忠誠點數');
        return;
      }
    } catch (e) {
      console.error('Error parsing Twitch IRC message:', e);
    }
  }

  enqueueRedemption(username, rewardName) {
    this.redemptionQueue.push({ username, rewardName });

    if (!this.currentActiveViewer) {
      this.advanceQueue();
    } else {
      this.notifyQueueChanged();
    }
  }

  // Streamer clicks "Done & Spin Next"
  completeCurrentChallenge() {
    this.log(`✅ 實況主完成此局，準備抽下一位...`);
    this.currentActiveViewer = null;
    this.advanceQueue();
  }

  clearQueue() {
    this.redemptionQueue = [];
    this.notifyQueueChanged();
    this.log(`🗑️ 佇列已全數清空`);
  }

  advanceQueue() {
    if (this.redemptionQueue.length === 0) {
      this.currentActiveViewer = null;
      this.notifyQueueChanged();
      return;
    }

    this.currentActiveViewer = this.redemptionQueue.shift();
    this.notifyQueueChanged();

    if (this.onTwitchNotice) {
      this.onTwitchNotice(`當前玩家 @${this.currentActiveViewer.username} 正在抽籤中！`);
    }

    if (this.onSpinBoth) {
      this.onSpinBoth();
    }
  }

  notifyQueueChanged() {
    if (this.onQueueUpdate) {
      this.onQueueUpdate(this.currentActiveViewer, this.redemptionQueue);
    }
  }

  updateStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange(state, message);
    }
  }
}

window.TwitchIntegration = TwitchIntegration;
