/**
 * ChatScreen — WhatsApp-style chat interface
 */
class ChatScreen {
  constructor(sdk, predictor) {
    this.sdk = sdk;
    this.predictor = predictor;
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.messages = [...SeedData.messages];
    this.offlineMessages = [];
    this._bind();
  }

  _bind() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // Listen for sync completion to update message statuses
    if (this.sdk && this.sdk.queue) {
      this.sdk.queue.on('flush-complete', (data) => {
        this._handleSyncComplete(data);
      });
    }
  }

  render() {
    this.messagesEl.innerHTML = '';
    this.messages.forEach(msg => {
      const isOffline = this.offlineMessages.includes(msg.id);
      const bubble = MessageBubble.render(msg, isOffline);
      this.messagesEl.appendChild(bubble);
    });
    this._scrollToBottom();
    
    // Log screen view
    if (this.predictor) this.predictor.log('chat');
  }

  async sendMessage() {
    const text = this.inputEl.value.trim();
    if (!text) return;

    const isOnline = this.sdk && this.sdk.network.isOnline();
    const msgId = `msg-${Date.now()}`;

    const newMsg = {
      id: msgId,
      sender: 'You',
      avatar: '🧑‍💻',
      text: text,
      timestamp: Date.now(),
      status: isOnline ? 'sending' : 'pending',
      isMe: true
    };

    this.messages.push(newMsg);
    
    if (!isOnline) {
      this.offlineMessages.push(msgId);
    }

    const bubble = MessageBubble.render(newMsg, !isOnline);
    this.messagesEl.appendChild(bubble);
    this.inputEl.value = '';
    this._scrollToBottom();

    // Queue the action
    if (this.sdk) {
      const action = await this.sdk.queueAction('send_message', {
        text: text,
        timestamp: Date.now(),
        localId: msgId
      });

      // If online, simulate delivery after short delay
      if (isOnline) {
        setTimeout(() => {
          newMsg.status = 'delivered';
          MessageBubble.updateStatus(msgId, 'delivered');
          App.showToast('Message delivered ✓', 'success');
        }, 800);
      }
    }
  }

  _handleSyncComplete(data) {
    // Update all offline messages to delivered
    this.offlineMessages.forEach(msgId => {
      const msg = this.messages.find(m => m.id === msgId);
      if (msg) {
        msg.status = 'delivered';
        MessageBubble.updateStatus(msgId, 'delivered');

        // Remove offline badge
        const msgEl = document.getElementById(`msg-${msgId}`);
        if (msgEl) {
          const badge = msgEl.querySelector('.message-offline-badge');
          if (badge) badge.style.display = 'none';
        }
      }
    });

    if (this.offlineMessages.length > 0) {
      App.showToast(`${this.offlineMessages.length} message(s) delivered! ✓`, 'success');
      this.offlineMessages = [];
    }
  }

  _scrollToBottom() {
    setTimeout(() => {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }, 50);
  }
}
