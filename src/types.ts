export interface Tweet {
  id: string;
  url: string;
  author: {
    name: string;
    handle: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  metrics: {
    replies: number;
    reposts: number;
    likes: number;
    views: number | null;
  };
  scrapedAt: number;
}

export interface ScraperStats {
  totalTweets: number;
  totalLikes: number;
  totalReposts: number;
  avgEngagementRate: number;
}

export type SortField = 'likes' | 'views' | 'reposts' | 'replies' | 'timestamp';
export type SortOrder = 'asc' | 'desc';

export interface ScraperMessage {
  type: 'START_SCRAPE' | 'STOP_SCRAPE' | 'SCRAPED_DATA' | 'CLEAR_DATA' | 'SCROLL_DOWN' | 'REQUEST_FULL_DATA';
  payload?: any;
}
