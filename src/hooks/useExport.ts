import { Tweet } from '../types';

export const useExport = () => {
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

  const exportCsv = (tweets: Tweet[]) => {
    if (tweets.length === 0) {
      alert('暂无数据可导出');
      return;
    }

    // BOM for Excel to display Chinese characters correctly
    const BOM = '\uFEFF';
    const headers = ['ID', '来源', 'URL', '作者名称', '作者账号', '发布时间', '内容', '回复数/留言数', '转发数', '点赞数', '阅读数'];
    
    const rows = tweets.map(t => {
      const escape = (text: string) => {
        if (!text) return '';
        return `"${text.replace(/"/g, '""')}"`;
      };

      return [
        escape(t.id),
        escape(t.source || 'twitter'),
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

  const exportJson = (tweets: Tweet[]) => {
    if (tweets.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    
    const jsonContent = JSON.stringify(tweets, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(jsonContent, `twitter-data-${dateStr}.json`, 'application/json');
  };

  return { exportCsv, exportJson };
};

