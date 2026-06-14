import type { Shop, ShopPerformance, DailyOrder, DataSource } from "../types";
import shopsData from "../data/shops.json";
import performanceData from "../data/performance.json";

// PostgreSQL API 地址 — 生产环境需替换
const API_BASE = "http://localhost:8000";

/* ── JSON 本地兜底数据源 — 日订单已迁移至 API ── */
export const jsonDataSource: DataSource = {
  async getShops(): Promise<Shop[]> {
    return shopsData as unknown as Shop[];
  },
  async getPerformance(): Promise<ShopPerformance[]> {
    return performanceData as unknown as ShopPerformance[];
  },
  async getDailyOrders(): Promise<DailyOrder[]> {
    return []; // 日订单已迁移至 PostgreSQL API
  },
};

/* ── PostgreSQL API data source ── */
async function apiGet<T>(path: string): Promise<T[]> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data as T[];
}

export const apiDataSource: DataSource = {
  async getShops(): Promise<Shop[]> {
    return apiGet<Shop>("/api/shops");
  },
  async getPerformance(): Promise<ShopPerformance[]> {
    return apiGet<ShopPerformance>("/api/shops/performance");
  },
  async getDailyOrders(): Promise<DailyOrder[]> {
    return apiGet<DailyOrder>("/api/orders/daily");
  },
};

/* ── 当前激活的数据源，默认走 PostgreSQL API ── */
export let currentDataSource: DataSource = apiDataSource;

export function setDataSource(ds: DataSource) {
  currentDataSource = ds;
}

export async function loadAllData() {
  const [shops, perf, orders] = await Promise.all([
    currentDataSource.getShops(),
    currentDataSource.getPerformance(),
    currentDataSource.getDailyOrders(),
  ]);
  return { shops, perf, orders };
}
