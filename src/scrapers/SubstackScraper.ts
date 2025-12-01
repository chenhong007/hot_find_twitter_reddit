import { Tweet } from '../types';
import { parseNumber, parseDate } from '../utils';
import { PlatformScraper } from './types';
import { SELECTORS } from '../config/selectors';

export class SubstackScraper implements PlatformScraper {
  isApplicable(url: string): boolean {
    return url.includes('substack.com');
  }

  scrape(existingIds?: Set<string>): Tweet[] {
    const articles = this.findArticles();
    console.log(`[Substack Scraper] Found ${articles.length} potential articles`);
    
    const newTweets: Tweet[] = [];

    articles.forEach(article => {
      const tweet = this.extractSubstackFromArticle(article as HTMLElement);
      
      if (tweet) {
        if (existingIds && existingIds.has(tweet.id)) {
            return;
        }
        newTweets.push(tweet);
      } else {
        console.log('[Substack Scraper] Failed to extract tweet from', article);
      }
    });

    return newTweets;
  }

  private findArticles(): HTMLElement[] {
      const links = Array.from(document.querySelectorAll(SELECTORS.SUBSTACK.LINK_P));
      const uniqueContainers = new Set<HTMLElement>();
      
      links.forEach(link => {
          // 向上找几层，找到一个看起来像卡片的容器
          // Using selectors from config
          let container = null;
          for (const selector of SELECTORS.SUBSTACK.CONTAINER_PARENTS) {
              const found = link.closest(selector);
              if (found) {
                  container = found;
                  break;
              }
          }
                          
          if (!container) {
             let parent = link.parentElement;
             let depth = 0;
             while (parent && depth < 5) {
                 if (parent.tagName === 'DIV' && (
                     parent.querySelector(SELECTORS.SUBSTACK.PARENT_CHECK.TIME) || 
                     parent.querySelector(SELECTORS.SUBSTACK.PARENT_CHECK.PROFILE) ||
                     parent.className.includes(SELECTORS.SUBSTACK.PARENT_CHECK.CLASS_CARD) ||
                     parent.className.includes(SELECTORS.SUBSTACK.PARENT_CHECK.CLASS_POST)
                 )) {
                     container = parent;
                     break;
                 }
                 parent = parent.parentElement;
                 depth++;
             }
          }
          
          if (container) {
              uniqueContainers.add(container as HTMLElement);
          }
      });
      
      return Array.from(uniqueContainers);
  }

  private extractSubstackFromArticle(article: HTMLElement): Tweet | null {
    try {
      // 1. Link & ID
      let linkEl = article.querySelector(SELECTORS.SUBSTACK.LINK_P);
      if (!linkEl) {
          linkEl = article.querySelector(SELECTORS.SUBSTACK.POST_PREVIEW_TITLE) ||
                   article.querySelector(SELECTORS.SUBSTACK.READER_POST_CARD_TITLE);
      }
      
      let url = linkEl?.getAttribute('href') || '';
      
      if (!url) return null;
  
      // Normalize URL
      if (url.startsWith('/')) {
         url = new URL(url, window.location.href).href;
      }
  
      // 2. Author
      let authorEl = null;
      for (const selector of SELECTORS.SUBSTACK.AUTHOR) {
          authorEl = article.querySelector(selector);
          if (authorEl) break;
      }
  
      const name = (authorEl?.textContent?.trim() || 'Unknown').slice(0, 100);
  
      // 3. Timestamp
      let timeEl = null;
      for (const selector of SELECTORS.SUBSTACK.TIME) {
          timeEl = article.querySelector(selector);
          if (timeEl) break;
      }
      
      let timestamp = new Date().toISOString();
      if (timeEl) {
          if (timeEl.tagName === 'TIME') {
              timestamp = timeEl.getAttribute('datetime') || timestamp;
          } else {
               const timeText = timeEl.textContent?.trim();
               if (timeText) {
                   timestamp = parseDate(timeText);
               }
          }
      }
  
      // 4. Content (Snippet)
      let contentEl = null;
      for (const selector of SELECTORS.SUBSTACK.CONTENT) {
          contentEl = article.querySelector(selector);
          if (contentEl) break;
      }
      
      let content = contentEl?.textContent?.trim() || '';

      // Fallback for content: Find the longest paragraph that is not meta
      if (!content) {
           const paragraphs = Array.from(article.querySelectorAll('p, div.body, div.description, div[class*="preview"]'));
           let maxLen = 0;
           paragraphs.forEach(p => {
               // Skip if it looks like meta info
               if (p.closest('.meta') || p.closest('time') || p.closest('.author') || p.closest('.footer')) return;
               const text = p.textContent?.trim() || '';
               if (text.length > maxLen && text.length > 20) { // Minimum 20 chars to be considered content
                   maxLen = text.length;
                   content = text;
               }
           });
      }

      if (content.length > 500) {
          content = content.slice(0, 500) + '...';
      }

      // 5. Metrics
      let likes = 0;
      let replies = 0;
      let reposts = 0;

      // Metrics Strategy:
      // 1. Find potential metric containers (usually footer)
      // 2. If not found, search the whole article for relevant icons/buttons
      
      // Helper to process an element that might contain a metric
      const processMetricElement = (el: Element) => {
          const text = el.textContent?.trim() || '';
          if (!text || !/\d/.test(text)) return; // Must have digits
          
          const num = parseNumber(text);
          const html = el.innerHTML.toLowerCase();
          const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
          const classNames = (el.className || '').toLowerCase();

          // Check for Likes
          if (label.includes('like') || classNames.includes('like') || html.includes('heart') || html.includes('like')) {
              likes = Math.max(likes, num);
          }
          // Check for Comments
          else if (label.includes('comment') || label.includes('reply') || classNames.includes('comment') || html.includes('message') || html.includes('comment')) {
              replies = Math.max(replies, num);
          }
          // Check for Reposts/Restacks
          else if (label.includes('restack') || classNames.includes('restack') || html.includes('repeat') || html.includes('restack')) {
              reposts = Math.max(reposts, num);
          }
      };

      // 1. Try defined containers
      let metricsFound = false;
      for (const selector of SELECTORS.SUBSTACK.METRICS_CONTAINER) {
          const container = article.querySelector(selector);
          if (container) {
              const items = container.querySelectorAll(SELECTORS.SUBSTACK.METRIC_ITEMS);
              if (items.length > 0) {
                  items.forEach(processMetricElement);
                  if (likes > 0 || replies > 0 || reposts > 0) metricsFound = true;
              }
              
              // Fallback inside container: look for ANY text node near an SVG
              if (!metricsFound) {
                  const svgs = container.querySelectorAll('svg');
                  svgs.forEach(svg => {
                      // Check parent text or sibling text
                      const parentText = svg.parentElement?.textContent?.trim();
                      if (parentText && /\d/.test(parentText)) {
                          // Create a mock element to reuse processMetricElement logic, or just infer from SVG
                          const svgHtml = svg.outerHTML.toLowerCase();
                          const num = parseNumber(parentText);
                          
                          if (svgHtml.includes('heart') || svgHtml.includes('like')) likes = Math.max(likes, num);
                          else if (svgHtml.includes('message') || svgHtml.includes('comment')) replies = Math.max(replies, num);
                          else if (svgHtml.includes('repeat') || svgHtml.includes('restack')) reposts = Math.max(reposts, num);
                      }
                  });
              }
          }
          if (metricsFound) break;
      }

      // 2. Global fallback if no metrics found in containers
      if (likes === 0 && replies === 0 && reposts === 0) {
           const allButtons = article.querySelectorAll('a, button, div[role="button"], span[class*="pencraft"]');
           allButtons.forEach(processMetricElement);
      }

  
      return {
        source: 'substack',
        id: url,
        url,
        author: { name, handle: '' },
        content,
        timestamp,
        metrics: { replies, reposts, likes, views: null },
        scrapedAt: Date.now()
      };
  
    } catch (e) {
      return null;
    }
  }
}
