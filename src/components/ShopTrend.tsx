import { useState } from "react";
import type { DailyOrder } from "../types";
import { parseGmv } from "../lib/aggregator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Metric = "gmv" | "orders" | "visitors" | "cvr";

interface Props {
  orders: DailyOrder[];
}

const METRICS: { key: Metric; label: string }[] = [
  { key: "gmv", label: "GMV" },
  { key: "orders", label: "订单数" },
  { key: "visitors", label: "访客数" },
  { key: "cvr", label: "转化率" },
];

export default function ShopTrend({ orders }: Props) {
  const [metric, setMetric] = useState<Metric>("gmv");

  // 按日聚合订单数据：将同一日期的多条记录合并为单个数据点
  const dayMap = new Map<string, { gmv: number; orders: number; visitors: number; buyers: number }>();
  for (const o of orders) {
    const date = (o.同步时间 || "").slice(0, 10) || "未知";
    const prev = dayMap.get(date) || { gmv: 0, orders: 0, visitors: 0, buyers: 0 };
    prev.gmv += parseGmv(o.今日商品交易总额);
    prev.orders += parseInt(o.今日成交件数) || 0;
    prev.visitors += parseInt(o.今日商品访客数) || 0;
    prev.buyers += parseInt(o.今日下单用户数) || 0;
    dayMap.set(date, prev);
  }

  const data = Array.from(dayMap.entries())
    .map(([date, v]) => ({
      date,
      gmv: v.gmv,
      orders: v.orders,
      visitors: v.visitors,
      cvr: v.visitors > 0 ? +(v.buyers / v.visitors * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // 按日期升序，确保折线图 X 轴正确

  if (data.length < 2) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">日订单趋势</h3>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-xs text-slate-400">数据不足（需 ≥2 天数据），暂无趋势图</div>
        </div>
      </div>
    );
  }

  const fmt = (n: number) => {
    if (n >= 1e4) return (n / 1e4).toFixed(1) + "万";
    return n.toLocaleString();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">日订单趋势</h3>
        {/* 指标切换：GMV / 订单数 / 访客数 / 转化率 */}
        <div className="flex gap-0.5 bg-slate-100 rounded p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                metric === m.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-2">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={metric === "cvr" ? (v) => v + "%" : fmt} />
            <Tooltip
              contentStyle={{ fontSize: 11 }}
              formatter={metric === "cvr" ? (v: number) => v + "%" : (v: number) => fmt(v)}
            />
            <Line type="monotone" dataKey={metric} stroke="#6366f1" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
