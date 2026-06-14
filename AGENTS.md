# AGENTS.md — TikTok 店铺看板

## 项目概要

Chrome 扩展侧边面板，TikTok 多店铺运营数据看板。从 PostgreSQL 后端拉取店铺基础信息、考核表现、日订单，按四级组织架构做权限过滤，多币种 GMV 自动换算人民币，提供 KPI 概览、趋势图、风险预警和单店下钻。

## 技术栈

| 层 | 选型 |
|---|------|
| 框架 | React 18 + TypeScript (strict) |
| 构建 | Vite 6 + CRXJS v2（扩展打包）/ 纯 web 配置用于本地预览 |
| 样式 | Tailwind CSS 4 |
| 图表 | Recharts 2（LineChart, ResponsiveContainer） |
| 后端 | FastAPI + PostgreSQL（[server.py](server.py)） |
| 测试 | Vitest 3 + jsdom |

## 目录结构

```
src/
├── App.tsx                  # 入口：数据加载 → 角色过滤 → 筛选 → KPI → 路由
├── main.tsx                 # ReactDOM 挂载
├── content.ts               # ERP 页面 content script：提取登录用户到 chrome.storage
├── index.css                # Tailwind 入口
├── sidepanel.html           # 侧边面板 HTML
├── types/index.ts           # Shop / ShopPerformance / DailyOrder / KpiSnapshot / UserContext
├── lib/
│   ├── dataLoader.ts        # 数据源抽象：apiDataSource (PG) / jsonDataSource (本地兜底)
│   ├── permissions.ts       # 四级角色过滤：admin → dept_head → team_lead → seller
│   └── aggregator.ts        # parseGmv 多币种换算 + computeKpi + 格式化工具
├── pages/
│   ├── Overview.tsx         # 概览看板：KPI 卡片 → 趋势图 → 均单分布 → 排行 → 店铺大小 → 刊登 → 考核健康 → 风险预警
│   └── ShopDetail.tsx       # 单店详情：今日快照、趋势图、考核状态/明细、基础信息、运营配置
├── components/
│   ├── KpiCard.tsx          # KPI 卡片（带环比、hover tooltip）
│   ├── KpiTrend.tsx         # 核心指标趋势折线图（7d/30d，双指标双 Y 轴，FIFO 选择）
│   ├── ShopRanking.tsx      # GMV Top 10 店铺排行
│   ├── ShopListPanel.tsx    # 全屏店铺列表下钻面板
│   ├── ShopTrend.tsx        # 单店日订单趋势（GMV/订单/访客/转化率 四指标切换）
│   ├── FilterBar.tsx        # 集团 → 部门 → 小组 → 销售员 四级级联筛选
│   └── RoleSwitcher.tsx     # 角色切换（管理员预览不同视角）
├── data/                    # 本地 JSON 兜底数据（shops.json, performance.json）
└── __tests__/               # 单元测试
server.py                    # FastAPI 后端（5 个端点 + CORS）
API_CONTRACT.md              # API 契约
manifest.json                # Chrome Extension Manifest V3
vite.config.ts               # CRXJS 扩展构建配置
vite.web.config.ts           # 纯 Web 构建配置（本地预览用）
```

## 数据流

```
ERP 页面(content.ts)
    ↓ 提取用户 → chrome.storage.local
App.tsx
    ↓ userReady → loadAllData()
dataLoader.ts (apiDataSource)
    ↓ fetch → localhost:8000
PostgreSQL (FastAPI)
    ↓ shops / performance / daily_orders
App.tsx
    ↓ ① filterShops (角色) → ② FilterBar (级联筛选) → ③ timeRange 过滤
    ↓ computeKpi → KpiSnapshot
Overview / ShopDetail
```

## 权限模型

| 角色 | 可见范围 | 判定字段 |
|------|---------|---------|
| admin | 全部店铺 | — |
| dept_head | 所属部门 | `部门` |
| team_lead | 所属小组 | `小组` |
| seller | 名下店铺 | `销售员` |

注意：三张表的店铺字段名不同——shops 用 `店铺名称`、performance 用 `店铺名`、daily_orders 用 `店铺`。

## 多币种换算

`parseGmv()` 在 [aggregator.ts](src/lib/aggregator.ts) 中，支持：

| 货币 | 前缀格式 | 后缀格式 | 汇率 (→ RMB) |
|------|---------|---------|-------------|
| THB | ฿1,072.87 | — | 0.20 |
| MYR | RM455.51 | — | 1.55 |
| PHP | ₱1,682.58 | — | 0.13 |
| VND | ₫8,092 | 44.563₫（点号=千分位） | 0.00029 |

**重要**：[server.py](server.py) 中有一份相同的 `parse_gmv` 实现，修改时需双端同步。

## 本地开发

### 前提

- Node.js 18+ / Python 3.10+ / PostgreSQL（数据库 `tiktok_dashboard`）
- Chrome 浏览器

### 启动后端

```bash
pip install fastapi uvicorn psycopg2
python server.py          # → http://localhost:8000
```

### 前端预览（Web 模式）

Vite dev server 在沙箱中无法绑定端口，用构建 + Python HTTP server：

```bash
npx vite build --config vite.web.config.ts
cd dist && python3 -m http.server 5175
# → http://localhost:5175
```

### Chrome 扩展模式

```bash
npm run build              # → dist/
# Chrome → chrome://extensions → 加载已解压 → 选择 dist/
```

## 编码约定

- 字段名与 Excel 导出表头严格一致，使用中文字段名（TypeScript interface 不做映射）
- 所有统计卡片支持点击下钻（`openPerfPanel` / `openShopPanel`）
- KPI 卡片带 hover tooltip 说明统计口径
- 金额统一换算为人民币后展示，使用 `formatGmv()` / `formatLargeNum()`
- 新增组件放在 `src/components/`，页面级放在 `src/pages/`
- 遵循 AGENTS.md 根指令：优先执行、小步迭代、不改无关代码

## 已知限制

- 趋势图需要 ≥2 天数据，数据不足时自动隐藏
- `changePct` 当日/昨日均为 0 时返回 0%（实际应为"无数据"）
- `parseGmv` 前后端各一份实现，存在漂移风险
- 汇率硬编码，不跟随市场变动
