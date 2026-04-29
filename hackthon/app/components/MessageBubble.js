/**
 * MessageBubble — Renders a chat message bubble
 */
class MessageBubble {
  static render(msg, isOfflineMsg = false) {
    const div = document.createElement('div');
    div.className = `message ${msg.isMe ? 'outgoing' : 'incoming'}`;
    div.id = `msg-${msg.id}`;

    const statusIcon = MessageBubble.getStatusIcon(msg.status);
    const time = TimeUtils.formatTime(msg.timestamp);
    const offlineBadge = isOfflineMsg 
      ? `<span class="message-offline-badge">📡 Queued offline</span>` 
      : '';

    div.innerHTML = `
      ${!msg.isMe ? `<div class="message-sender">${msg.avatar} ${msg.sender}</div>` : ''}
      <div class="message-text">${msg.text}</div>
      <div class="message-meta">
        ${offlineBadge}
        <span class="message-time">${time}</span>
        ${msg.isMe ? `<span class="message-status ${msg.status}" id="status-${msg.id}">${statusIcon}</span>` : ''}
      </div>
    `;
    return div;
  }

  static getStatusIcon(status) {
    switch (status) {
      case 'pending': return '⏱';
      case 'sending': return '⏱';
      case 'delivered': return '✓';
      case 'read': return '✓✓';
      default: return '⏱';
    }
  }

  static updateStatus(msgId, newStatus) {
    const statusEl = document.getElementById(`status-${msgId}`);
    if (statusEl) {
      statusEl.textContent = MessageBubble.getStatusIcon(newStatus);
      statusEl.className = `message-status ${newStatus} just-delivered`;
      setTimeout(() => statusEl.classList.remove('just-delivered'), 500);
    }
  }
}
