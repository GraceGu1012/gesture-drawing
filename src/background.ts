/// <reference path="./types/chrome.d.ts" />

// 点击扩展图标 → 在当前窗口打开侧边面板
chrome.action.onClicked.addListener(() => {
  // 查询当前活动标签页以获取 windowId
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: { windowId?: number }[]) => {
    if (tabs.length > 0 && tabs[0].windowId !== undefined) {
      chrome.sidePanel.open({ windowId: tabs[0].windowId });
    }
  });
});
