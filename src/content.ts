import { Tweet, ScraperMessage } from './types';
import { createScraper } from './scrapers';

let isScraping = false;
let scrollInterval: number | null = null;
let scrapedTweets = new Map<string, Tweet>();
const MAX_STORED_TWEETS = 3000;
let retryCount = 0;
const MAX_RETRIES = 3;

const scraper = createScraper(window.location.hostname);

const scrape = () => {
  if (!scraper) {
    console.warn('[Scraper] No suitable scraper found for this website');
    return;
  }

  // Pass a set of existing IDs to avoid re-processing if the scraper supports it
  // Optimization: The scraper implementation *can* check this set, 
  // but we also check it here before adding to our map.
  const existingIds = new Set(scrapedTweets.keys());
  
  const newTweetsFromScraper = scraper.scrape(existingIds);
  const newUniqueTweets: Tweet[] = [];

  newTweetsFromScraper.forEach(tweet => {
    if (!scrapedTweets.has(tweet.id)) {
      scrapedTweets.set(tweet.id, tweet);
      newUniqueTweets.push(tweet);
    }
  });

  if (scrapedTweets.size > MAX_STORED_TWEETS) {
    const keysToDelete = Array.from(scrapedTweets.keys()).slice(0, scrapedTweets.size - MAX_STORED_TWEETS);
    keysToDelete.forEach(key => scrapedTweets.delete(key));
  }

  // Only send if there are new tweets
  if (newUniqueTweets.length > 0) {
    const sendData = async () => {
      try {
        await chrome.runtime.sendMessage({
          type: 'SCRAPED_DATA',
          payload: newUniqueTweets
        });
        retryCount = 0;
      } catch (err: any) {
        const msg = err?.message || '';
        
        if (msg.includes('Extension context invalidated')) {
          console.log('Extension context invalidated. Stopping scraper.');
          stopScraping();
          return;
        }

        if (msg.includes('Could not establish connection') || 
            msg.includes('Receiving end does not exist')) {
          return;
        }

        console.warn('Failed to send scraped data:', err);
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          setTimeout(sendData, 1000);
        }
      }
    };
    
    sendData();
  }
};

const startScraping = () => {
  if (isScraping) return;
  isScraping = true;
  retryCount = 0;
  
  console.log(`[Scraper] Starting on ${window.location.hostname}`);

  scrape();

  scrollInterval = window.setInterval(() => {
    scrape();
    const scrollAmount = Math.floor(Math.random() * 400) + 800; 
    window.scrollBy({ top: scrollAmount, behavior: 'instant' });
  }, 600);
};

const stopScraping = () => {
  isScraping = false;
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
  console.log('[Scraper] Stopped');
};

chrome.runtime.onMessage.addListener((message: ScraperMessage) => {
  if (message.type === 'START_SCRAPE') {
    startScraping();
  } else if (message.type === 'STOP_SCRAPE') {
    stopScraping();
  } else if (message.type === 'CLEAR_DATA') {
    scrapedTweets.clear();
  } else if (message.type === 'REQUEST_FULL_DATA') {
    chrome.runtime.sendMessage({
      type: 'SCRAPED_DATA',
      payload: Array.from(scrapedTweets.values())
    }).catch(console.warn);
  }
});
