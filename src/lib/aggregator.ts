import type { DailyOrder, ShopPerformance, KpiSnapshot } from "../types";

// Exchange rates: 1 unit → RMB (approximate mid-2026)
const RATES: Record<string, number> = {
  THB: 0.20,
  MYR: 1.55,
  VND: 0.00029,
  PHP: 0.13,
};

/**
 * Parse a GMV string with currency symbol, convert to RMB.
 *
 * Formats handled:
 *   Prefix:  ฿1,072.87  (THB)    RM455.51   (MYR)
 *            ₱1,682.58  (PHP)    ₫8,092     (VND — ERP/performance)
 *   Suffix:  44.563₫    (VND — daily_orders, dot=thousands-sep)
 */
/**
 * 解析 GMV 字符串，自动识别币种并换算为人民币。
 *
 * 支持的格式：
 *   前缀型：฿1,072.87 (THB)  RM455.51 (MYR)  ₱1,682.58 (PHP)  ₫8,092 (VND)
 *   后缀型：44.563₫ (VND — daily_orders 格式，点号=千分位)
 *
 * VND 特殊处理：越南盾格式中 . 为千分位而非小数点，需先去除再解析。
 */
export function parseGmv(raw: string): number {
  let s = raw.trim();
  if (!s) return 0;

  let currency = "";

  // Detect prefix currency symbol
  const prefixMatch = s.match(/^(RM|฿|₱|₫|\$|¥)/);
  if (prefixMatch) {
    const sym = prefixMatch[0];
    s = s.slice(sym.length);
    if (sym === "฿") currency = "THB";
    else if (sym === "RM") currency = "MYR";
    else if (sym === "₱") currency = "PHP";
    else if (sym === "₫") currency = "VND";
    else currency = sym; // $, ¥ treat as-is
  }

  // Detect suffix ₫ (VND daily_orders format)
  if (s.endsWith("₫")) {
    currency = "VND";
    s = s.slice(0, -1);
  }

  // Remove commas (thousands separators for most currencies)
  s = s.replace(/,/g, "");

  // VND: dots are thousands separators, not decimals
  if (currency === "VND") {
    s = s.replace(/\./g, "");
  }

  const n = parseFloat(s);
  if (isNaN(n)) return 0;

  const rate = RATES[currency];
  // If no rate found (e.g. already ¥), treat as-is
  return rate !== undefined ? n * rate : n;
}

function parseNum(raw: string): number {
  const n = parseFloat((raw || "").replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function parsePct(raw: string): number {
  const n = parseFloat((raw || "").replace("%", "").trim());
  return isNaN(n) ? 0 : n;
}

export function computeKpi(
  orders: DailyOrder[],
  perf: ShopPerformance[]
): KpiSnapshot {
  let todayGmv = 0;
  let yesterdayGmv = 0;
  let todayOrders = 0;
  let yesterdayOrders = 0;
  let todayVisitors = 0;
  let yesterdayVisitors = 0;
  let todayBuyers = 0;
  let yesterdayBuyers = 0;

  for (const o of orders) {
    todayGmv += parseGmv(o.今日商品交易总额);
    yesterdayGmv += parseGmv(o.昨日商品交易总额);
    todayOrders += parseNum(o.今日成交件数);
    yesterdayOrders += parseNum(o.昨日成交件数);
    todayVisitors += parseNum(o.今日商品访客数);
    yesterdayVisitors += parseNum(o.昨日商品访客数);
    todayBuyers += parseNum(o.今日下单用户数);
    yesterdayBuyers += parseNum(o.昨日下单用户数);
  }

  const totalCount = perf.length;
  const qualifiedCount = perf.filter(
    (p) => p.达标数?.startsWith("6")
  ).length;

  let avgBadReviewRate = 0;
  let avgViolationScore = 0;
  if (totalCount > 0) {
    for (const p of perf) {
      avgBadReviewRate += parsePct(p["店铺表现-商责店铺差评率(目标值＜5%)"]);
      avgViolationScore += parseNum(p["店铺表现-违规分(目标＜12)"]);
    }
    avgBadReviewRate /= totalCount;
    avgViolationScore /= totalCount;
  }

  return {
    todayGmv,
    yesterdayGmv,
    todayOrders,
    yesterdayOrders,
    todayVisitors,
    yesterdayVisitors,
    todayBuyers,
    yesterdayBuyers,
    qualifiedCount,
    totalCount,
    avgBadReviewRate: Math.round(avgBadReviewRate * 100) / 100,
    avgViolationScore: Math.round(avgViolationScore * 100) / 100,
  };
}

export function changePct(today: number, yesterday: number): number | null {
  if (yesterday === 0) return today > 0 ? null : 0;
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

export function formatLargeNum(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "亿";
  if (n >= 1e4) return (n / 1e4).toFixed(1) + "万";
  return n.toLocaleString();
}

export function formatGmv(n: number): string {
  return "¥" + formatLargeNum(n);
}
