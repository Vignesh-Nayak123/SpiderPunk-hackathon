/**
 * SessionManager — Tracks current user session
 * 
 * Records session start/end, screens visited, and duration.
 */

class SessionManager {
  constructor() {
    this.currentSession = null;
    this.sessions = [];
  }

  /**
   * Start a new session
   */
  startSession() {
    this.currentSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      startedAt: Date.now(),
      screens: [],
      endedAt: null,
      duration: null
    };

    console.log(`[SessionManager] Session started: ${this.currentSession.id}`);
    return this.currentSession;
  }

  /**
   * Log a screen visit in the current session
   */
  logScreen(screenName) {
    if (!this.currentSession) this.startSession();

    this.currentSession.screens.push({
      screen: screenName,
      timestamp: Date.now()
    });
  }

  /**
   * End the current session
   */
  endSession() {
    if (!this.currentSession) return null;

    this.currentSession.endedAt = Date.now();
    this.currentSession.duration = this.currentSession.endedAt - this.currentSession.startedAt;
    this.sessions.push(this.currentSession);

    const session = this.currentSession;
    this.currentSession = null;

    console.log(`[SessionManager] Session ended: ${session.id} (${Math.round(session.duration / 1000)}s, ${session.screens.length} screens)`);
    return session;
  }

  /**
   * Get current session info
   */
  getCurrentSession() {
    if (!this.currentSession) return null;

    return {
      ...this.currentSession,
      duration: Date.now() - this.currentSession.startedAt,
      screenCount: this.currentSession.screens.length
    };
  }

  /**
   * Get session history
   */
  getHistory() {
    return this.sessions;
  }
}
