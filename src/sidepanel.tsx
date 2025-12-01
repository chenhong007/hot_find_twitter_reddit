import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 通知 background 侧边栏已打开，记录当前标签页
chrome.runtime.sendMessage({ type: 'SIDEPANEL_OPENED' }).catch(() => {
  // 忽略错误（可能是 background 还未准备好）
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

