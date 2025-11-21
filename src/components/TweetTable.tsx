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
      className={`py-1.5 px-2 text-center border-r border-gray-400 relative group ${sortable ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''} flex-shrink-0 ${isSorted ? 'bg-gray-300' : ''}`}
      style={{ width }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="truncate flex items-center justify-center gap-1" title={onDoubleClick ? "双击复制整列内容" : undefined}>
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

  // 列宽状态
  const [colWidths, setColWidths] = useState({
    index: 50,
    source: 60,
    link: 80,
    author: 100,
    time: 90,
    content: 400,
    replies: 70,
    reposts: 70,
    likes: 70,
    views: 70
  });

  // 拖拽调整列宽的引用
  const resizingRef = useRef<{ column: keyof typeof colWidths; startX: number; startWidth: number } | null>(null);

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

  const startResize = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation(); // 防止触发排序
    resizingRef.current = {
      column: column as keyof typeof colWidths,
      startX: e.clientX,
      startWidth: colWidths[column as keyof typeof colWidths]
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
      <div style={style} className="flex hover:bg-gray-50 transition-colors border-b border-gray-300 text-xs">
        <div style={{ width: colWidths.index }} className="py-1.5 px-2 text-center border-r border-gray-300 font-medium truncate flex-shrink-0">
          {index + 1}
        </div>
        <div style={{ width: colWidths.source }} className="py-1.5 px-2 text-center border-r border-gray-300 font-medium truncate flex-shrink-0 capitalize">
          {tweet.source || 'twitter'}
        </div>
        <div style={{ width: colWidths.link }} className="py-1.5 px-2 text-center border-r border-gray-300 flex-shrink-0">
          <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium truncate block">
            查看
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

  const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  return (
      <div className="flex-1 overflow-hidden px-3 pb-2 flex flex-col">
        <div className="bg-white border border-gray-900 rounded overflow-hidden flex-1 flex flex-col">
          {/* Header */}
          <div className="flex bg-gray-200 text-gray-900 font-bold border-b border-gray-900 text-xs" style={{ width: totalWidth }}>
             <div style={{ width: colWidths.index }} className="py-1.5 px-2 text-center border-r border-gray-400 flex-shrink-0">#</div>
             <div style={{ width: colWidths.source }} className="py-1.5 px-2 text-center border-r border-gray-400 flex-shrink-0">来源</div>
             <div style={{ width: colWidths.link }} className="py-1.5 px-2 text-center border-r border-gray-400 flex-shrink-0">链接</div>
             <div style={{ width: colWidths.author }} className="py-1.5 px-2 text-center border-r border-gray-400 flex-shrink-0">作者</div>
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
                width={Math.max(totalWidth, bounds.width)}
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

