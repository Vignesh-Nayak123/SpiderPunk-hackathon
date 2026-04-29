/**
 * FeedCard — Renders a news feed card
 */
class FeedCard {
  static render(item) {
    const div = document.createElement('div');
    div.className = 'feed-card';
    div.id = `feed-${item.id}`;

    const time = TimeUtils.formatRelative(item.timestamp);
    const prefetchTag = item.prefetched 
      ? `<span class="prefetch-tag">⚡ Pre-fetched at ${TimeUtils.formatTime(item.prefetchedAt)}</span>` 
      : '';

    div.innerHTML = `
      <div class="feed-card-header">
        <h3 class="feed-card-title">${item.title}</h3>
        ${prefetchTag}
      </div>
      <p class="feed-card-desc">${item.description}</p>
      <div class="feed-card-footer">
        <span class="feed-source">${item.source}</span>
        <span class="feed-category">${item.category}</span>
        <span class="feed-time">${time}</span>
      </div>
    `;
    return div;
  }
}
