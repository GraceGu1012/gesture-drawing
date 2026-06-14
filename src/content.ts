// Content script: extracts logged-in user from ERP page and stores in chrome.storage

interface ErpUser {
  name: string;
  role: string;
  group: string;
  department: string;
  team: string;
}

const ERP_API_USER = "/Api/api-user/users/getUser";

/**
 * 从 ERP 页面提取当前登录用户信息。
 *
 * 提取策略（按优先级依次尝试）：
 *   0. 调用竹亭 API（/Api/api-user/users/getUser）获取完整用户信息
 *   1. localStorage 中查找常见用户键
 *   2. sessionStorage 中查找
 *   3. DOM 中查找右上角用户信息元素
 */

/* ── Strategy 0: API ── */
async function extractFromApi(): Promise<ErpUser | null> {
  try {
    const res = await fetch(ERP_API_USER, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    // 竹亭 API 响应格式可能为 { code: 0, data: { ... } } 或直接返回对象
    const data = json.data || json;
    if (data && typeof data === "object") {
      const user = normalizeUser(data as Record<string, unknown>);
      if (user) return user;
    }
  } catch {
    // API 不可用时降级
  }
  return null;
}

/* ── Strategy 1+2: localStorage / sessionStorage ── */
function extractFromStorage(storage: Storage): ErpUser | null {
  const keys = ["user", "userInfo", "currentUser", "loginUser", "userData"];
  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          const user = normalizeUser(data);
          if (user) return user;
        }
      }
    } catch { /* continue */ }
  }
  return null;
}

/* ── Strategy 3: DOM ── */
function extractFromDom(): ErpUser | null {
  // 优先匹配右上角常见用户信息元素
  const selectors = [
    ".user-info", ".user-name", ".avatar-name", ".header-user",
    "[data-user]", ".current-user", ".login-user",
    ".header-right .name", ".top-bar .username",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text) {
      const user = normalizeUser({ name: text });
      if (user) return user;
    }
  }
  return null;
}

/* ── 字段映射 ── */
function normalizeUser(data: Record<string, unknown>): ErpUser | null {
  const name = String(
    data.name || data.userName || data.username || data.realName ||
    data.nickname || data.account || data.displayName || ""
  ).trim();

  if (!name) return null;

  let role = String(data.role || data.roleName || data.roleCode || "seller").trim();
  if (role.includes("管理员") || role === "admin" || role === "superadmin") role = "admin";
  else if (role.includes("部门") || role.includes("主管")) role = "dept_head";
  else if (role.includes("组长")) role = "team_lead";
  else if (role.includes("销售") || role.includes("运营")) role = "seller";

  const group = String(data.group || data.groupName || data.集团 || "").trim();
  const department = String(data.department || data.dept || data.deptName || data.部门 || "").trim();
  const team = String(data.team || data.teamName || data.小组 || "").trim();

  return { name, role, group, department, team };
}

/* ── 统一提取入口 ── */
async function extractAndStore() {
  // 策略 0：API
  let user = await extractFromApi();

  // 策略 1：localStorage
  if (!user) user = extractFromStorage(localStorage);

  // 策略 2：sessionStorage
  if (!user) user = extractFromStorage(sessionStorage);

  // 策略 3：DOM
  if (!user) user = extractFromDom();

  if (user) {
    chrome.storage.local.set({ erpUser: user }, () => {
      console.log("[TikTok看板] 已提取用户:", user);
    });
  } else {
    console.warn("[TikTok看板] 未能提取用户信息");
  }
}

extractAndStore();

// 响应侧边面板的消息请求
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if ((msg as { type?: string }).type === "GET_ERP_USER") {
    (async () => {
      let user = await extractFromApi();
      if (!user) user = extractFromStorage(localStorage);
      if (!user) user = extractFromStorage(sessionStorage);
      if (!user) user = extractFromDom();
      sendResponse(user);
    })();
    return true; // 保持消息通道开启等待异步响应
  }
  return true;
});
