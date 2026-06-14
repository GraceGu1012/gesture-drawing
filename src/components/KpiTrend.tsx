import { useState, useMemo } from "react";
import type { DailyOrder } from "../types";
import { parseGmv } from "../lib/aggregator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type MetricKey = "gmv" | "orders" | "visitors" | "cvr";

interface MetricDef {
  key: MetricKey;
  label: string;
  color: string;
  /** Y 轴格式化 */
  yFmt: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { key: "gmv", label: "GMV", color: "#6366f1", yFmt: (v) => v >= 1e4 ? (v / 1e4).toFixed(1) + "万" : v.toLocaleString() },
  { key: "orders", label: "订单数", color: "#10b981", yFmt: (v) => v.toLocaleString() },
  { key: "visitors", label: "访客数", color: "#f59e0b", yFmt: (v) => v >= 1e4 ? (v / 1e4).toFixed(1) + "万" : v.toLocaleString() },
  { key: "cvr", label: "转化率", color: "#8b5cf6", yFmt: (v) => v.toFixed(1) + "%" },
];

interface Props {
  orders: DailyOrder[];
}

/** 按日聚合订单数据为一个数据点数组，按日期升序 */
function aggregateByDay(orders: DailyOrder[]) {
  const map = new Map<string, { gmv: number; orders: number; visitors: number; buyers: number }>();
  for (const o of orders) {
    const date = (o.同步时间 || "").slice(0, 10) || "未知";
    const prev = map.get(date) || { gmv: 0, orders: 0, visitors: 0, buyers: 0 };
    prev.gmv += parseGmv(o.今日商品交易总额);
    prev.orders += parseInt(o.今日成交件数) || 0;
    prev.visitors += parseInt(o.今日商品访客数) || 0;
    prev.buyers += parseInt(o.今日下单用户数) || 0;
    map.set(date, prev);
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({
      date,
      gmv: v.gmv,
      orders: v.orders,
      visitors: v.visitors,
      cvr: v.visitors > 0 ? +(v.buyers / v.visitors * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function KpiTrend({ orders }: Props) {
  // 最多选中 2 个指标；选第 3 个时移除最早选中的（FIFO）
  const [selected, setSelected] = useState<MetricKey[]>(["gmv"]);

  const data = useMemo(() => aggregateByDay(orders), [orders]);

  const toggleMetric = (key: MetricKey) => {
    setSelected((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length < 2) {
        return [...prev, key];
      }
      // FIFO: 移除第一个，追加新指标
      return [...prev.slice(1), key];
    });
  };

  if (data.length < 2) return null;

  const fmt = (n: number) => n >= 1e4 ? (n / 1e4).toFixed(1) + "万" : n.toLocaleString();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">核心指标趋势</h2>
        {/* 指标选择器 */}
        <div className="flex gap-0.5 bg-slate-100 rounded p-0.5">
          {METRICS.map((m) => {
            const isSel = selected.includes(m.key);
            const idx = selected.indexOf(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                  isSel
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {/* 选中时用色点标识对应 Y 轴 */}
                {isSel && idx >= 0 && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: METRICS.find((x) => x.key === m.key)!.color }} />
                )}
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-2">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            {/* 左 Y 轴 — 第 1 个选中指标 */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10 }}
              stroke={METRICS.find((m) => m.key === selected[0])?.color || "#94a3b8"}
              tickFormatter={METRICS.find((m) => m.key === selected[0])?.yFmt}
            />
            {/* 右 Y 轴 — 第 2 个选中指标（如有） */}
            {selected.length === 2 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                stroke={METRICS.find((m) => m.key === selected[1])!.color}
                tickFormatter={METRICS.find((m) => m.key === selected[1])!.yFmt}
              />
            )}
            <Tooltip
              contentStyle={{ fontSize: 11 }}
              formatter={(v: number, name: string) => {
                const m = METRICS.find((x) => x.key === name);
                return [m ? m.yFmt(v) : v, m?.label || name];
              }}
            />
            {selected.map((key, i) => {
              const m = METRICS.find((x) => x.key === key)!;
              return (
                <Line
                  key={key}
                  yAxisId={i === 0 ? "left" : "right"}
                  type="monotone"
                  dataKey={key}
                  stroke={m.color}
                  strokeWidth={1.5}
                  dot={false}
                  name={key}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
