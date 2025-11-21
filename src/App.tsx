import { useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Tweet, ScraperStats } from './types';
import { Header } from './components/Header';
import { StatsCard } from './components/StatsCard';
import { FilterControls } from './components/FilterControls';
import { TweetTable } from './components/TweetTable';
import { useTweets } from './hooks/useTweets';
import { useExport } from './hooks/useExport';
import { useTweetFilter } from './hooks/useTweetFilter';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-red-600 font-bold mb-2">插件发生错误</h2>
          <p className="text-xs text-gray-600 mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
          >
            刷新页面重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function Dashboard() {
  const { tweets, isScraping, clearTweets, toggleScraping } = useTweets();
  const { exportCsv, exportJson } = useExport();
  const { 
    sortField, 
    sortOrder,
    thresholds, 
    setThresholds, 
    sortedTweets, 
    handleSort 
  } = useTweetFilter(tweets);
  
  const [queryDate, setQueryDate] = useState(new Date().toISOString().split('T')[0]);
  const [notification, setNotification] = useState<{show: boolean, message: string} | null>(null);

  const stats: ScraperStats = useMemo(() => {
    const totalTweets = tweets.length;
    const totalLikes = tweets.reduce((sum, t) => sum + t.metrics.likes, 0);
    const totalReposts = tweets.reduce((sum, t) => sum + t.metrics.reposts, 0);
    const totalReplies = tweets.reduce((sum, t) => sum + t.metrics.replies, 0);
    const totalViews = tweets.reduce((sum, t) => sum + (t.metrics.views || 0), 0);
    const avgEngagementRate = totalViews > 0 
      ? ((totalLikes + totalReposts + totalReplies) / totalViews) * 100 
      : 0;
    return { totalTweets, totalLikes, totalReposts, avgEngagementRate };
  }, [tweets]);

  const handleCopyContent = async (tweetsToCopy: Tweet[]) => {
    if (tweetsToCopy.length === 0) return;
    const allContent = tweetsToCopy.map(t => t.content).join('\n--------------\n');
    try {
      await navigator.clipboard.writeText(allContent);
      setNotification({ show: true, message: `已复制 ${tweetsToCopy.length} 条内容` });
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setNotification({ show: true, message: '复制失败' });
      setTimeout(() => setNotification(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans relative">
      {notification && notification.show && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-md shadow-lg z-50 text-sm font-medium backdrop-blur-sm transition-all duration-300 animate-fade-in">
          {notification.message}
        </div>
      )}
      
      <Header 
        queryDate={queryDate}
        setQueryDate={setQueryDate}
        onExportCsv={() => exportCsv(tweets)}
        onExportJson={() => exportJson(tweets)}
        onClearData={clearTweets}
        toggleScraping={toggleScraping}
        isScraping={isScraping}
        tweetCount={tweets.length}
      />

      <StatsCard stats={stats} />

      <FilterControls 
        thresholds={thresholds}
        setThresholds={setThresholds}
      />

      <TweetTable 
        tweets={sortedTweets}
        isScraping={isScraping}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onCopyContent={() => handleCopyContent(sortedTweets)}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
