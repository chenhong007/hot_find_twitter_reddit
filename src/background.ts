
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

const setupSidePanel = async (tabId: number, urlString: string) => {
  try {
    const url = new URL(urlString);
    // 检查是否是 Twitter 或 X 或 Substack 域名
    const isTwitter = url.hostname === 'twitter.com' || 
                      url.hostname === 'x.com' || 
                      url.hostname.endsWith('.twitter.com') || 
                      url.hostname.endsWith('.x.com');
    
    const isSubstack = url.hostname === 'substack.com' || 
                       url.hostname.endsWith('.substack.com');

    if (isTwitter || isSubstack) {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'src/sidepanel.html',
        enabled: true
      });
    } else {
      // 在非 Twitter 页面禁用 SidePanel
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    }
  } catch (e) {
    // 对于非标准 URL (如 chrome://)，禁用 side panel
    try {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    } catch (err) {
      // Ignore errors for tabs that might have closed etc.
    }
  }
};

// 监听 URL 更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    setupSidePanel(tabId, changeInfo.url);
  } else if (changeInfo.status === 'complete' && tab.url) {
    setupSidePanel(tabId, tab.url);
  }
});

// 监听 Tab 切换
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      setupSidePanel(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    console.warn('Failed to get tab info on activation:', e);
  }
});

// 初始化时处理现有标签页
chrome.runtime.onInstalled.addListener(async () => {
  // 全局默认禁用，这样新标签页默认是禁用的，直到导航到 Twitter
  await chrome.sidePanel.setOptions({
    enabled: false
  });
  
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url) {
      setupSidePanel(tab.id, tab.url);
    }
  }
});
