import { Tweet } from '../types';
import { parseNumber } from '../utils';
import { PlatformScraper } from './types';
import { SELECTORS } from '../config/selectors';

export class TwitterScraper implements PlatformScraper {
  isApplicable(url: string): boolean {
    return url.includes('twitter.com') || url.includes('x.com');
  }

  scrape(existingIds?: Set<string>): Tweet[] {
    const articles = document.querySelectorAll(SELECTORS.TWITTER.ARTICLE);
    const newTweets: Tweet[] = [];

    articles.forEach(article => {
      const tweet = this.extractTweetFromArticle(article as HTMLElement);
      
      if (tweet) {
        if (existingIds && existingIds.has(tweet.id)) {
          return;
        }
        newTweets.push(tweet);
      }
    });

    return newTweets;
  }

  private extractTweetFromArticle(article: HTMLElement): Tweet | null {
    try {
      // 1. Author Info
      const userEl = article.querySelector(SELECTORS.TWITTER.USER_NAME);
      if (!userEl) {
        return null;
      }
      
      const anchorElements = userEl.querySelectorAll('a');
      const name = userEl.querySelector('span')?.innerText || 'Unknown';
      const handle = anchorElements[0]?.getAttribute('href')?.replace('/', '@') || '';

      // 2. Timestamp & URL
      const timeEl = article.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString();
      const relativeUrl = timeEl?.closest('a')?.getAttribute('href');
      const url = relativeUrl ? `https://twitter.com${relativeUrl}` : '';
      
      if (!url) return null;

      // 3. Content
      const contentEl = article.querySelector(SELECTORS.TWITTER.TWEET_TEXT);
      const content = contentEl?.textContent || '';

      // 4. Metrics
      const group = article.querySelector(SELECTORS.TWITTER.METRIC_GROUP);
      
      const getMetricValue = (testId: string): number => {
        try {
          const el = group?.querySelector(`${SELECTORS.TWITTER.METRIC_TEST_ID_PREFIX}${testId}"]`);
          if (!el) return 0;
          const label = el.getAttribute('aria-label') || '';
          const textEl = el.querySelector(SELECTORS.TWITTER.METRIC_TEXT_CONTAINER);
          if (textEl) {
            return parseNumber(textEl.textContent || '');
          }
          const match = label.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB万亿]?)/i);
          return match ? parseNumber(match[0]) : 0;
        } catch {
          return 0;
        }
      };

      const replies = getMetricValue('reply');
      const reposts = getMetricValue('retweet');
      const likes = getMetricValue('like');
      
      let views = 0;
      try {
        const analyticsLink = article.querySelector(SELECTORS.TWITTER.ANALYTICS_LINK);
        if (analyticsLink) {
           const textEl = analyticsLink.querySelector(SELECTORS.TWITTER.METRIC_TEXT_CONTAINER);
           if (textEl) {
             views = parseNumber(textEl.textContent || '');
           } else {
             const text = analyticsLink.textContent || '';
             const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB万亿]?)/i);
             if (match) views = parseNumber(match[0]);
           }
        }
      } catch {
        views = 0;
      }

      return {
        source: 'twitter',
        id: url,
        url,
        author: { name, handle },
        content,
        timestamp,
        metrics: { replies, reposts, likes, views: views || null },
        scrapedAt: Date.now()
      };
    } catch (e) {
      return null;
    }
  }
}
