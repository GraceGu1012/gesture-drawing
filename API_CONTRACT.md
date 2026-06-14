# TikTok 店铺看板 — 后端 API 契约

当前看板使用本地 JSON 文件作为数据源。切换到真实 API 时，后端需提供以下接口。

## 通用约定

- Base URL: `https://api.example.com/v1`
- 认证: Bearer token（从登录接口获取，与 ERP 账号体系打通）
- 所有接口返回 JSON，格式: `{ code: 0, data: ..., message: "" }`
- 权限由后端根据 token 自动判断，前端只传 token，不传用户身份参数

---

## 1. 获取当前用户信息与权限

```
GET /api/user/me
```

**Response:**

```json
{
  "code": 0,
  "data": {
    "name": "谢榆",
    "role": "seller",
    "group": "集团二部",
    "department": "Tiktok五部",
    "team": ""
  }
}
```

`role` 取值: `admin` | `dept_head` | `team_lead` | `seller`

---

## 2. 获取可见店铺列表

```
GET /api/shops
```

返回当前用户权限范围内所有店铺的基础信息。

**Response:**

```json
{
  "code": 0,
  "data": [
    {
      "店铺名称": "Tiktok-541VN",
      "店铺真实名称": "...",
      "集团名称": "集团二部",
      "部门": "Tiktok五部",
      "小组": "",
      "销售员": "谢榆",
      "站点": "VN",
      "店铺状态": "开启",
      "店铺属性": "铺货店铺",
      "店铺大小": "小店铺",
      "店铺类型": "系统铺货店铺",
      "运营类型": "一品多仓店",
      "店铺出村": "已出村",
      "在线产品数量": "989",
      "店铺准入一级类目": "Beauty & Personal Care",
      "店铺Code码": "CNSGCBJWLHFJ",
      "商家ID": "8649345793467122775"
    }
  ]
}
```

**说明**: 后端根据 token 查询用户所属集团/部门/小组/名下的店铺，返回基础字段。字段名与现有 Excel 导出保持一致。

---

## 3. 获取店铺考核表现

```
GET /api/shops/performance
```

返回当前用户可见店铺的最新考核状态。

**Response:** 结构与现有 `performance.json` 一致，每个店铺一条记录。

**说明**: 数据来源于 ERP 的"店铺表现"表，每日快照。

---

## 4. 获取日订单数据

```
GET /api/orders/daily?date=2026-06-12
```

返回指定日期当前用户可见店铺的日订单数据。不传 `date` 默认返回今日。

**Response:** 结构与现有 `daily_orders.json` 一致。

**说明**: 如果历史数据需要趋势图，前端会多次调用不同日期的数据。

---

## 5. 获取聚合指标（可选优化）

```
GET /api/dashboard/overview?date=2026-06-12
```

如果后端能预聚合，可提供此接口直接返回 KPI，减少前端计算量和数据传输。

**Response:**

```json
{
  "code": 0,
  "data": {
    "todayGmv": 52160885,
    "yesterdayGmv": 40000000,
    "todayOrders": 1168,
    "yesterdayOrders": 900,
    "todayVisitors": 5000,
    "yesterdayVisitors": 4000,
    "todayBuyers": 1119,
    "yesterdayBuyers": 850,
    "shopCount": 5000,
    "qualifiedCount": 4200,
    "avgBadReviewRate": 0.31,
    "avgViolationScore": 0.5
  }
}
```

---

## 前端切换方式

后端接口就绪后，只需修改 `src/lib/dataLoader.ts` 中的 `currentDataSource`：

```typescript
export const apiDataSource: DataSource = {
  async getShops() {
    const res = await fetch("/api/shops");
    const json = await res.json();
    return json.data;
  },
  // ...
};

setDataSource(apiDataSource);
```

其余代码无需改动。
