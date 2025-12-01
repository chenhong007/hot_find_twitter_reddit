import { PlatformScraper } from './types';
import { TwitterScraper } from './TwitterScraper';

export const createScraper = (hostname: string): PlatformScraper | null => {
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return new TwitterScraper();
  }
  return null;
};

export * from './types';

