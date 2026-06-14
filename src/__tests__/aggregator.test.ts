import { describe, it, expect } from "vitest";
import { computeKpi, changePct, formatLargeNum, formatGmv, parseGmv } from "../lib/aggregator";
import type { DailyOrder, ShopPerformance } from "../types";

function makeOrder(overrides: Partial<DailyOrder> = {}): DailyOrder {
  return {
    集团: "集团二部",
    部门: "Tiktok五部",
    小组: "",
    销售员: "谢榆",
    店铺: "Tiktok-541VN",
    今日商品交易总额: "₫52,160,885",
    昨日商品交易总额: "₫40,000,000",
    今日成交件数: "1,168",
    昨日成交件数: "900",
    今日商品访客数: "5,000",
    昨日商品访客数: "4,000",
    今日下单用户数: "1,119",
    昨日下单用户数: "850",
    "订单激增预警 1是0否": "0",
    "低转化预警  1是 0否": "0",
    同步时间: "2026-06-12",
    ...overrides,
  };
}

function makePerf(overrides: Partial<ShopPerformance> = {}): ShopPerformance {
  return {
    集团: "集团二部",
    部门: "Tiktok五部",
    店铺名: "Tiktok-541VN",
    销售员: "谢榆",
    店铺属性: "铺货店铺",
    每日限单量: "",
    今日订单量: "",
    "最近7日均单": "99.71",
    "店铺进入考核期完成度(6)": "",
    "订单总数 (目标值≥500)": "",
    "店铺试用期天数 (目标值≥30": "",
    "商责店铺差评率(目标值＜0.4%)": "",
    "延迟履约率(目标值＜4%)": "",
    "商责取消率(目标＜2.5%)": "",
    "违规分(目标＜12)": "",
    "店铺表现-商责取消率(目标＜2.5%)": "0.22%",
    "店铺表现-商责店铺差评率(目标值＜5%)": "0.31%",
    "店铺表现-延迟履约率(目标值＜4%)": "0.00%",
    "店铺表现-违规分(目标＜12)": "0",
    系统获取时间: "",
    徽章状态: "True",
    评估结果: "满足",
    达标数: "6/6",
    销量达标状态: "达标",
    销售金额目标值: "",
    销售金额当前值: "₫52,160,885/1,168 个订单",
    去重客户达标状态: "达标",
    去重客户目标值: "",
    去重客户当前值: "1,119",
    店铺体验达标状态: "达标",
    店铺体验目标分: "",
    店铺体验当前分: "4.8",
    违规积分达标状态: "达标",
    违规目标分: "",
    当前违规分: "0",
    欺诈相关违规达标状态: "达标",
    欺诈相关违规目标值: "",
    欺诈相关违规当前值: "0",
    考察期状态达标状态: "达标",
    考察期状态: "已通过",
    考核周期时间开始: "",
    考核周期时间结束: "",
    上次考核成绩时间开始: "",
    上次考核成绩时间结束: "",
    明星店铺爬取时间: "",
    ...overrides,
  };
}

describe("computeKpi", () => {
  it("aggregates a single order", () => {
    const orders = [makeOrder()];
    const perf = [makePerf()];
    const kpi = computeKpi(orders, perf);

    expect(kpi.todayGmv).toBeCloseTo(15126.66, 0);
    expect(kpi.yesterdayGmv).toBe(11600);
    expect(kpi.todayOrders).toBe(1168);
    expect(kpi.todayVisitors).toBe(5000);
    expect(kpi.todayBuyers).toBe(1119);
  });

  it("aggregates multiple orders", () => {
    const orders = [makeOrder(), makeOrder({ 店铺: "Tiktok-542VN" })];
    const perf = [makePerf(), makePerf({ 店铺名: "Tiktok-542VN" })];
    const kpi = computeKpi(orders, perf);

    expect(kpi.todayGmv).toBeCloseTo(30253.31, 0);
    expect(kpi.todayOrders).toBe(1168 * 2);
  });

  it("counts qualified shops correctly", () => {
    const perf: ShopPerformance[] = [
      makePerf({ 达标数: "6/6" }),
      makePerf({ 店铺名: "T2", 达标数: "4/6" }),
      makePerf({ 店铺名: "T3", 达标数: "6/6" }),
    ];
    const kpi = computeKpi([makeOrder()], perf);
    expect(kpi.qualifiedCount).toBe(2);
    expect(kpi.totalCount).toBe(3);
  });

  it("handles empty data", () => {
    const kpi = computeKpi([], []);
    expect(kpi.todayGmv).toBe(0);
    expect(kpi.qualifiedCount).toBe(0);
  });
});

describe("changePct", () => {
  it("computes positive change", () => {
    expect(changePct(150, 100)).toBe(50);
  });
  it("computes negative change", () => {
    expect(changePct(50, 100)).toBe(-50);
  });
  it("handles zero yesterday", () => {
    expect(changePct(100, 0)).toBeNull();
  });
  it("handles zero both", () => {
    expect(changePct(0, 0)).toBe(0);
  });
});

describe("formatLargeNum", () => {
  it("formats numbers", () => {
    expect(formatLargeNum(52160885)).toBe("5216.1万");
    expect(formatLargeNum(150000000)).toBe("1.5亿");
    expect(formatLargeNum(999)).toBe("999");
  });
});

describe("formatGmv", () => {
  it("adds yuan sign", () => {
    expect(formatGmv(52160885)).toBe("¥5216.1万");
  });
});
