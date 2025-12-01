// 使用 chrome.storage.session 存储已打开侧边栏的标签页 ID
const STORAGE_KEY = 'openedPanelTabs';

// 防抖：存储每个标签页的延迟启用定时器
const pendingEnableTimers = new Map<number, ReturnType<typeof setTimeout>>();

// 获取已打开侧边栏的标签页列表
const getOpenedTabs = async (): Promise<number[]> => {
  const result = await chrome.storage.session.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
};

// 添加标签页到已打开列表
const addOpenedTab = async (tabId: number): Promise<void> => {
  const tabs = await getOpenedTabs();
  if (!tabs.includes(tabId)) {
    tabs.push(tabId);
    await chrome.storage.session.set({ [STORAGE_KEY]: tabs });
  }
};

// 从已打开列表移除标签页
const removeOpenedTab = async (tabId: number): Promise<void> => {
  const tabs = await getOpenedTabs();
  const index = tabs.indexOf(tabId);
  if (index > -1) {
    tabs.splice(index, 1);
    await chrome.storage.session.set({ [STORAGE_KEY]: tabs });
  }
};

// 检查标签页是否已打开侧边栏
const isTabOpened = async (tabId: number): Promise<boolean> => {
  const tabs = await getOpenedTabs();
  return tabs.includes(tabId);
};

// 检查是否是支持的网站（Twitter/X）
const isSupportedSite = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.hostname === 'twitter.com' || 
           url.hostname === 'x.com' || 
           url.hostname.endsWith('.twitter.com') || 
           url.hostname.endsWith('.x.com');
  } catch {
    return false;
  }
};

// 清除标签页的待处理定时器
const clearPendingTimer = (tabId: number) => {
  const timer = pendingEnableTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    pendingEnableTimers.delete(tabId);
  }
};

// 初始化：设置点击行为为自动打开（让 Chrome 处理，避免 user gesture 问题）
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// 监听来自侧边栏的消息
chrome.runtime.onMessage.addListener((message, _sender) => {
  if (message.type === 'SIDEPANEL_OPENED') {
    // 侧边栏打开时，获取当前活动标签页并记录
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        addOpenedTab(tabs[0].id);
      }
    });
  }
  // 返回 false 或不返回，表示不需要异步响应
});

// 监听标签页激活（切换标签页）
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  
  // 清除之前的待处理定时器
  clearPendingTimer(tabId);
  
  try {
    const tab = await chrome.tabs.get(tabId);
    
    // 如果无法获取 URL（如 chrome:// 页面），视为非支持页面，禁用侧边栏
    if (!tab.url) {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
      return;
    }
    
    const isSupported = isSupportedSite(tab.url);
    const isOpened = await isTabOpened(tabId);
    
    if (isSupported && isOpened) {
      // 已打开过侧边栏的 Twitter 标签页：直接启用，侧边栏显示
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'src/sidepanel.html',
        enabled: true
      });
    } else if (isSupported) {
      // 未打开过侧边栏的 Twitter 标签页：
      // 1. 先禁用（隐藏可能正在显示的侧边栏）
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
      
      // 2. 延迟后启用（允许用户点击打开，但不会自动显示侧边栏）
      const timer = setTimeout(async () => {
        pendingEnableTimers.delete(tabId);
        try {
          await chrome.sidePanel.setOptions({
            tabId,
            path: 'src/sidepanel.html',
            enabled: true
          });
        } catch (e) {
          // 标签页可能已关闭，忽略错误
        }
      }, 150);
      
      pendingEnableTimers.set(tabId, timer);
    } else {
      // 非 Twitter 标签页：禁用侧边栏
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    }
  } catch (e) {
    // 获取标签页信息失败时，也尝试禁用侧边栏
    try {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    } catch {
      // 忽略错误
    }
    console.warn('Failed to handle tab activation:', e);
  }
});

// 监听标签页关闭，清理记录和定时器
chrome.tabs.onRemoved.addListener((tabId) => {
  clearPendingTimer(tabId);
  removeOpenedTab(tabId);
});

// 监听 URL 更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 当页面加载完成时
  if (changeInfo.status === 'complete' && tab.url) {
    const isSupported = isSupportedSite(tab.url);
    const isOpened = await isTabOpened(tabId);
    
    if (isSupported && isOpened) {
      // 已打开过的 Twitter 标签页，保持启用
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'src/sidepanel.html',
        enabled: true
      });
    } else if (isSupported) {
      // 未打开过的 Twitter 标签页，启用（允许用户点击打开）
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'src/sidepanel.html',
        enabled: true
      });
    } else {
      // 非 Twitter 标签页，禁用并清理记录
      if (isOpened) {
        await removeOpenedTab(tabId);
      }
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    }
  }
});
