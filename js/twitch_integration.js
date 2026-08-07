/**
 * Twitch Integration Module for Apex OBS Visual Roulette
 * Handles Twitch Channel Points Redemptions, Custom Rewards, Highlighted Messages & Chat Commands.
 * 
 * Supports:
 * 1. custom-reward-id (Custom Channel Points rewards with text input)
 * 2. msg-id=highlighted-message (Built-in Twitch 醒目標示我的訊息 points reward)
 * 3. Exact, partial & command-style Reward Name matching in chat
 * 4. Real-time Debug Log inspector
 */

class TwitchIntegration {
  constructor(options = {}) {
    this.channel = options.channel || '';
    this.rewardName = options.rewardName || '抽隨機英雄和槍枝';
    this.enableChatCmds = options.enableChatCmds !== false;
    this.enableReward = options.enableReward !== false;

    // Callbacks
    this.onSpinBoth = options.onSpinBoth || null;
    this.onSpinLegend = options.onSpinLegend || null;
    this.onSpinWeapon = options.onSpinWeapon || null;
    this.onStatusChange = options.onStatusChange || null;
    this.onTwitchNotice = options.onTwitchNotice || null;
    this.onDebugLog = options.onDebugLog || null;

    this.ws = null;
    this.isConnected = false;
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
    if (this.ws) {
      this.disconnect();
    }

    this.updateStatus('connecting', `正在連線至 Twitch 頻道 #${this.channel}...`);
    this.log(`開始建立與 #${this.channel} 的 WebSocket 頻道監聽...`);

    try {
      this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ws.onopen = () => {
        this.log('WebSocket 已開啟，發送 Twitch Tags/Commands 授權標頭...');
        this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        this.ws.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 10000)}`);
        this.ws.send(`JOIN #${this.channel}`);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.log(`WebSocket 錯誤: ${error.message || '連線中斷'}`);
        this.updateStatus('error', 'Twitch 連線發生錯誤');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.log('WebSocket 連線已關閉');
        this.updateStatus('disconnected', 'Twitch 已斷開連線');
      };
    } catch (e) {
      this.log(`連線失敗: ${e.message}`);
      this.updateStatus('error', '無法建立 WebSocket 連線');
    }
  }

  disconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.updateStatus('disconnected', 'Twitch 未連線');
  }

  handleMessage(rawMessage) {
    const lines = rawMessage.split('\r\n');

    lines.forEach(line => {
      if (!line) return;

      // Handle PING to keep connection alive
      if (line.startsWith('PING')) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('PONG :tmi.twitch.tv');
        }
        return;
      }

      // Check for JOIN confirmation
      if (line.includes(`JOIN #${this.channel}`)) {
        this.isConnected = true;
        this.updateStatus('connected', `已成功連線至 Twitch 頻道: #${this.channel}`);
        this.log(`成功加入頻道 #${this.channel}，開始即時監聽訊息！`);
        if (this.onTwitchNotice) {
          this.onTwitchNotice(`成功連結 Twitch 頻道 #${this.channel} 的忠誠點數與指令！`);
        }
        return;
      }

      // Parse PRIVMSG tags for Channel Points and Chat Commands
      if (line.includes('PRIVMSG')) {
        this.parseChatMessage(line);
      }
    });
  }

  parseChatMessage(rawLine) {
    try {
      let tags = {};
      let messageContent = '';
      let username = '觀眾';

      // Parse IRC tags
      if (rawLine.startsWith('@')) {
        const tagString = rawLine.substring(1, rawLine.indexOf(' '));
        tagString.split(';').forEach(tag => {
          const [k, v] = tag.split('=');
          tags[k] = v;
        });
      }

      // Extract username
      if (tags['display-name']) {
        username = tags['display-name'];
      } else {
        const match = rawLine.match(/:(\w+)!/);
        if (match) username = match[1];
      }

      // Extract message content
      const msgIndex = rawLine.indexOf(` PRIVMSG #${this.channel} :`);
      if (msgIndex !== -1) {
        messageContent = rawLine.substring(msgIndex + ` PRIVMSG #${this.channel} :`.length).trim();
      }

      this.log(`收到訊息 [@${username}]: "${messageContent}" (msg-id: ${tags['msg-id'] || '無'}, custom-reward-id: ${tags['custom-reward-id'] || '無'})`);

      // 1. Detect Channel Points & Highlighted Message rewards
      const customRewardId = tags['custom-reward-id'];
      const msgId = tags['msg-id'];
      
      const isCustomReward = Boolean(customRewardId) || rawLine.includes('custom-reward-id=');
      const isHighlightedMsg = msgId === 'highlighted-message';

      const cleanContent = messageContent.toLowerCase().trim();
      const cleanTargetReward = this.rewardName ? this.rewardName.toLowerCase().trim() : '';

      const isRewardNameMatch = cleanTargetReward && (
        cleanContent.includes(cleanTargetReward) || 
        cleanContent === `!${cleanTargetReward}`
      );

      if (isCustomReward || isHighlightedMsg || isRewardNameMatch) {
        const matchType = isCustomReward ? '自訂點數' : isHighlightedMsg ? '醒目標示' : '名稱匹配';
        this.log(`🎯 觸發點數兌換！來自 @${username} (${matchType})`);
        
        if (this.onTwitchNotice) {
          this.onTwitchNotice(`觀眾 @${username} 兌換了忠誠點數【${this.rewardName || '點數兌換'}】！`);
        }
        if (this.onSpinBoth) this.onSpinBoth();
        return;
      }

      // 2. Detect Chat Commands (!spin, !spinhero, !spinweapon)
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
