import { Tweet } from '../types';

export interface PlatformScraper {
  /**
   * Identifies if this scraper handles the current platform/article
   */
  isApplicable(url: string): boolean;

  /**
   * Scrapes the page/document for new tweets/posts.
   * @param existingIds Set of IDs already scraped to avoid duplicates during scraping (optional optimization)
   */
  scrape(existingIds?: Set<string>): Tweet[];
}
