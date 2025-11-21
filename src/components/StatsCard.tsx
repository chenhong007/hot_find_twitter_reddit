import React from 'react';
import { ScraperStats } from '../types';

interface StatsCardProps {
  stats: ScraperStats;
}

export const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  // 格式化统计数字，保留4位有效数字
  const formatStatNumber = (num: number) => {
    if (num === 0) return '0';
    
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    
    return num.toString();
  };

  return (
    <div className="border border-gray-900 rounded bg-white mb-2 overflow-hidden mx-3">
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
  );
};

