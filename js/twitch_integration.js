/**
 * Twitch Integration Module for Apex OBS Visual Roulette
 * Multi-Protocol Listener supporting:
 * 1. Twitch IRC WebSocket (Chat Commands)
 * 2. Twitch PubSub WebSocket with OAuth Token (0-typing Single-Click Point Redemptions!)
 */

class TwitchIntegration {
  constructor(options = {}) {
    this.channel = options.channel || '';
    this.rewardName = options.rewardName || '抽隨機英雄和槍枝';
    this.oauthToken = options.oauthToken || '';
    this.enableChatCmds = options.enableChatCmds !== false;
    this.enableReward = options.enableReward !== false;

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
    this.log(`開始建立與 #${this.channel} 的頻道與點數連線...`);

    if (this.oauthToken) {
      this.log('🔑 已檢測到 OAuth 授權 Token，將啟用 Twitch PubSub 0 打字單擊點數監聽！');
    } else {
      this.log('⚠️ 尚未提供 OAuth Token (若要免打字單擊即抽，建議點擊 1-Click 授權)');
    }

    // 1. Connect Twitch IRC WebSocket
    this.connectIRC();

    // 2. Connect Twitch PubSub WebSocket for 0-typing single-click redemptions
    this.connectPubSub();
  }

  connectIRC() {
    try {
      this.ircWs = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ircWs.onopen = () => {
        this.log('IRC 聊天室 WebSocket 已開啟，授權頻道標頭...');
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
        this.log(`成功取得 Twitch 頻道 ID: ${userId}，傳送 LISTEN 訊息...`);

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
          this.log(`已傳送 PubSub LISTEN 指令 (Token: ${this.oauthToken ? '已帶入' : '無'})`);
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
          this.log(`⚠️ PubSub 回應錯誤: ${msg.error} (可能需要 OAuth Token 授權)`);
        } else {
          this.log(`🟢 PubSub 訂閱成功！已準備接收 0 打字單擊點數事件！`);
        }
        return;
      }

      if (msg.type === 'MESSAGE' && msg.data) {
        const payload = JSON.parse(msg.data.message || '{}');
        const eventType = payload.type || '';

        this.log(`PubSub 收到點數訊息: ${eventType}`);

        if (eventType === 'reward-redeemed' || eventType === 'custom-reward-created') {
          const redemption = payload.data?.redemption;
          const rewardTitle = redemption?.reward?.title || '';
          const userName = redemption?.user?.display_name || redemption?.user?.login || '觀眾';

          this.log(`🎉 [PubSub 免打字點擊] 收到點數兌換: "${rewardTitle}" 來自 @${userName}`);

          const cleanTarget = this.rewardName ? this.rewardName.toLowerCase().trim() : '';
          const cleanTitle = rewardTitle.toLowerCase().trim();

          if (!cleanTarget || cleanTitle.includes(cleanTarget) || cleanTarget.includes(cleanTitle)) {
            this.log(`🎯 PubSub 匹配成功！名稱吻合: "${rewardTitle}"`);
            if (this.onTwitchNotice) {
              this.onTwitchNotice(`觀眾 @${userName} 兌換了忠誠點數【${rewardTitle}】！`);
            }
            if (this.onSpinBoth) this.onSpinBoth();
          } else {
            this.log(`ℹ️ PubSub 忽略未設定的點數項目: "${rewardTitle}" (目前設定: "${this.rewardName}")`);
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
          this.onTwitchNotice(`成功連結 Twitch 頻道 #${this.channel} 的忠誠點數與指令！`);
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

      this.log(`聊天室 [@${username}]: "${messageContent}" (msg-id: ${tags['msg-id'] || '無'})`);

      // Detect IRC tags
      const customRewardId = tags['custom-reward-id'];
      const msgId = tags['msg-id'];

      const isCustomReward = Boolean(customRewardId) || rawLine.includes('custom-reward-id=');
      const isHighlightedMsg = msgId === 'highlighted-message';

      const cleanContent = messageContent.toLowerCase().trim();
      const cleanTargetReward = this.rewardName ? this.rewardName.toLowerCase().trim() : '';

      const isConfiguredAsHighlight = cleanTargetReward.includes('醒目') || cleanTargetReward.includes('highlight');

      let isMatched = false;

      if (isConfiguredAsHighlight && isHighlightedMsg) {
        isMatched = true;
      } else if (cleanTargetReward && (cleanContent.includes(cleanTargetReward) || cleanContent === `!${cleanTargetReward}`)) {
        isMatched = true;
      } else if (isCustomReward) {
        if (!cleanTargetReward || cleanContent.includes(cleanTargetReward)) {
          isMatched = true;
        }
      }

      if (isMatched) {
        this.log(`🎯 IRC 標籤匹配成功！來自 @${username} (匹配項目: ${this.rewardName})`);
        if (this.onTwitchNotice) {
          this.onTwitchNotice(`觀眾 @${username} 兌換了忠誠點數【${this.rewardName}】！`);
        }
        if (this.onSpinBoth) this.onSpinBoth();
        return;
      }

      // Detect chat commands (!spin, !hero, !weapon)
      if (this.enableChatCmds) {
        const cmd = messageContent.toLowerCase();

        if (cmd === '!spin' || cmd === '!apex' || cmd === '!抽' || cmd === '!spinboth') {
          this.log(`🎮 觸發聊天室指令 !spin 來自 @${username}`);
          if (this.onTwitchNotice) this.onTwitchNotice(`觀眾 @${username} 觸發了指令 !spin`);
          if (this.onSpinBoth) this.onSpinBoth();
        } else if (cmd === '!spinhero' || cmd === '!hero' || cmd === '!抽英雄') {
          this.log(`⚡ 觸發聊天室指令 !spinhero 來自 @${username}`);
          if (this.onTwitchNotice) this.onTwitchNotice(`觀眾 @${username} 觸發了指令 !spinhero`);
          if (this.onSpinLegend) this.onSpinLegend();
        } else if (cmd === '!spinweapon' || cmd === '!weapon' || cmd === '!抽槍械') {
          this.log(`⚔️ 觸發聊天室指令 !spinweapon 來自 @${username}`);
          if (this.onTwitchNotice) this.onTwitchNotice(`觀眾 @${username} 觸發了指令 !spinweapon`);
          if (this.onSpinWeapon) this.onSpinWeapon();
        }
      }
    } catch (e) {
      console.error('Error parsing Twitch IRC message:', e);
    }
  }

  updateStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange(state, message);
    }
  }
}

window.TwitchIntegration = TwitchIntegration;
