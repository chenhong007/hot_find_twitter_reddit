import { Tweet, ScraperMessage } from './types';

let isScraping = false;
let scrollInterval: number | null = null;
// Store tweets with a limit to prevent memory leaks, but allow data persistence for UI re-opening
let scrapedTweets = new Map<string, Tweet>();
const MAX_STORED_TWEETS = 3000;
let retryCount = 0;
const MAX_RETRIES = 3;

// Helper to parse numbers like "1.2K", "1M", "1.2万", "1.2亿"
const parseNumber = (text: string): number => {
  if (!text) return 0;
  const cleanText = text.trim().toUpperCase().replace(/,/g, '');
  
  if (cleanText.includes('K')) {
    return parseFloat(cleanText.replace('K', '')) * 1000;
  }
  if (cleanText.includes('M')) {
    return parseFloat(cleanText.replace('M', '')) * 1000000;
  }
  if (cleanText.includes('B')) {
    return parseFloat(cleanText.replace('B', '')) * 1000000000;
  }
  if (cleanText.includes('万')) {
    return parseFloat(cleanText.replace('万', '')) * 10000;
  }
  if (cleanText.includes('亿')) {
    return parseFloat(cleanText.replace('亿', '')) * 100000000;
  }
  
  const num = parseFloat(cleanText);
  return isNaN(num) ? 0 : num;
};

const extractTweetFromArticle = (article: HTMLElement): Tweet | null => {
  try {
    // 1. Author Info
    const userEl = article.querySelector('div[data-testid="User-Name"]');
    if (!userEl) {
      // 优化：移除递归重试，避免闭包导致的 DOM 内存泄漏
      // 如果当前未加载完成，等待下一次轮询即可
      return null;
    }
    
    const anchorElements = userEl.querySelectorAll('a');
    const name = userEl.querySelector('span')?.innerText || 'Unknown';
    // Handle usually starts with @ and is in the second span or link
    const handle = anchorElements[0]?.getAttribute('href')?.replace('/', '@') || '';

    // 2. Timestamp & URL
    const timeEl = article.querySelector('time');
    const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString();
    const relativeUrl = timeEl?.closest('a')?.getAttribute('href');
    const url = relativeUrl ? `https://twitter.com${relativeUrl}` : '';
    
    if (!url) return null;

    // 3. Content
    const contentEl = article.querySelector('div[data-testid="tweetText"]');
    const content = contentEl?.textContent || '';

    // 4. Metrics - Optimized with parallel extraction
    const group = article.querySelector('div[role="group"]');
    
    const getMetricValue = (testId: string): number => {
      try {
        const el = group?.querySelector(`[data-testid="${testId}"]`);
        if (!el) return 0;
        const label = el.getAttribute('aria-label') || '';
        // Try to find the visible number first
        const textEl = el.querySelector('[data-testid="app-text-transition-container"]');
        if (textEl) {
          return parseNumber(textEl.textContent || '');
        }
        // Fallback to parsing aria-label (e.g., "135 likes")
        const match = label.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB万亿]?)/i);
        return match ? parseNumber(match[0]) : 0;
      } catch {
        return 0;
      }
    };

    const replies = getMetricValue('reply');
    const reposts = getMetricValue('retweet');
    const likes = getMetricValue('like');
    
    // Views are tricky, sometimes separate from the group or have different label
    let views = 0;
    try {
      const analyticsLink = article.querySelector('a[href*="/analytics"]');
      if (analyticsLink) {
         // Often contains a span with the number
         const textEl = analyticsLink.querySelector('[data-testid="app-text-transition-container"]');
         if (textEl) {
           views = parseNumber(textEl.textContent || '');
         } else {
           // Fallback: try to parse the text content of the link
           const text = analyticsLink.textContent || '';
           const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB万亿]?)/i);
           if (match) views = parseNumber(match[0]);
         }
      }
    } catch {
      views = 0;
    }

    return {
      id: url, // Use URL as ID
      url,
      author: { name, handle },
      content,
      timestamp,
      metrics: { replies, reposts, likes, views: views || null },
      scrapedAt: Date.now()
    };
  } catch (e) {
    // 优化：移除重试逻辑
    return null;
  }
};

const scrape = () => {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  const newTweets: Tweet[] = [];
  
  // 批量处理，抓取新数据
  articles.forEach(article => {
    // 优化：预先提取 ID (URL)，如果已存在则跳过昂贵的 DOM 解析
    const timeEl = article.querySelector('time');
    const relativeUrl = timeEl?.closest('a')?.getAttribute('href');
    const tempId = relativeUrl ? `https://twitter.com${relativeUrl}` : '';
    
    if (tempId && scrapedTweets.has(tempId)) {
      return;
    }

    const tweet = extractTweetFromArticle(article as HTMLElement);
    if (tweet && !scrapedTweets.has(tweet.id)) {
      scrapedTweets.set(tweet.id, tweet);
      newTweets.push(tweet);
    }
  });

  // Memory cleanup: Prevent Map from growing indefinitely
  if (scrapedTweets.size > MAX_STORED_TWEETS) {
    const keysToDelete = Array.from(scrapedTweets.keys()).slice(0, scrapedTweets.size - MAX_STORED_TWEETS);
    keysToDelete.forEach(key => scrapedTweets.delete(key));
  }

  // 优化：仅发送新数据 (增量更新)，大幅减少 IPC 通信开销
  if (newTweets.length > 0) {
    chrome.runtime.sendMessage({
      type: 'SCRAPED_DATA',
      payload: newTweets
    }).catch(err => {
      console.warn('Failed to send scraped data:', err);
      // Retry logic for failed batch
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: 'SCRAPED_DATA',
            payload: newTweets
          }).then(() => {
            retryCount = 0; 
          });
        }, 1000);
      }
    });
  }
};

const startScraping = () => {
  if (isScraping) return;
  isScraping = true;
  retryCount = 0; // 重置重试计数器
  
  // Initial scrape
  scrape();

  // 优化：减少间隔时间，提高抓取速度
  scrollInterval = window.setInterval(() => {
    scrape();
    // 优化：更快的滚动，增加滚动距离
    const scrollAmount = Math.floor(Math.random() * 600) + 500;
    window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  }, 1000); // 从2秒减少到1秒，提高抓取速度
};

const stopScraping = () => {
  isScraping = false;
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
};

chrome.runtime.onMessage.addListener((message: ScraperMessage) => {
  if (message.type === 'START_SCRAPE') {
    startScraping();
  } else if (message.type === 'STOP_SCRAPE') {
    stopScraping();
  } else if (message.type === 'CLEAR_DATA') {
    scrapedTweets.clear();
  } else if (message.type === 'REQUEST_FULL_DATA') {
    // Send all currently stored tweets (for UI init)
    chrome.runtime.sendMessage({
      type: 'SCRAPED_DATA',
      payload: Array.from(scrapedTweets.values())
    }).catch(console.warn);
  }
});
