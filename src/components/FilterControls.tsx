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
}

export const FilterControls: React.FC<FilterControlsProps> = ({ thresholds, setThresholds }) => {
  return (
    <div className="flex gap-4 mb-2 px-4 items-center text-xs">
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
  );
};

