/**
 * Twitch Integration Module for Apex OBS Visual Roulette
 * Handles Twitch Channel Points Redemptions & Chat Commands.
 * 
 * Accurately detects IRC `@custom-reward-id` tags for Channel Points Redemptions,
 * separating real point redemptions from regular chat text messages.
 */

class TwitchIntegration {
  constructor(options = {}) {
    this.channel = options.channel || '';
    this.rewardName = options.rewardName || '抽輪盤';
    this.enableChatCmds = options.enableChatCmds !== false;
    this.enableReward = options.enableReward !== false;

    // Callbacks
    this.onSpinBoth = options.onSpinBoth || null;
    this.onSpinLegend = options.onSpinLegend || null;
    this.onSpinWeapon = options.onSpinWeapon || null;
    this.onStatusChange = options.onStatusChange || null;
    this.onTwitchNotice = options.onTwitchNotice || null;

    this.ws = null;
    this.isConnected = false;
  }

  connect(channelName) {
    if (!channelName) return;

    this.channel = channelName.trim().toLowerCase().replace(/^#/, '');
    if (this.ws) {
      this.disconnect();
    }

    this.updateStatus('connecting', `正在連線至 Twitch 頻道 #${this.channel}...`);

    try {
      this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ws.onopen = () => {
        this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        this.ws.send(`NICK justinfan${Math.floor(Math.random() * 80000 + 10000)}`);
        this.ws.send(`JOIN #${this.channel}`);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('Twitch WebSocket Error:', error);
        this.updateStatus('error', 'Twitch 連線發生錯誤');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateStatus('disconnected', 'Twitch 已斷開連線');
      };
    } catch (e) {
      console.error('Twitch Connection Failed:', e);
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

      // 1. Detect REAL Channel Points Redemption (custom-reward-id tag sent by Twitch)
      const customRewardId = tags['custom-reward-id'];
      const isRedemptionTag = Boolean(customRewardId) || rawLine.includes('custom-reward-id=');

      if (isRedemptionTag) {
        if (this.onTwitchNotice) {
          this.onTwitchNotice(`觀眾 @${username} 兌換了忠誠點數！`);
        }
        if (this.onSpinBoth) this.onSpinBoth();
        return;
      }

      // 2. Detect Chat Commands (!spin, !spinhero, !spinweapon, !抽輪盤)
      if (this.enableChatCmds) {
        const cmd = messageContent.toLowerCase();

        if (cmd === '!spin' || cmd === '!apex' || cmd === '!抽' || cmd === '!spinboth' || (this.rewardName && cmd === `!${this.rewardName.toLowerCase()}`)) {
          if (this.onTwitchNotice) this.onTwitchNotice(`觀眾 @${username} 觸發了指令 !spin`);
          if (this.onSpinBoth) this.onSpinBoth();
        } else if (cmd === '!spinhero' || cmd === '!hero' || cmd === '!抽英雄') {
          if (this.onTwitchNotice) this.onTwitchNotice(`觀眾 @${username} 觸發了指令 !spinhero`);
          if (this.onSpinLegend) this.onSpinLegend();
        } else if (cmd === '!spinweapon' || cmd === '!weapon' || cmd === '!抽槍械') {
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
