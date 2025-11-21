import React from 'react';

interface HeaderProps {
  queryDate: string;
  setQueryDate: (date: string) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onClearData: () => void;
  toggleScraping: () => void;
  isScraping: boolean;
  tweetCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  queryDate,
  setQueryDate,
  onExportCsv,
  onExportJson,
  onClearData,
  toggleScraping,
  isScraping,
  tweetCount
}) => {
  return (
    <div className="bg-white px-3 py-2">
      <div className="flex justify-between items-center mb-2 border-b border-black pb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">爆款内容</h1>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">v1.5.0</span>
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
                onClick={onExportCsv}
                className="flex items-center gap-1.5 px-3 py-1 rounded font-bold text-xs transition-all bg-blue-100 hover:bg-blue-200 text-blue-700"
                title="导出 CSV"
              >
                <span>📊</span>
                CSV
              </button>

              <button 
                onClick={onExportJson}
                className="flex items-center gap-1.5 px-3 py-1 rounded font-bold text-xs transition-all bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                title="导出 JSON"
              >
                <span>📝</span>
                JSON
              </button>

              <button 
                onClick={onClearData}
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
          <span className="text-green-600">（已抓取 {tweetCount} 条）</span>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded p-1.5 text-center text-blue-700 text-xs mb-2">
          正在查询 <span className="font-bold">昨天</span> 的爆文数据
        </div>
      )}
    </div>
  );
};

