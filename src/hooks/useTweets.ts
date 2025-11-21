import { useState, useEffect, useCallback } from 'react';
import { Tweet } from '../types';

const MAX_TWEETS = 3000;

export const useTweets = () => {
  const [isScraping, setIsScraping] = useState(false);
  const [tweets, setTweets] = useState<Tweet[]>([]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'SCRAPED_DATA') {
        setTweets(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          message.payload.forEach((t: Tweet) => map.set(t.id, t));
          
          // Memory Safety: Limit total tweets
          if (map.size > MAX_TWEETS) {
            const entries = Array.from(map.entries());
            return entries.slice(-MAX_TWEETS).map(e => e[1]);
          }
          
          if (message.payload.length === 0 && prev.length > 0) {
              return prev;
          }
          
          return Array.from(map.values());
        });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);

    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
           await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_FULL_DATA' });
        }
      } catch (e) {
        // Content script might not be ready or not on Twitter
      }
    })();

    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const clearTweets = useCallback(async () => {
    if (confirm('确定要清空所有抓取的数据吗？')) {
      setTweets([]);
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_DATA' });
        }
      } catch (e) {
        console.warn('Failed to notify content script to clear data', e);
      }
    }
  }, []);

  const toggleScraping = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    if (isScraping) {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'STOP_SCRAPE' });
        } catch (e) { console.error(e); }
        setIsScraping(false);
    } else {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'START_SCRAPE' });
            setIsScraping(true);
        } catch (e) {
            alert('请先刷新推特页面！');
        }
    }
  };

  return {
    tweets,
    isScraping,
    clearTweets,
    toggleScraping
  };
};

