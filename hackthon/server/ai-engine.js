/**
 * AI Engine — Behavior Analysis & Content Prediction
 * 
 * This is the "brain" of the Offline Layer prediction system.
 * It analyzes user behavior patterns (screen opens by time/day)
 * and predicts what content the user will need next.
 * 
 * Algorithm: Frequency-based pattern matching with time-slot weighting
 */

class AIEngine {
  constructor() {
    // Store behavior patterns: { "screen:hour:dayOfWeek": count }
    this.patterns = {};
    this.rawLogs = [];
    this.lastAnalysis = null;
  }

  /**
   * Ingest behavior logs from the client
   * @param {Array} logs - [{screen, hour, dayOfWeek, timestamp}]
   */
  ingestLogs(logs) {
    this.rawLogs.push(...logs);
    
    logs.forEach(log => {
      const key = `${log.screen}:${log.hour}:${log.dayOfWeek}`;
      this.patterns[key] = (this.patterns[key] || 0) + 1;
      
      // Also track screen-hour patterns (day-agnostic for more data)
      const hourKey = `${log.screen}:${log.hour}:*`;
      this.patterns[hourKey] = (this.patterns[hourKey] || 0) + 1;
    });

    console.log(`[AI Engine] Ingested ${logs.length} logs. Total patterns: ${Object.keys(this.patterns).length}`);
  }

  /**
   * Predict what content the user will need
   * @param {number} currentHour - Current hour (0-23)
   * @param {number} currentDay - Current day of week (0-6)
   * @returns {Array} Predicted content with confidence scores
   */
  predict(currentHour, currentDay) {
    const predictions = [];
    
    // Look at upcoming hours (next 1-3 hours)
    for (let hourOffset = 0; hourOffset <= 2; hourOffset++) {
      const targetHour = (currentHour + hourOffset) % 24;
      
      // Check exact day+hour match (highest weight)
      const exactKey = `*:${targetHour}:${currentDay}`;
      // Check hour-only match (lower weight)
      const hourKey = `*:${targetHour}:*`;
      
      // Find all screens accessed at this time
      Object.keys(this.patterns).forEach(key => {
        const [screen, hour, day] = key.split(':');
        if (parseInt(hour) === targetHour) {
          const count = this.patterns[key];
          const isExactDay = parseInt(day) === currentDay;
          const isDayAgnostic = day === '*';
          
          // Calculate confidence based on frequency and match type
          let confidence = 0;
          if (isExactDay) {
            confidence = Math.min(0.95, 0.4 + (count * 0.15)); // Exact day match: higher base
          } else if (isDayAgnostic) {
            confidence = Math.min(0.85, 0.2 + (count * 0.08)); // Any day: lower base
          } else {
            confidence = Math.min(0.6, 0.1 + (count * 0.05));  // Different day: lowest
          }

          // Reduce confidence for further-out predictions
          confidence *= (1 - hourOffset * 0.15);
          
          predictions.push({
            screen,
            hour: targetHour,
            dayOfWeek: currentDay,
            confidence: Math.round(confidence * 100) / 100,
            reason: this._generateReason(screen, targetHour, currentDay, count, isExactDay),
            hourOffset
          });
        }
      });
    }

    // Deduplicate by screen, keep highest confidence
    const deduped = {};
    predictions.forEach(p => {
      if (!deduped[p.screen] || deduped[p.screen].confidence < p.confidence) {
        deduped[p.screen] = p;
      }
    });

    // Sort by confidence descending
    const result = Object.values(deduped)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 predictions

    this.lastAnalysis = {
      timestamp: Date.now(),
      currentHour,
      currentDay,
      predictions: result,
      totalPatterns: Object.keys(this.patterns).length,
      totalLogs: this.rawLogs.length
    };

    console.log(`[AI Engine] Generated ${result.length} predictions for hour=${currentHour}, day=${currentDay}`);
    return result;
  }

  /**
   * Generate human-readable reason for prediction
   */
  _generateReason(screen, hour, day, count, exactDay) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const screenNames = {
      'news_feed': 'News Feed',
      'chat': 'Chat',
      'feed': 'Feed',
      'settings': 'Settings'
    };
    const displayScreen = screenNames[screen] || screen;
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    if (exactDay) {
      return `User opens ${displayScreen} at ${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'} on ${dayNames[day]}s (${count} times observed)`;
    }
    return `User frequently opens ${displayScreen} in the ${period} (${count} times across all days)`;
  }

  /**
   * Map predictions to actual content to prefetch
   */
  getContentToPrefetch(predictions) {
    const contentMap = {
      'news_feed': [
        { id: 'feed-001', type: 'article', title: 'India\'s 5G Rollout Reaches 500 Cities', size: '45KB' },
        { id: 'feed-002', type: 'article', title: 'How Jio and Airtel Are Tackling Dead Zones', size: '38KB' },
        { id: 'feed-003', type: 'article', title: 'WhatsApp Tests Offline Messaging', size: '52KB' }
      ],
      'chat': [
        { id: 'chat-history', type: 'messages', title: 'Recent chat messages', size: '12KB' },
        { id: 'chat-media', type: 'thumbnails', title: 'Chat media thumbnails', size: '120KB' }
      ]
    };

    const content = [];
    predictions.forEach(pred => {
      const items = contentMap[pred.screen] || [];
      items.forEach(item => {
        content.push({
          ...item,
          predictedFor: pred.screen,
          confidence: pred.confidence,
          reason: pred.reason
        });
      });
    });

    return content;
  }

  /**
   * Get analysis summary (for demo/debugging)
   */
  getSummary() {
    return {
      totalLogs: this.rawLogs.length,
      totalPatterns: Object.keys(this.patterns).length,
      topPatterns: Object.entries(this.patterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => ({ pattern: key, count })),
      lastAnalysis: this.lastAnalysis
    };
  }

  /**
   * Reset all data
   */
  reset() {
    this.patterns = {};
    this.rawLogs = [];
    this.lastAnalysis = null;
    console.log('[AI Engine] Reset complete');
  }
}

module.exports = AIEngine;
