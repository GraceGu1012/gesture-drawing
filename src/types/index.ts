// ---- 店铺基础数据（对应 Sheet: 店铺基础数据） ----
// 注意：key 名与 Excel 导出表头严格一致
export interface Shop {
  店铺名称: string;
  店铺真实名称: string;
  集团名称: string;
  部门: string;
  小组: string;
  销售员: string;
  站点: string;
  店铺状态: string;
  店铺授权: string;
  店铺属性: string;
  海外仓: string;
  "3PF店铺": string;
  本土账号: string;
  店铺出村: string;
  /** Excel 表头是 `'店铺违规分'` 含单引号 */
  "'店铺违规分'": string;
  店铺大小: string;
  店铺标签: string;
  店铺类型: string;
  在线商品上限: string;
  刊登使用率: string;
  每日发布数量: string;
  在线产品数量: string;
  在线产品数量更新时间: string;
  运营类型: string;
  店铺Code码: string;
  商家ID: string;
  后台真实账号名称: string;
  店铺准入一级类目: string;
  自动调库存: string;
  仓库: string;
  滞销刊登: string;
  违规产品自动下架: string;
  单品折扣自动续期: string;
  秒杀活动自动续期: string;
  开启关闭切价: string;
  "销售系统店铺授权状态 2:授权过期  1:已授权  0:未授权": string;
  修改人名称: string;
  修改时间: string;
  同步时间: string;
  平台海外仓仓库名称: string;
  erp仓库名称: string;
}

// ---- 店铺表现（对应 Sheet: 店铺表现） ----
export interface ShopPerformance {
  集团: string;
  部门: string;
  店铺名: string;
  销售员: string;
  店铺属性: string;
  每日限单量: string;
  今日订单量: string;
  "最近7日均单": string;
  "店铺进入考核期完成度(6)": string;
  "订单总数 (目标值≥500)": string;
  "店铺试用期天数 (目标值≥30": string;
  "商责店铺差评率(目标值＜0.4%)": string;
  "延迟履约率(目标值＜4%)": string;
  "商责取消率(目标＜2.5%)": string;
  "违规分(目标＜12)": string;
  "店铺表现-商责取消率(目标＜2.5%)": string;
  "店铺表现-商责店铺差评率(目标值＜5%)": string;
  "店铺表现-延迟履约率(目标值＜4%)": string;
  "店铺表现-违规分(目标＜12)": string;
  系统获取时间: string;
  徽章状态: string;
  评估结果: string;
  达标数: string;
  销量达标状态: string;
  销售金额目标值: string;
  销售金额当前值: string;
  去重客户达标状态: string;
  去重客户目标值: string;
  去重客户当前值: string;
  店铺体验达标状态: string;
  店铺体验目标分: string;
  店铺体验当前分: string;
  违规积分达标状态: string;
  违规目标分: string;
  当前违规分: string;
  欺诈相关违规达标状态: string;
  欺诈相关违规目标值: string;
  欺诈相关违规当前值: string;
  考察期状态达标状态: string;
  考察期状态: string;
  考核周期时间开始: string;
  考核周期时间结束: string;
  上次考核成绩时间开始: string;
  上次考核成绩时间结束: string;
  明星店铺爬取时间: string;
}

// ---- 日订单（对应 Sheet: 日订单） ----
export interface DailyOrder {
  集团: string;
  部门: string;
  小组: string;
  销售员: string;
  店铺: string;
  今日下单用户数: string;
  昨日下单用户数: string;
  今日商品访客数: string;
  昨日商品访客数: string;
  今日商品交易总额: string;
  昨日商品交易总额: string;
  今日成交件数: string;
  昨日成交件数: string;
  /** Excel 表头含 "1是0否" 后缀 */
  "订单激增预警 1是0否": string;
  /** Excel 表头含空格和 "1是 0否" 后缀 */
  "低转化预警  1是 0否": string;
  同步时间: string;
}

// ---- 权限相关 ----
export type UserRole = "admin" | "dept_head" | "team_lead" | "seller";

export interface UserContext {
  name: string;
  role: UserRole;
  group: string;
  department: string;
  team: string;
}

// ---- 聚合指标 ----
export interface KpiSnapshot {
  todayGmv: number;
  yesterdayGmv: number;
  todayOrders: number;
  yesterdayOrders: number;
  todayVisitors: number;
  yesterdayVisitors: number;
  todayBuyers: number;
  yesterdayBuyers: number;
  qualifiedCount: number;
  totalCount: number;
  avgBadReviewRate: number;
  avgViolationScore: number;
}

export type TimeRange = "today" | "7d" | "30d";

export interface DataSource {
  getShops(): Promise<Shop[]>;
  getPerformance(): Promise<ShopPerformance[]>;
  getDailyOrders(): Promise<DailyOrder[]>;
}
