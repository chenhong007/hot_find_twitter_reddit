import { PlatformScraper } from './types';
import { TwitterScraper } from './TwitterScraper';
import { SubstackScraper } from './SubstackScraper';

export const createScraper = (hostname: string): PlatformScraper | null => {
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return new TwitterScraper();
  }
  if (hostname.includes('substack.com')) {
    return new SubstackScraper();
  }
  return null;
};

export * from './types';

