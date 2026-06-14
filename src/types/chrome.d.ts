/** 最小 chrome.* API 类型声明，供 tsc 检查使用。运行时由 Chrome 扩展环境提供。 */
interface ChromeStorageArea {
  get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void): void;
  set(items: Record<string, unknown>, callback?: () => void): void;
}

interface ChromeOnMessage {
  addListener(callback: (message: unknown, sender: { id?: string; url?: string }, sendResponse: (response?: unknown) => void) => void | boolean): void;
}

interface ChromeActionOnClicked {
  addListener(callback: () => void): void;
}

interface ChromeTabsQuery {
  query(queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: { windowId?: number; url?: string }[]) => void): void;
}

declare var chrome: {
  storage: { local: ChromeStorageArea };
  runtime: { onMessage: ChromeOnMessage };
  action: { onClicked: ChromeActionOnClicked };
  tabs: ChromeTabsQuery;
  sidePanel: { open(options: { windowId?: number; tabId?: number }): void };
};
