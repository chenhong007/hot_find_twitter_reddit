import { useState, useMemo } from 'react';
import { Tweet, SortField, SortOrder } from '../types';

export const useTweetFilter = (tweets: Tweet[]) => {
  const [sortField, setSortField] = useState<SortField>('likes');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [thresholds, setThresholds] = useState({
    replies: 0,
    reposts: 0,
    likes: 0,
    views: 0
  });

  const sortedTweets = useMemo(() => {
    const filtered = tweets.filter(t => 
      t.metrics.replies >= thresholds.replies &&
      t.metrics.reposts >= thresholds.reposts &&
      t.metrics.likes >= thresholds.likes &&
      (t.metrics.views || 0) >= thresholds.views
    );

    return filtered.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case 'likes': 
          valA = a.metrics.likes; 
          valB = b.metrics.likes;
          break;
        case 'views': 
          valA = a.metrics.views || 0; 
          valB = b.metrics.views || 0;
          break;
        case 'reposts': 
          valA = a.metrics.reposts; 
          valB = b.metrics.reposts;
          break;
        case 'replies': 
          valA = a.metrics.replies; 
          valB = b.metrics.replies;
          break;
        case 'timestamp': 
          valA = new Date(a.timestamp).getTime(); 
          valB = new Date(b.timestamp).getTime();
          break;
      }

      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [tweets, sortField, sortOrder, thresholds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return {
    sortField,
    sortOrder,
    thresholds,
    setThresholds,
    sortedTweets,
    handleSort
  };
};

