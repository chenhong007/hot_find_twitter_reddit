export const SELECTORS = {
  TWITTER: {
    ARTICLE: 'article[data-testid="tweet"]',
    USER_NAME: 'div[data-testid="User-Name"]',
    TWEET_TEXT: 'div[data-testid="tweetText"]',
    METRIC_GROUP: 'div[role="group"]',
    METRIC_TEST_ID_PREFIX: '[data-testid="',
    METRIC_TEXT_CONTAINER: '[data-testid="app-text-transition-container"]',
    ANALYTICS_LINK: 'a[href*="/analytics"]',
  },
  SUBSTACK: {
    LINK_P: 'a[href*="/p/"]',
    POST_PREVIEW_TITLE: 'a.post-preview-title',
    READER_POST_CARD_TITLE: 'a.reader-post-card-title',
    
    AUTHOR: [
      '.pencraft.pc-reset.link-LIBpto',
      '.post-preview-meta .profile-hover-card-target',
      '.byline a',
      '.post-header a.user-hover-card',
      '.reader-post-card-byline a',
      'a.reader-post-card-byline'
    ],
    
    TIME: [
      '.pencraft.pc-reset.color-secondary-ls1g8s',
      'time'
    ],
    
    CONTENT: [
      '.reader-post-card-subtitle',
      '.post-preview-description',
      '.post-preview-content',
      '.post-snippet',
      'div.reader-post-card-summary',
      '.portable-archive-post-description',
      '.description',
      '.body',
      '.post-body'
    ],
    
    METRICS_CONTAINER: [
      '.pencraft.pc-display-flex.pc-gap-8.pc-reset',
      '.post-preview-footer',
      '.post-meta',
      '.reader-post-card-footer',
      '.portable-archive-post-footer',
      'div[class*="footer"]',
      'div[class*="meta"]',
      'div[class*="actions"]'
    ],
    
    METRIC_ITEMS: 'div.pencraft, a, button, span.pencraft, div[class*="meta-item"], span, div',
    POTENTIAL_BUTTONS: 'a, button, div[role="button"]',
    
    CONTAINER_PARENTS: [
        '.reader-post-card',
        '.post-preview',
        '.portable-archive-post'
    ],
    
    PARENT_CHECK: {
        TIME: 'time',
        PROFILE: '.profile-hover-card-target',
        CLASS_CARD: 'card',
        CLASS_POST: 'post'
    }
  }
};
