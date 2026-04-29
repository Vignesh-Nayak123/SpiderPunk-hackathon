/**
 * TimeUtils — Helper functions for time-based prediction logic
 * Used by BehaviorTracker and PrefetchScheduler
 */

const TimeUtils = {
  /**
   * Get current hour (0-23)
   */
  getCurrentHour() {
    return new Date().getHours();
  },

  /**
   * Get day of week (0=Sunday, 6=Saturday)
   */
  getDayOfWeek() {
    return new Date().getDay();
  },

  /**
   * Get named day
   */
  getDayName(dayNum) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum !== undefined ? dayNum : this.getDayOfWeek()];
  },

  /**
   * Get time slot: morning / afternoon / evening / night
   */
  getTimeSlot(hour) {
    const h = hour !== undefined ? hour : this.getCurrentHour();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
  },

  /**
   * Format timestamp to human-readable "8:55 AM"
   */
  formatTime(timestamp) {
    const d = new Date(timestamp);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  },

  /**
   * Format timestamp to "8:55 AM, Mon"
   */
  formatTimeWithDay(timestamp) {
    const d = new Date(timestamp);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${this.formatTime(timestamp)}, ${days[d.getDay()]}`;
  },

  /**
   * Format relative time: "2 min ago", "1 hr ago"
   */
  formatRelative(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  },

  /**
   * Check if a timestamp is within a window of minutes from now
   */
  isWithinWindow(timestamp, windowMinutes) {
    const diff = Math.abs(Date.now() - timestamp);
    return diff <= windowMinutes * 60 * 1000;
  },

  /**
   * Get a timestamp for "X minutes ago" (for demo/seed data)
   */
  minutesAgo(minutes) {
    return Date.now() - minutes * 60 * 1000;
  },

  /**
   * Get a timestamp for "today at hour:minute"
   */
  todayAt(hour, minute = 0) {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  }
};

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeUtils;
}
