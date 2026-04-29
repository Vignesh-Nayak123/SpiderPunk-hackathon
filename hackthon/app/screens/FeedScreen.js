/**
 * FeedScreen — News/social feed with prefetch badges
 */
class FeedScreen {
  constructor(sdk, predictor) {
    this.sdk = sdk;
    this.predictor = predictor;
    this.listEl = document.getElementById('feed-list');
    this.items = [...SeedData.feedItems];
  }

  render() {
    this.listEl.innerHTML = '';
    this.items.forEach(item => {
      const card = FeedCard.render(item);
      this.listEl.appendChild(card);
    });

    // Log screen view
    if (this.predictor) this.predictor.log('news_feed');
  }

  getPrefetchedCount() {
    return this.items.filter(i => i.prefetched).length;
  }
}
