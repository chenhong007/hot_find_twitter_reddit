import React, { useState, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import useMeasure from 'react-use-measure';
import { Tweet, SortField, SortOrder } from '../types';

interface TweetTableProps {
  tweets: Tweet[];
  isScraping: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onCopyContent: (tweets: Tweet[]) => void;
}

// 渲染可调整大小的表头单元格
const ResizableTh = ({ 
    id, 
    label, 
    width,
    sortable = false,
    isSorted = false,
    sortOrder,
    onClick,
    onDoubleClick,
    onResize
  }: { 
    id: string, 
    label: string, 
    width: number,
    sortable?: boolean,
    isSorted?: boolean,
    sortOrder?: SortOrder,
    onClick?: () => void,
    onDoubleClick?: () => void,
    onResize: (e: React.MouseEvent, id: string) => void
  }) => (
    <div 
      className={`py-1.5 px-1 text-center border-r border-gray-400 relative group ${sortable ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''} ${isSorted ? 'bg-gray-300' : ''}`}
      style={{ width, minWidth: width }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="truncate flex items-center justify-center gap-0.5" title={onDoubleClick ? "双击复制整列内容" : undefined}>
        {label}
        {isSorted && (
          <span className="text-[10px]">
            {sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => onResize(e, id)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

export const TweetTable: React.FC<TweetTableProps> = ({
  tweets,
  isScraping,
  sortField,
  sortOrder,
  onSort,
  onCopyContent
}) => {
  const [ref, bounds] = useMeasure();

  // 列宽比例状态 - 使用百分比自适应布局
  const [colRatios, setColRatios] = useState({
    index: 5,     // 5%
    source: 7,    // 7%
    link: 6,      // 6%
    author: 12,   // 12%
    time: 10,     // 10%
    content: 30,  // 30%
    replies: 7,   // 7%
    reposts: 7,   // 7%
    likes: 8,     // 8%
    views: 8      // 8%
  });
  
  // 计算实际列宽（基于容器宽度）
  const containerWidth = bounds.width || 600;
  const colWidths = {
    index: Math.floor(containerWidth * colRatios.index / 100),
    source: Math.floor(containerWidth * colRatios.source / 100),
    link: Math.floor(containerWidth * colRatios.link / 100),
    author: Math.floor(containerWidth * colRatios.author / 100),
    time: Math.floor(containerWidth * colRatios.time / 100),
    content: Math.floor(containerWidth * colRatios.content / 100),
    replies: Math.floor(containerWidth * colRatios.replies / 100),
    reposts: Math.floor(containerWidth * colRatios.reposts / 100),
    likes: Math.floor(containerWidth * colRatios.likes / 100),
    views: Math.floor(containerWidth * colRatios.views / 100)
  };

  // 拖拽调整列宽的引用
  const resizingRef = useRef<{ column: keyof typeof colRatios; startX: number; startRatio: number } | null>(null);

  // 列宽调整事件处理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current || !containerWidth) return;
      const { column, startX, startRatio } = resizingRef.current;
      const diff = e.clientX - startX;
      // Convert pixel diff to percentage diff
      const ratioDiff = (diff / containerWidth) * 100;
      setColRatios(prev => ({
        ...prev,
        [column]: Math.max(3, Math.min(50, startRatio + ratioDiff)) // 3%-50% range
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
  }, [containerWidth]);

  const startResize = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation(); // 防止触发排序
    resizingRef.current = {
      column: column as keyof typeof colRatios,
      startX: e.clientX,
      startRatio: colRatios[column as keyof typeof colRatios]
    };
    document.body.style.cursor = 'col-resize';
  };

  const formatNumber = (num: number | null | undefined, useShort: boolean = false) => {
    if (num === null || num === undefined) return '0';
    if (useShort) {
      if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 10000) return (num / 1000).toFixed(1) + 'K';
      return num.toLocaleString();
    }
    return num.toLocaleString();
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

  // Table Row Component for Virtual Scroll
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const tweet = tweets[index];
    return (
      <div style={style} className="flex hover:bg-gray-50 transition-colors border-b border-gray-300 text-xs w-full">
        <div style={{ width: colWidths.index, minWidth: colWidths.index }} className="py-1.5 px-1 text-center border-r border-gray-300 font-medium truncate">
          {index + 1}
        </div>
        <div style={{ width: colWidths.source, minWidth: colWidths.source }} className="py-1.5 px-1 text-center border-r border-gray-300 font-medium truncate capitalize">
          {tweet.source || 'twitter'}
        </div>
        <div style={{ width: colWidths.link, minWidth: colWidths.link }} className="py-1.5 px-1 text-center border-r border-gray-300">
          <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium truncate block">
            查看
          </a>
        </div>
        <div style={{ width: colWidths.author, minWidth: colWidths.author }} className="py-1.5 px-1 text-center border-r border-gray-300 font-medium truncate" title={tweet.author.name}>
          {tweet.author.name}
        </div>
        <div style={{ width: colWidths.time, minWidth: colWidths.time }} className="py-1.5 px-1 text-center border-r border-gray-300 truncate">
          {getRelativeTime(tweet.timestamp)}
        </div>
        <div style={{ width: colWidths.content, minWidth: colWidths.content }} className="py-1.5 px-1 border-r border-gray-300 overflow-hidden">
           <div className="line-clamp-2 break-all text-left" title={tweet.content}>
             {tweet.content}
           </div>
        </div>
        <div style={{ width: colWidths.replies, minWidth: colWidths.replies }} className="py-1.5 px-1 text-center border-r border-gray-300 font-medium truncate">
          {formatNumber(tweet.metrics.replies, true)}
        </div>
        <div style={{ width: colWidths.reposts, minWidth: colWidths.reposts }} className="py-1.5 px-1 text-center border-r border-gray-300 font-medium truncate">
          {formatNumber(tweet.metrics.reposts, true)}
        </div>
        <div style={{ width: colWidths.likes, minWidth: colWidths.likes }} className="py-1.5 px-1 text-center border-r border-gray-300 font-medium truncate">
          {formatNumber(tweet.metrics.likes, true)}
        </div>
        <div style={{ width: colWidths.views, minWidth: colWidths.views }} className="py-1.5 px-1 text-center font-medium truncate">
          {tweet.metrics.views ? formatNumber(tweet.metrics.views, true) : '-'}
        </div>
      </div>
    );
  };

  return (
      <div className="flex-1 overflow-hidden px-3 pb-2 flex flex-col">
        <div className="bg-white border border-gray-900 rounded overflow-hidden flex-1 flex flex-col">
          {/* Header */}
          <div className="flex bg-gray-200 text-gray-900 font-bold border-b border-gray-900 text-xs w-full">
             <div style={{ width: colWidths.index, minWidth: colWidths.index }} className="py-1.5 px-1 text-center border-r border-gray-400">#</div>
             <div style={{ width: colWidths.source, minWidth: colWidths.source }} className="py-1.5 px-1 text-center border-r border-gray-400">来源</div>
             <div style={{ width: colWidths.link, minWidth: colWidths.link }} className="py-1.5 px-1 text-center border-r border-gray-400">链接</div>
             <div style={{ width: colWidths.author, minWidth: colWidths.author }} className="py-1.5 px-1 text-center border-r border-gray-400">作者</div>
                <ResizableTh 
                  id="time" 
                  label="发布时间" 
                  width={colWidths.time} 
                  sortable 
                  isSorted={sortField === 'timestamp'}
                  sortOrder={sortOrder}
                  onClick={() => onSort('timestamp')} 
                  onResize={startResize} 
                />
             <ResizableTh id="content" label="内容" width={colWidths.content} onDoubleClick={() => onCopyContent(tweets)} onResize={startResize} />
                <ResizableTh 
                  id="replies" 
                  label="评论数" 
                  width={colWidths.replies} 
                  sortable 
                  isSorted={sortField === 'replies'}
                  sortOrder={sortOrder}
                  onClick={() => onSort('replies')} 
                  onResize={startResize} 
                />
                <ResizableTh 
                  id="reposts" 
                  label="转发数" 
                  width={colWidths.reposts} 
                  sortable 
                  isSorted={sortField === 'reposts'}
                  sortOrder={sortOrder}
                  onClick={() => onSort('reposts')} 
                  onResize={startResize} 
                />
                <ResizableTh 
                  id="likes" 
                  label="点赞数" 
                  width={colWidths.likes} 
                  sortable 
                  isSorted={sortField === 'likes'}
                  sortOrder={sortOrder}
                  onClick={() => onSort('likes')} 
                  onResize={startResize} 
                />
                <ResizableTh 
                  id="views" 
                  label="阅读数" 
                  width={colWidths.views} 
                  sortable 
                  isSorted={sortField === 'views'}
                  sortOrder={sortOrder}
                  onClick={() => onSort('views')} 
                  onResize={startResize} 
                />
          </div>

          {/* Body - Virtual Scroll */}
          <div ref={ref} className="flex-1 bg-white relative overflow-hidden">
              {tweets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    {isScraping ? '正在抓取数据中...' : '暂无数据，请点击右上角"刷新数据"'}
                </div>
              ) : (
              <List
                height={bounds.height} 
                itemCount={tweets.length}
                itemSize={44} // Approx row height
                width={bounds.width || 600}
                className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              >
                {Row}
              </List>
            )}
                       </div>
        </div>
      </div>
  );
};

