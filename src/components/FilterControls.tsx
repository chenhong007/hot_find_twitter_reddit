import React from 'react';

interface FilterControlsProps {
  thresholds: {
    replies: number;
    reposts: number;
    likes: number;
    views: number;
  };
  setThresholds: (thresholds: {
    replies: number;
    reposts: number;
    likes: number;
    views: number;
  }) => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({ 
  thresholds, 
  setThresholds,
  searchKeyword,
  setSearchKeyword
}) => {
  return (
    <div className="px-3 mb-2">
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
        {/* 左侧：关键词搜索 */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">🔍</span>
          <div className="relative">
            <input 
              type="text" 
              placeholder="搜索内容/作者..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-32 border border-gray-300 rounded px-2 py-1 pr-6 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-xs"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                title="清除"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* 右侧：阈值过滤 */}
        <div className="flex items-center gap-3">
          <span className="text-gray-500">过滤:</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">评论≥</span>
            <input 
              type="number" 
              min="0"
              value={thresholds.replies}
              onChange={e => setThresholds({...thresholds, replies: Number(e.target.value)})}
              className="w-12 border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-center"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">转发≥</span>
            <input 
              type="number" 
              min="0"
              value={thresholds.reposts}
              onChange={e => setThresholds({...thresholds, reposts: Number(e.target.value)})}
              className="w-12 border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-center"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">点赞≥</span>
            <input 
              type="number" 
              min="0"
              value={thresholds.likes}
              onChange={e => setThresholds({...thresholds, likes: Number(e.target.value)})}
              className="w-12 border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-center"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">阅读≥</span>
            <input 
              type="number" 
              min="0"
              value={thresholds.views}
              onChange={e => setThresholds({...thresholds, views: Number(e.target.value)})}
              className="w-12 border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

