import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import useMeasure from 'react-use-measure';
import { Tweet, ScraperStats, SortField, SortOrder } from './types';


const MAX_TWEETS = 3000;

function App() {
  const [isScraping, setIsScraping] = useState(false);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [sortField, setSortField] = useState<SortField>('likes');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [queryDate, setQueryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [notification, setNotification] = useState<{show: boolean, message: string} | null>(null);
  
  // 列宽状态
  const [colWidths, setColWidths] = useState({
    index: 50,
    link: 80,
    author: 100,
    time: 90,
    content: 400,
    replies: 70,
    reposts: 70,
    likes: 70,
    views: 70
  });

  // 过滤阈值状态
  const [thresholds, setThresholds] = useState({
    replies: 0,
    reposts: 0,
    likes: 0,
    views: 0
  });

  // 拖拽调整列宽的引用
  const resizingRef = useRef<{ column: keyof typeof colWidths; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'SCRAPED_DATA') {
        setTweets(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          message.payload.forEach((t: Tweet) => map.set(t.id, t));
          
          // Memory Safety: Limit total tweets
          if (map.size > MAX_TWEETS) {
            const entries = Array.from(map.entries());
            // Keep the most recently added ones (assuming insertion order)
            return entries.slice(-MAX_TWEETS).map(e => e[1]);
          }
          
          return Array.from(map.values());
        });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);

    // Request full data on mount (in case content script already has data)
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

  // 列宽调整事件处理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { column, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      setColWidths(prev => ({
        ...prev,
        [column]: Math.max(40, startWidth + diff) // 最小宽度 40px
      }));
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.cursor = 'default';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const [ref, bounds] = useMeasure();

  const startResize = (e: React.MouseEvent, column: keyof typeof colWidths) => {
    e.preventDefault();
    e.stopPropagation(); // 防止触发排序
    resizingRef.current = {
      column,
      startX: e.clientX,
      startWidth: colWidths[column]
    };
    document.body.style.cursor = 'col-resize';
  };

  const handleClearData = useCallback(async () => {
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

  // 导出功能工具函数
  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (tweets.length === 0) {
      alert('暂无数据可导出');
      return;
    }

    // BOM for Excel to display Chinese characters correctly
    const BOM = '\uFEFF';
    const headers = ['ID', 'URL', '作者名称', '作者账号', '发布时间', '内容', '回复数', '转发数', '点赞数', '阅读数'];
    
    const rows = tweets.map(t => {
      const escape = (text: string) => {
        if (!text) return '';
        // Replace double quotes with two double quotes and wrap in quotes
        return `"${text.replace(/"/g, '""')}"`;
      };

      return [
        escape(t.id),
        escape(t.url),
        escape(t.author.name),
        escape(t.author.handle),
        escape(t.timestamp),
        escape(t.content),
        t.metrics.replies,
        t.metrics.reposts,
        t.metrics.likes,
        t.metrics.views || 0
      ].join(',');
    });

    const csvContent = BOM + [headers.join(','), ...rows].join('\n');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `twitter-data-${dateStr}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJson = () => {
    if (tweets.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    
    const jsonContent = JSON.stringify(tweets, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(jsonContent, `twitter-data-${dateStr}.json`, 'application/json');
  };

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

  const handleCopyContent = async () => {
    if (sortedTweets.length === 0) return;
    const allContent = sortedTweets.map(t => t.content).join('\n--------------\n');
    try {
      await navigator.clipboard.writeText(allContent);
      setNotification({ show: true, message: `已复制 ${sortedTweets.length} 条内容` });
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setNotification({ show: true, message: '复制失败' });
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const sortedTweets = useMemo(() => {
    // Filter based on thresholds
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

  const formatNumber = (num: number, useShort: boolean = false) => {
    if (useShort) {
      if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 10000) return (num / 1000).toFixed(1) + 'K';
      return num.toLocaleString();
    }
    return num.toLocaleString();
  };

  // 格式化统计数字，保留4位有效数字
  const formatStatNumber = (num: number) => {
    if (num === 0) return '0';
    
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    
    return num.toString();
  };

  // 核心控制逻辑
  const toggleScraping = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // 如果当前是开启状态，我们要停止
    if (isScraping) {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'STOP_SCRAPE' });
        } catch (e) { console.error(e); }
        setIsScraping(false);
    } 
    // 如果当前是停止状态，我们要开启
    else {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'START_SCRAPE' });
            setIsScraping(true);
        } catch (e) {
            alert('请先刷新推特页面！');
        }
    }
  };


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    return `${diffDays}天前`;
  };

  // 渲染可调整大小的表头单元格
  const ResizableTh = ({ 
    id, 
    label, 
    sortable = false, 
    onClick,
    onDoubleClick
  }: { 
    id: keyof typeof colWidths, 
    label: string, 
    sortable?: boolean,
    onClick?: () => void,
    onDoubleClick?: () => void
  }) => (
    <div 
      className={`py-1.5 px-2 text-center border-r border-gray-400 relative group ${sortable ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''} flex-shrink-0`}
      style={{ width: colWidths[id] }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="truncate" title={onDoubleClick ? "双击复制整列内容" : undefined}>{label}</div>
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => startResize(e, id)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );


  // Table Row Component for Virtual Scroll
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const tweet = sortedTweets[index];
    return (
      <div style={style} className="flex hover:bg-gray-50 transition-colors border-b border-gray-300 text-xs">
        <div style={{ width: colWidths.index }} className="py-1.5 px-2 text-center border-r border-gray-300 font-medium truncate flex-shrink-0">
          {index + 1}
        </div>
        <div style={{ width: colWidths.link }} className="py-1.5 px-2 text-center border-r border-gray-300 flex-shrink-0">
          <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium truncate block">
            查看推文
          </a>
        </div>
        <div style={{ width: colWidths.author }} className="py-1.5 px-2 text-center border-r border-gray-300 font-medium truncate flex-shrink-0" title={tweet.author.name}>
          {tweet.author.name}
        </div>
        <div style={{ width: colWidths.time }} className="py-1.5 px-2 text-center border-r border-gray-300 truncate flex-shrink-0">
          {getRelativeTime(tweet.timestamp)}
        </div>
        <div style={{ width: colWidths.content }} className="py-1.5 px-2 border-r border-gray-300 flex-shrink-0">
           <div className="line-clamp-2 break-all" title={tweet.content}>
             {tweet.content}
           </div>
        </div>
        <div style={{ width: colWidths.replies }} className="py-1.5 px-2 text-center border-r border-gray-300 font-medium truncate flex-shrink-0">
          {formatNumber(tweet.metrics.replies, true)}
        </div>
        <div style={{ width: colWidths.reposts }} className="py-1.5 px-2 text-center border-r border-gray-300 font-medium truncate flex-shrink-0">
          {formatNumber(tweet.metrics.reposts, true)}
        </div>
        <div style={{ width: colWidths.likes }} className="py-1.5 px-2 text-center border-r border-gray-300 font-medium truncate flex-shrink-0">
          {formatNumber(tweet.metrics.likes, true)}
        </div>
        <div style={{ width: colWidths.views }} className="py-1.5 px-2 text-center font-medium truncate flex-shrink-0">
          {tweet.metrics.views ? formatNumber(tweet.metrics.views, true) : '-'}
        </div>
      </div>
    );
  };

  // Calculate total width
  const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans relative">
      {notification && notification.show && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-md shadow-lg z-50 text-sm font-medium backdrop-blur-sm transition-all duration-300 animate-fade-in">
          {notification.message}
        </div>
      )}
      {/* Dashboard Header Area */}
      <div className="bg-white px-3 py-2">
        <div className="flex justify-between items-center mb-2 border-b border-black pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">爆文列表</h1>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">v1.3.0</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-gray-700 text-xs">
                  <span className="font-medium">查询日期:</span>
                  <input 
                    type="date" 
                    value={queryDate}
                    onChange={(e) => setQueryDate(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <button 
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1 rounded font-bold text-xs transition-all bg-blue-100 hover:bg-blue-200 text-blue-700"
                  title="导出 CSV"
                >
                  <span>📊</span>
                  CSV
                </button>

                <button 
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-3 py-1 rounded font-bold text-xs transition-all bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                  title="导出 JSON"
                >
                  <span>📝</span>
                  JSON
                </button>

                <button 
                  onClick={handleClearData}
                  className="flex items-center gap-1.5 px-3 py-1 rounded font-bold text-xs transition-all bg-gray-200 hover:bg-gray-300 text-gray-700"
                  title="清空已抓取的数据"
                >
                  <span>🗑️</span>
                  清空
                </button>

                <button 
                  onClick={toggleScraping}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-bold text-xs transition-all ${
                    isScraping 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                      : 'bg-[#22c55e] hover:bg-green-600 text-white'
                  }`}
                >
                  {isScraping ? (
                    <>
                      <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      停止刷新
                    </>
                  ) : (
                    <>
                      <span>↻</span>
                      刷新数据
                    </>
                  )}
                </button>
            </div>
        </div>

        {isScraping ? (
          <div className="bg-green-50 border border-green-300 rounded p-1.5 text-center text-green-700 text-xs mb-2 flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="font-bold">正在实时抓取推文数据中...</span>
            <span className="text-green-600">（已抓取 {tweets.length} 条）</span>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded p-1.5 text-center text-blue-700 text-xs mb-2">
            正在查询 <span className="font-bold">昨天</span> 的爆文数据
          </div>
        )}

        {/* 统计卡片 - 横向排列 */}
        <div className="border border-gray-900 rounded bg-white mb-2 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-gray-900">
            <div className="p-2 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-[#1d9bf0] tracking-tight mb-0.5">
                {stats.totalTweets}
              </div>
              <div className="text-xs text-gray-600 font-medium">总推文数</div>
            </div>
            
            <div className="p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold text-[#1d9bf0] tracking-tight mb-0.5">
                {formatStatNumber(stats.totalLikes)}
              </div>
              <div className="text-xs text-gray-600 font-medium">总点赞数</div>
            </div>
            
            <div className="p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold text-[#1d9bf0] tracking-tight mb-0.5">
                {formatStatNumber(stats.totalReposts)}
              </div>
              <div className="text-xs text-gray-600 font-medium">总转发数</div>
            </div>
            
            <div className="p-2 flex flex-col items-center justify-center">
              <div className="text-xl font-bold text-[#1d9bf0] tracking-tight mb-0.5">
                {isNaN(stats.avgEngagementRate) ? 'NaN' : stats.avgEngagementRate.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-600 font-medium">平均互动率</div>
            </div>
          </div>
        </div>
      </div>

        {/* Filter Controls */}
        <div className="flex gap-4 mb-2 px-1 items-center text-xs">
           <span className="font-bold text-gray-700">最低阈值过滤:</span>
           <div className="flex items-center gap-1">
             <span>评论 &ge;</span>
             <input 
               type="number" 
               min="0"
               value={thresholds.replies}
               onChange={e => setThresholds({...thresholds, replies: Number(e.target.value)})}
               className="w-16 border border-gray-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
             />
           </div>
           <div className="flex items-center gap-1">
             <span>转发 &ge;</span>
             <input 
               type="number" 
               min="0"
               value={thresholds.reposts}
               onChange={e => setThresholds({...thresholds, reposts: Number(e.target.value)})}
               className="w-16 border border-gray-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
             />
           </div>
           <div className="flex items-center gap-1">
             <span>点赞 &ge;</span>
             <input 
               type="number" 
               min="0"
               value={thresholds.likes}
               onChange={e => setThresholds({...thresholds, likes: Number(e.target.value)})}
               className="w-16 border border-gray-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
             />
           </div>
           <div className="flex items-center gap-1">
             <span>阅读 &ge;</span>
             <input 
               type="number" 
               min="0"
               value={thresholds.views}
               onChange={e => setThresholds({...thresholds, views: Number(e.target.value)})}
               className="w-16 border border-gray-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
             />
           </div>
        </div>

      {/* Data Table Area */}
      <div className="flex-1 overflow-hidden px-3 pb-2 flex flex-col">
        <div className="bg-white border border-gray-900 rounded overflow-hidden flex-1 flex flex-col">
          {/* Header */}
          <div className="flex bg-gray-200 text-gray-900 font-bold border-b border-gray-900 text-xs" style={{ width: totalWidth }}>
             <div style={{ width: colWidths.index }} className="py-1.5 px-2 text-center border-r border-gray-400 flex-shrink-0">#</div>
             <div style={{ width: colWidths.link }} className="py-1.5 px-2 text-center border-r border-gray-400 flex-shrink-0">推文链接</div>
             <div style={{ width: colWidths.author }} className="py-1.5 px-2 text-center border-r border-gray-400 flex-shrink-0">作者</div>
                <ResizableTh id="time" label="发布时间" sortable onClick={() => handleSort('timestamp')} />
             <ResizableTh id="content" label="内容" onDoubleClick={handleCopyContent} />
                <ResizableTh id="replies" label="评论数" sortable onClick={() => handleSort('replies')} />
                <ResizableTh id="reposts" label="转发数" sortable onClick={() => handleSort('reposts')} />
                <ResizableTh id="likes" label="点赞数" sortable onClick={() => handleSort('likes')} />
                <ResizableTh id="views" label="阅读数" sortable onClick={() => handleSort('views')} />
          </div>

          {/* Body - Virtual Scroll */}
          <div ref={ref} className="flex-1 bg-white relative overflow-hidden">
              {sortedTweets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    {isScraping ? '正在抓取数据中...' : '暂无数据，请点击右上角"刷新数据"'}
                </div>
              ) : (
              <List
                height={bounds.height} 
                itemCount={sortedTweets.length}
                itemSize={44} // Approx row height
                width={Math.max(totalWidth, bounds.width)}
                className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              >
                {Row}
              </List>
            )}
                       </div>
        </div>
      </div>
    </div>
  );
}

export default App;
