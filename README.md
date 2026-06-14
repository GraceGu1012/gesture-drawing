# TikTok 店铺看板

Chrome 扩展侧边面板 — TikTok 店铺运营数据看板，支持多角色权限、多币种 GMV 自动换算、考核健康预警和店铺下钻分析。

## 技术栈

| 层 | 选型 |
|---|------|
| 框架 | React 18 + TypeScript (strict) |
| 构建 | Vite 6 + CRXJS v2（Chrome 扩展打包） |
| 样式 | Tailwind CSS 4 |
| 图表 | Recharts 2 |
| 后端 | FastAPI + PostgreSQL（[server.py](server.py)） |
| 测试 | Vitest 3 + jsdom |

## 目录结构

```
tiktok-dashboard/
├── src/
│   ├── App.tsx              # 应用入口：数据加载、角色、筛选、路由
│   ├── main.tsx             # React 挂载点
│   ├── content.ts           # Content script：从 ERP 页面提取登录用户
│   ├── sidepanel.html       # 侧边面板 HTML
│   ├── index.css            # Tailwind 入口
│   ├── types/index.ts       # 全部 TypeScript 类型定义
│   ├── lib/
│   │   ├── dataLoader.ts    # 数据源抽象（JSON 本地 / PostgreSQL API）
│   │   ├── permissions.ts   # 四级角色权限过滤
│   │   └── aggregator.ts    # 多币种 GMV 换算 + KPI 聚合
│   ├── pages/
│   │   ├── Overview.tsx     # 概览看板：KPI、考核、风险、排行
│   │   └── ShopDetail.tsx   # 单店详情：快照、趋势、考核明细
│   ├── components/
│   │   ├── KpiCard.tsx      # KPI 卡片（带环比、tooltip）
│   │   ├── ShopRanking.tsx  # GMV Top 10 排行
│   │   ├── ShopListPanel.tsx# 店铺列表下钻面板
│   │   ├── ShopTrend.tsx    # 日订单趋势折线图
│   │   ├── FilterBar.tsx    # 集团→部门→小组→销售员级联筛选
│   │   └── RoleSwitcher.tsx # 角色切换
│   ├── data/                # 本地 JSON 数据源
│   └── __tests__/           # 单元测试
├── server.py                # FastAPI 后端
├── API_CONTRACT.md          # API 契约文档
├── manifest.json            # Chrome 扩展 manifest v3
├── vite.config.ts           # Vite + CRXJS 配置
├── vite.web.config.ts       # 纯 Web 模式 Vite 配置（本地预览用）
└── tsconfig.json
```

## 快速开始

### 前提

- Node.js 18+
- Python 3.10+（后端）
- PostgreSQL 运行中，数据库 `tiktok_dashboard` 已建表
- Chrome 浏览器

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端 API

```bash
pip install fastapi uvicorn psycopg2
python server.py
# API 运行在 http://localhost:8000
```

### 3. 构建 Chrome 扩展

```bash
npm run build
# 产出在 dist/
```

### 4. 加载扩展

1. 打开 Chrome → `chrome://extensions`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」→ 选择 `dist/` 目录
4. 点击工具栏的扩展图标打开侧边面板

### 本地 Web 预览（不依赖 Chrome 扩展）

```bash
npx vite build --config vite.web.config.ts
# 用 Python HTTP server 提供静态文件
python3 -m http.server 8080 --directory dist
# 打开 http://localhost:8080
```

## 数据源切换

默认使用 PostgreSQL API。如需切回本地 JSON 调试，在 `src/lib/dataLoader.ts` 中调用：

```typescript
import { setDataSource, jsonDataSource } from "./lib/dataLoader";
setDataSource(jsonDataSource);
```

## 权限模型

| 角色 | 可见范围 |
|------|---------|
| admin | 全部店铺 |
| dept_head | 所属部门 |
| team_lead | 所属小组 |
| seller | 自己名下店铺 |

用户身份由 content script 从 ERP 页面自动提取，存储在 `chrome.storage.local`。

## 多币种支持

自动识别以下货币符号并换算为人民币（汇率硬编码在 `aggregator.ts`）：

| 货币 | 符号 | 汇率 (→ RMB) |
|------|------|-------------|
| 泰铢 | ฿ | 0.20 |
| 马来西亚林吉特 | RM | 1.55 |
| 越南盾 | ₫ | 0.00029 |
| 菲律宾比索 | ₱ | 0.13 |

## API 端点

详见 [API_CONTRACT.md](API_CONTRACT.md)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/me` | 当前用户信息 |
| GET | `/api/shops` | 店铺列表 |
| GET | `/api/shops/performance` | 店铺考核表现 |
| GET | `/api/orders/daily?date=2026-06-12` | 日订单 |
| GET | `/api/dashboard/overview` | 聚合概览 |

## 运行测试

```bash
npm test
```

---

## 历史更新

### 2026-06-14

- 删除本地 `daily_orders.json`，日订单完全迁移至 PostgreSQL API
- 移除硬编码用户列表，改为从 ERP 内容脚本动态提取
- Git 初始化，建立版本控制
- 新增 README.md
- 清理临时文件（`.~xlsx` 锁文件、空 `data/` 目录）

### 2026-06-13

- 多币种 GMV 换算（`parseGmv`）统一入口，修复 VND 千分位点号问题
- 考核健康看板：达标率、差评率、违规分 + 下钻面板
- 店铺大小分布、刊登使用率预警
- 集团/部门排行视图切换
- ShopTrend 折线图（GMV/订单/访客/转化率四指标）
- ERP 用户提取 content script

### 2026-06-12

- 项目初始化：React + TypeScript + Vite + CRXJS
- 三级数据源导入（shops / performance / daily_orders）
- 权限过滤模块与单元测试
- KPI 聚合模块与单元测试
- 概览页 KPI 卡片、ShopRanking
- 单店详情页基础信息
- FilterBar 级联筛选
- FastAPI + PostgreSQL 后端 API

---

## 待办事项

### 高优先级

- [ ] 导入多天历史日订单数据，使趋势图可用（当前仅单日数据）
- [ ] API 请求增加错误处理和重试逻辑
- [ ] `server.py` 与 `aggregator.ts` 中 `parseGmv` 逻辑统一为单一数据源（避免双端维护）

### 中优先级

- [ ] 支持动态汇率配置（替代硬编码汇率）
- [ ] 日订单数据的实时增量更新机制
- [ ] 增加 E2E 测试 / 截图回归测试
- [ ] 图表增加数据导出功能（CSV 下载）

### 低优先级

- [ ] `changePct` 当日/昨日均为 0 时的语义优化（当前返回 0%，应为"无数据"）
- [ ] 用户偏好存储（记住上次选择的视图模式和时间范围）
- [ ] 7 家缺失考核数据的店铺排查
