import time
from typing import List, Dict, Any

class AIEngine:
    def __init__(self):
        # Store behavior patterns: { "screen:hour:dayOfWeek": count }
        self.patterns: Dict[str, int] = {}
        self.raw_logs: List[Dict[str, Any]] = []
        self.last_analysis = None

    def ingest_logs(self, logs: List[Dict[str, Any]]):
        self.raw_logs.extend(logs)
        
        for log in logs:
            screen = log.get('screen')
            hour = log.get('hour')
            day_of_week = log.get('dayOfWeek')
            
            key = f"{screen}:{hour}:{day_of_week}"
            self.patterns[key] = self.patterns.get(key, 0) + 1
            
            # Also track screen-hour patterns (day-agnostic)
            hour_key = f"{screen}:{hour}:*"
            self.patterns[hour_key] = self.patterns.get(hour_key, 0) + 1

    def predict(self, current_hour: int, current_day: int) -> List[Dict[str, Any]]:
        predictions = []
        
        for hour_offset in range(3):
            target_hour = (current_hour + hour_offset) % 24
            
            for key, count in self.patterns.items():
                parts = key.split(':')
                if len(parts) != 3:
                    continue
                    
                screen, hour_str, day_str = parts
                
                # Check target hour matching
                if hour_str != '*' and int(hour_str) == target_hour:
                    is_exact_day = day_str != '*' and int(day_str) == current_day
                    is_day_agnostic = day_str == '*'
                    
                    confidence = 0.0
                    if is_exact_day:
                        confidence = min(0.95, 0.4 + (count * 0.15))
                    elif is_day_agnostic:
                        confidence = min(0.85, 0.2 + (count * 0.08))
                    else:
                        confidence = min(0.6, 0.1 + (count * 0.05))

                    confidence *= (1 - hour_offset * 0.15)
                    
                    predictions.append({
                        'screen': screen,
                        'hour': target_hour,
                        'dayOfWeek': current_day,
                        'confidence': round(confidence, 2),
                        'reason': self._generate_reason(screen, target_hour, current_day, count, is_exact_day),
                        'hourOffset': hour_offset
                    })

        # Deduplicate by screen, keep highest confidence
        deduped = {}
        for p in predictions:
            if p['screen'] not in deduped or deduped[p['screen']]['confidence'] < p['confidence']:
                deduped[p['screen']] = p

        # Sort by confidence descending
        result = sorted(deduped.values(), key=lambda x: x['confidence'], reverse=True)[:5]

        self.last_analysis = {
            'timestamp': time.time(),
            'currentHour': current_hour,
            'currentDay': current_day,
            'predictions': result,
            'totalPatterns': len(self.patterns),
            'totalLogs': len(self.raw_logs)
        }

        return result

    def _generate_reason(self, screen: str, hour: int, day: int, count: int, exact_day: bool) -> str:
        day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        screen_names = {
            'news_feed': 'News Feed',
            'chat': 'Chat',
            'feed': 'Feed',
            'settings': 'Settings'
        }
        display_screen = screen_names.get(screen, screen)
        period = 'morning' if hour < 12 else 'afternoon' if hour < 17 else 'evening'
        
        display_hour = hour - 12 if hour > 12 else (12 if hour == 0 else hour)
        am_pm = 'pm' if hour >= 12 else 'am'
        
        if exact_day:
            return f"User opens {display_screen} at {display_hour}{am_pm} on {day_names[day]}s ({count} times observed)"
        return f"User frequently opens {display_screen} in the {period} ({count} times across all days)"

    def get_content_to_prefetch(self, predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        content_map = {
            'news_feed': [
                { 'id': 'feed-001', 'type': 'article', 'title': 'India\'s 5G Rollout Reaches 500 Cities', 'size': '45KB' },
                { 'id': 'feed-002', 'type': 'article', 'title': 'How Jio and Airtel Are Tackling Dead Zones', 'size': '38KB' },
                { 'id': 'feed-003', 'type': 'article', 'title': 'WhatsApp Tests Offline Messaging', 'size': '52KB' }
            ],
            'chat': [
                { 'id': 'chat-history', 'type': 'messages', 'title': 'Recent chat messages', 'size': '12KB' },
                { 'id': 'chat-media', 'type': 'thumbnails', 'title': 'Chat media thumbnails', 'size': '120KB' }
            ]
        }

        content = []
        for pred in predictions:
            items = content_map.get(pred['screen'], [])
            for item in items:
                content.append({
                    **item,
                    'predictedFor': pred['screen'],
                    'confidence': pred['confidence'],
                    'reason': pred['reason']
                })

        return content

    def reset(self):
        self.patterns = {}
        self.raw_logs = []
        self.last_analysis = None

# Global instance for the backend
ai_engine = AIEngine()
