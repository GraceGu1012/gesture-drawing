// Content script: extracts logged-in user from ERP page and stores in chrome.storage

interface ErpUser {
  name: string;
  role: string;
  group: string;
  department: string;
  team: string;
}

/**
 * 从 ERP 页面提取当前登录用户信息。
 *
 * 提取策略（按优先级依次尝试）：
 *   1. localStorage 中查找常见用户键（user / userInfo / currentUser 等）
 *   2. sessionStorage 中查找
 *   3. DOM 中查找用户信息元素（.user-name / .avatar-name 等）
 *
 * 提取后用 normalizeUser 映射到 UserContext 结构。
 */
function extractUser(): ErpUser | null {
  // Strategy 1: check localStorage for common keys
  const storageKeys = ["user", "userInfo", "currentUser", "loginUser", "userData"];
  for (const key of storageKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          const user = normalizeUser(data);
          if (user) return user;
        }
      }
    } catch { /* continue */ }
  }

  // Strategy 2: check sessionStorage
  for (const key of storageKeys) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          const user = normalizeUser(data);
          if (user) return user;
        }
      }
    } catch { /* continue */ }
  }

  // Strategy 3: look for user info in DOM (common patterns in Chinese ERP)
  const selectors = [
    ".user-info", ".user-name", ".avatar-name", ".header-user",
    "[data-user]", ".current-user", ".login-user",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      const user = normalizeUser({ name: el.textContent.trim() });
      if (user) return user;
    }
  }

  return null;
}

function normalizeUser(data: Record<string, unknown>): ErpUser | null {
  // Try to map common field names to our UserContext structure
  const name = String(
    data.name || data.userName || data.username || data.realName ||
    data.nickname || data.account || ""
  ).trim();

  if (!name) return null;

  // Map role: try to find role field, default to "admin"
  let role = String(data.role || data.roleName || data.roleCode || "admin").trim();
  // Normalize common Chinese role names
  if (role.includes("管理员") || role === "admin" || role === "superadmin") role = "admin";
  else if (role.includes("部门") || role.includes("主管")) role = "dept_head";
  else if (role.includes("组长")) role = "team_lead";
  else if (role.includes("销售") || role.includes("运营")) role = "seller";

  const group = String(data.group || data.groupName || data.集团 || "").trim();
  const department = String(data.department || data.dept || data.deptName || data.部门 || "").trim();
  const team = String(data.team || data.teamName || data.小组 || "").trim();

  return { name, role, group, department, team };
}

// Extract and store
const user = extractUser();
if (user) {
  chrome.storage.local.set({ erpUser: user }, () => {
    console.log("[TikTok看板] 已提取用户:", user);
  });
} else {
  console.warn("[TikTok看板] 未能从页面提取用户信息，请检查 localStorage / sessionStorage 中的用户数据格式");
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_ERP_USER") {
    const u = extractUser();
    sendResponse(u);
  }
  return true;
});
