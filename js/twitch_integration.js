/**
 * Twitch Integration Module for Apex OBS Visual Roulette
 * Multi-Protocol Listener supporting:
 * 1. Twitch PubSub WebSocket with OAuth Token (0-typing Single-Click Point Redemptions!)
 * 2. Twitch IRC WebSocket (Chat Commands)
 * 3. Redemption Queue & Strict Points-Only Rate Limiting Mode
 */

class TwitchIntegration {
  constructor(options = {}) {
    this.channel = options.channel || '';
    this.rewardName = options.rewardName || '抽隨機英雄和槍枝';
    this.oauthToken = options.oauthToken || '';
    this.enableChatCmds = options.enableChatCmds === true; // Default OFF for safety
    this.strictPointsOnly = options.strictPointsOnly !== false; // Default ON: Strictly require channel points

    // Callbacks
    this.onSpinBoth = options.onSpinBoth || null;
    this.onSpinLegend = options.onSpinLegend || null;
    this.onSpinWeapon = options.onSpinWeapon || null;
    this.onStatusChange = options.onStatusChange || null;
    this.onTwitchNotice = options.onTwitchNotice || null;
    this.onDebugLog = options.onDebugLog || null;

    this.ircWs = null;
    this.pubsubWs = null;
    this.isConnected = false;
    this.pingInterval = null;

    // Queue system for rate-limiting
    this.redemptionQueue = [];
    this.isProcessingQueue = false;
  }

  log(msg) {
    console.log(`[TwitchIntegration] ${msg}`);
    if (this.onDebugLog) {
      const time = new Date().toLocaleTimeString();
      this.onDebugLog(`[${time}] ${msg}`);
    }
  }

  connect(channelName, oauthToken = '') {
    if (!channelName) return;

    this.channel = channelName.trim().toLowerCase().replace(/^#/, '');
    if (oauthToken) {
      this.oauthToken = oauthToken.trim().replace(/^oauth:/, '');
    }

    this.disconnect();
    this.updateStatus('connecting', `正在連線至 Twitch 頻道 #${this.channel}...`);
    this.log(`開始建立與 #${this.channel} 的防刷點數連線...`);

    if (this.oauthToken) {
      this.log('🔑 已啟用 OAuth Token，單擊點數防刷模式生效！');
    } else {
      this.log('⚠️ 未提供 OAuth Token，建議點擊【1-Click 授權】啟用免打字扣點事件');
    }

    this.connectIRC();
    this.connectPubSub();
  }

  connectIRC() {
    try {
      this.ircWs = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ircWs.onopen = () => {
        this.log('IRC 聊天室 WebSocket 已開啟...');
        this.ircWs.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        this.ircWs.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 10000)}`);
        this.ircWs.send(`JOIN #${this.channel}`);
      };

      this.ircWs.onmessage = (event) => {
        this.handleIRCMessage(event.data);
      };

      this.ircWs.onerror = (error) => {
        this.log(`IRC 連線錯誤: ${error.message || '連線受阻'}`);
      };

      this.ircWs.onclose = () => {
        this.log('IRC 聊天室連線已關閉');
      };
    } catch (e) {
      this.log(`IRC 建立失敗: ${e.message}`);
    }
  }

  connectPubSub() {
    try {
      this.pubsubWs = new WebSocket('wss://pubsub-edge.twitch.tv');

      this.pubsubWs.onopen = () => {
        this.log('PubSub 點數專用 WebSocket 已開啟，向 Twitch 訂閱主題...');
        this.subscribePubSubTopics();

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.pubsubWs && this.pubsubWs.readyState === WebSocket.OPEN) {
            this.pubsubWs.send(JSON.stringify({ type: 'PING' }));
          }
        }, 240000);
      };

      this.pubsubWs.onmessage = (event) => {
        this.handlePubSubMessage(event.data);
      };

      this.pubsubWs.onerror = (error) => {
        this.log(`PubSub 錯誤: ${error.message || '連線中斷'}`);
      };

      this.pubsubWs.onclose = () => {
        this.log('PubSub 連線已關閉');
        if (this.pingInterval) clearInterval(this.pingInterval);
      };
    } catch (e) {
      this.log(`PubSub 建立失敗: ${e.message}`);
    }
  }

  async subscribePubSubTopics() {
    try {
      const res = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: { 'Client-Id': 'kimne78kx3ncx6brogo4mv6wki5h1ko' },
        body: JSON.stringify({
          query: `query { user(login: "${this.channel}") { id displayName } }`
        })
      });
      const data = await res.json();
      const userId = data?.data?.user?.id;

      if (userId) {
        this.log(`成功取得 Twitch 頻道 ID: ${userId}，訂閱點數扣點廣播...`);

        const topics = [
          `community-points-channel-v1.${userId}`,
          `channel-points-channel-v1.${userId}`
        ];

        const listenMsg = {
          type: 'LISTEN',
          nonce: Math.random().toString(36).substring(2, 15),
          data: {
            topics: topics,
            auth_token: this.oauthToken || ''
          }
        };

        if (this.pubsubWs && this.pubsubWs.readyState === WebSocket.OPEN) {
          this.pubsubWs.send(JSON.stringify(listenMsg));
          this.log(`已傳送 PubSub LISTEN 指令 (OAuth: ${this.oauthToken ? '已帶入' : '無'})`);
        }
      } else {
        this.log(`無法從 Twitch 取得 #${this.channel} 的 ID`);
      }
    } catch (e) {
      this.log(`GQL 頻道 ID 取得失敗: ${e.message}`);
    }
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ircWs) {
      try { this.ircWs.close(); } catch (e) {}
      this.ircWs = null;
    }
    if (this.pubsubWs) {
      try { this.pubsubWs.close(); } catch (e) {}
      this.pubsubWs = null;
    }
    this.isConnected = false;
    this.updateStatus('disconnected', 'Twitch 未連線');
  }

  handlePubSubMessage(rawMsg) {
    try {
      const msg = JSON.parse(rawMsg);
      if (msg.type === 'PONG') return;

      if (msg.type === 'RESPONSE') {
        if (msg.error) {
          this.log(`⚠️ PubSub 回應錯誤: ${msg.error} (防刷單擊點數需要 1-Click OAuth 授權)`);
        } else {
          this.log(`🟢 PubSub 防刷點數頻道監聽成功！點擊扣點方可觸發！`);
        }
        return;
      }

      if (msg.type === 'MESSAGE' && msg.data) {
        const payload = JSON.parse(msg.data.message || '{}');
        const eventType = payload.type || '';

        if (eventType === 'reward-redeemed' || eventType === 'custom-reward-created') {
          const redemption = payload.data?.redemption;
          const rewardTitle = redemption?.reward?.title || '';
          const userName = redemption?.user?.display_name || redemption?.user?.login || '觀眾';

          this.log(`🎉 [PubSub 驗證扣點] 觀眾 @${userName} 成功兌換點數: "${rewardTitle}"`);

          const cleanTarget = this.rewardName ? this.rewardName.toLowerCase().trim() : '';
          const cleanTitle = rewardTitle.toLowerCase().trim();

          if (!cleanTarget || cleanTitle.includes(cleanTarget) || cleanTarget.includes(cleanTitle)) {
            this.log(`🎯 點數名稱匹配成功！加入抽籤排隊隊列...`);
            this.enqueueRedemption(userName, rewardTitle);
          } else {
            this.log(`ℹ️ PubSub 忽略未設定的點數項目: "${rewardTitle}" (設定項目: "${this.rewardName}")`);
          }
        }
      }
    } catch (e) {
      console.error('Error handling PubSub message:', e);
    }
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
        this.log(`已成功加入頻道 #${this.channel}`);
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

      // STRICT MODE: If strictPointsOnly is enabled, ignore free chat text!
      if (this.strictPointsOnly && !isVerifiedRewardTag) {
        // Free chat text is blocked in strict mode
        return;
      }

      const cleanContent = messageContent.toLowerCase().trim();
      const cleanTargetReward = this.rewardName ? this.rewardName.toLowerCase().trim() : '';

      if (isVerifiedRewardTag && cleanTargetReward && (cleanContent.includes(cleanTargetReward) || !cleanContent)) {
        this.log(`🎯 [IRC 帶標籤扣點驗證] 來自 @${username}`);
        this.enqueueRedemption(username, this.rewardName);
        return;
      }

      // Chat Commands (Only if explicitly enabled by streamer)
      if (this.enableChatCmds && !this.strictPointsOnly) {
        const cmd = messageContent.toLowerCase();

        if (cmd === '!spin' || cmd === '!apex' || cmd === '!抽' || cmd === '!spinboth') {
          this.log(`🎮 觸發聊天室指令 !spin 來自 @${username}`);
          this.enqueueRedemption(username, '!spin');
        } else if (cmd === '!spinhero' || cmd === '!hero' || cmd === '!抽英雄') {
          this.log(`⚡ 觸發聊天室指令 !spinhero 來自 @${username}`);
          if (this.onSpinLegend) this.onSpinLegend();
        } else if (cmd === '!spinweapon' || cmd === '!weapon' || cmd === '!抽槍械') {
          this.log(`⚔️ 觸發聊天室指令 !spinweapon 來自 @${username}`);
          if (this.onSpinWeapon) this.onSpinWeapon();
        }
      }
    } catch (e) {
      console.error('Error parsing Twitch IRC message:', e);
    }
  }

  enqueueRedemption(username, rewardName) {
    this.redemptionQueue.push({ username, rewardName });
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessingQueue || this.redemptionQueue.length === 0) return;

    this.isProcessingQueue = true;
    const current = this.redemptionQueue.shift();

    if (this.onTwitchNotice) {
      this.onTwitchNotice(`觀眾 @${current.username} 兌換了忠誠點數【${current.rewardName}】！`);
    }

    if (this.onSpinBoth) {
      this.onSpinBoth();
    }

    // Wait for spin animation duration (5.5 seconds) before processing next queued redemption
    setTimeout(() => {
      this.isProcessingQueue = false;
      this.processQueue();
    }, 5500);
  }

  updateStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange(state, message);
    }
  }
}

window.TwitchIntegration = TwitchIntegration;
