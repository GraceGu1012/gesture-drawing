import { useState, useMemo } from "react";
import type { KpiSnapshot, DailyOrder, Shop, ShopPerformance, TimeRange } from "../types";
import { changePct, formatGmv, formatLargeNum, parseGmv } from "../lib/aggregator";
import KpiCard from "../components/KpiCard";
import ShopRanking from "../components/ShopRanking";
import ShopListPanel from "../components/ShopListPanel";
import KpiTrend from "../components/KpiTrend";

interface Props {
  kpi: KpiSnapshot | null;
  orders: DailyOrder[];
  shops: Shop[];
  perf: ShopPerformance[];
  timeRange: TimeRange;
  onShopClick: (shopName: string) => void;
  viewMode: "shop" | "group" | "dept";
}

interface PanelState {
  title: string;
  shops: { name: string; value?: string }[];
}

function parseNum(s: string): number {
  const n = parseFloat((s || "").replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

export default function Overview({ kpi, orders, perf, shops, onShopClick, viewMode }: Props) {
  const [panel, setPanel] = useState<PanelState | null>(null);

  /* ---- 派生统计：从 performance 和 shops 预计算各种分组 ── */
  const violationOver10 = useMemo(
    () => perf.filter((p) => parseNum(p["店铺表现-违规分(目标＜12)"]) > 10),
    [perf]
  );
  const salesNotMet = useMemo(
    () => perf.filter((p) => p.销量达标状态 === "未达标"),
    [perf]
  );
  const customerNotMet = useMemo(
    () => perf.filter((p) => p.去重客户达标状态 === "未达标"),
    [perf]
  );
  const violationScoreNotMet = useMemo(
    () => perf.filter((p) => p.违规积分达标状态 === "未达标"),
    [perf]
  );

  const sizeBuckets = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of shops) {
      const key = s.店铺大小 || "其他";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s.店铺名称);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [shops]);

  const lowListingShops = useMemo(
    () => shops.filter((s) => parseFloat(s.刊登使用率 || "0") < 50).map((s) => s.店铺名称),
    [shops]
  );

  const avg7dBuckets = useMemo(() => {
    const buckets = [
      { label: "0-10", shops: [] as ShopPerformance[] },
      { label: "10-20", shops: [] as ShopPerformance[] },
      { label: "20-30", shops: [] as ShopPerformance[] },
      { label: "30+", shops: [] as ShopPerformance[] },
    ];
    for (const p of perf) {
      const v = parseNum(p["最近7日均单"]);
      if (v < 10) buckets[0].shops.push(p);
      else if (v < 20) buckets[1].shops.push(p);
      else if (v < 30) buckets[2].shops.push(p);
      else buckets[3].shops.push(p);
    }
    return buckets;
  }, [perf]);

  /* ---- 集团 / 部门维度聚合：按组织层级汇总 GMV 和订单 ── */
  const groupRanking = useMemo(() => {
    const map = new Map<string, { gmv: number; orders: number; depts: Set<string> }>();
    for (const o of orders) {
      const s = shops.find((x) => x.店铺名称 === o.店铺);
      const group = s?.集团名称 || "未知";
      const prev = map.get(group) || { gmv: 0, orders: 0, depts: new Set<string>() };
      prev.gmv += parseGmv(o.今日商品交易总额);
      prev.orders += parseInt(o.今日成交件数) || 0;
      if (s?.部门) prev.depts.add(s.部门);
      map.set(group, prev);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, gmv: v.gmv, orders: v.orders, deptCount: v.depts.size }))
      .sort((a, b) => b.gmv - a.gmv);
  }, [orders, shops]);

  const deptRanking = useMemo(() => {
    const map = new Map<string, { gmv: number; orders: number; group: string; teams: Set<string>; sales: Set<string> }>();
    for (const o of orders) {
      const s = shops.find((x) => x.店铺名称 === o.店铺);
      const dept = s?.部门 || "未知";
      const prev = map.get(dept) || { gmv: 0, orders: 0, group: s?.集团名称 || "", teams: new Set<string>(), sales: new Set<string>() };
      prev.gmv += parseGmv(o.今日商品交易总额);
      prev.orders += parseInt(o.今日成交件数) || 0;
      if (s?.小组) prev.teams.add(s.小组);
      if (s?.销售员) prev.sales.add(s.销售员);
      map.set(dept, prev);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, gmv: v.gmv, orders: v.orders, group: v.group, teamCount: v.teams.size, salesCount: v.sales.size }))
      .sort((a, b) => b.gmv - a.gmv);
  }, [orders, shops]);

  /* ---- 下钻面板辅助函数：将预计算的分组数据转为全屏列表，按值降序 ── */
  function openPerfPanel(title: string, list: ShopPerformance[], valueKey?: (p: ShopPerformance) => string) {
    let items = list.map((p) => ({
      name: p.店铺名,
      _sortVal: valueKey ? parseNum(valueKey(p)) : 0,
      value: valueKey ? valueKey(p) : undefined,
    }));
    items.sort((a, b) => b._sortVal - a._sortVal);
    setPanel({ title, shops: items.map(({ name, value }) => ({ name, value })) });
  }

  function openShopPanel(title: string, shopNames: string[]) {
    setPanel({ title, shops: shopNames.map((name) => ({ name })) });
  }

  function openRankPanel(title: string, items: { name: string; value?: string }[]) {
    setPanel({ title, shops: items });
  }

  if (!kpi) {
    return (
      <div className="text-xs text-slate-400 text-center py-8">
        当前角色暂无可见数据
      </div>
    );
  }

  const gmvChange = changePct(kpi.todayGmv, kpi.yesterdayGmv);
  const orderChange = changePct(kpi.todayOrders, kpi.yesterdayOrders);
  const visitorChange = changePct(kpi.todayVisitors, kpi.yesterdayVisitors);

  // 转化率 = 下单用户数 / 访客数 × 100%
  const todayCvr = kpi.todayVisitors > 0
    ? ((kpi.todayBuyers / kpi.todayVisitors) * 100).toFixed(1) + "%"
    : "-";
  const yesterdayCvr = kpi.yesterdayVisitors > 0
    ? (kpi.yesterdayBuyers / kpi.yesterdayVisitors) * 100
    : 0;
  const cvrChange = kpi.todayVisitors > 0
    ? changePct((kpi.todayBuyers / kpi.todayVisitors) * 100, yesterdayCvr)
    : null;

  const qualifiedPct = kpi.totalCount > 0
    ? ((kpi.qualifiedCount / kpi.totalCount) * 100).toFixed(0) + "%"
    : "-";

  return (
    <div className="space-y-4">
      {panel && (
        <ShopListPanel
          title={panel.title}
          shops={panel.shops}
          onClose={() => setPanel(null)}
          onShopClick={(name) => {
            setPanel(null);
            onShopClick(name);
          }}
        />
      )}

      {/* ── KPI Cards ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">核心指标</h2>
        <div className="grid grid-cols-2 gap-2">
          <KpiCard label="GMV" value={formatGmv(kpi.todayGmv)} change={gmvChange}
            tip="按角色可见店铺的「今日商品交易总额」求和，自动识别币种换算为人民币" />
          <KpiCard label="订单数" value={formatLargeNum(kpi.todayOrders)} change={orderChange}
            tip="「今日成交件数」求和；环比 = (今日 - 昨日) / 昨日 × 100%" />
          <KpiCard label="访客数" value={formatLargeNum(kpi.todayVisitors)} change={visitorChange} />
          <KpiCard label="转化率" value={todayCvr} change={cvrChange}
            tip="今日下单用户数 / 今日商品访客数 × 100%" />
        </div>
      </div>

      {/* ── 核心指标趋势（仅 7 天 / 30 天视图） ── */}
      {timeRange !== "today" && (
        <KpiTrend orders={orders} />
      )}

      {/* ── 最近7日均单分布 ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">最近7日均单分布</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {avg7dBuckets.map((b) => (
            <button key={b.label}
              onClick={() => openPerfPanel(`最近7日均单 ${b.label}`,
                [...b.shops].sort((a,b) => parseNum(b["最近7日均单"]) - parseNum(a["最近7日均单"])),
                (p) => p["最近7日均单"] + "单")}
              className="bg-white rounded-lg border border-slate-200 p-2 text-center hover:border-indigo-300 transition-colors">
              <div className="text-sm font-bold text-slate-700">{b.shops.length}</div>
              <div className="text-xs text-slate-500">{b.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 排行（按视图模式） ── */}
      {viewMode === "shop" && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">GMV 排行 Top 10</h2>
          <div className="bg-white rounded-lg border border-slate-200 p-2">
            <ShopRanking orders={orders} onShopClick={onShopClick} />
          </div>
        </div>
      )}

      {viewMode === "group" && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">集团排行</h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {groupRanking.slice(0, 15).map((g, i) => (
              <div key={g.name} className="flex items-center gap-2 px-3 py-2 text-xs">
                <span className={`font-bold w-5 text-right ${i < 3 ? "text-amber-500" : "text-slate-400"}`}>{i + 1}</span>
                <span className="flex-1 text-slate-700 truncate">{g.name}</span>
                <span className="text-slate-500">{g.deptCount}部门</span>
                <span className="font-medium text-slate-600 w-16 text-right">{formatGmv(g.gmv)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === "dept" && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">部门排行</h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {deptRanking.slice(0, 15).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 px-3 py-2 text-xs">
                <span className={`font-bold w-5 text-right ${i < 3 ? "text-amber-500" : "text-slate-400"}`}>{i + 1}</span>
                <span className="flex-1 text-slate-700 truncate">{d.name}</span>
                <span className="text-slate-400">{d.teamCount}组</span>
                <span className="font-medium text-slate-600 w-16 text-right">{formatGmv(d.gmv)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 店铺大小（压缩） ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">店铺大小</h2>
        <div className="flex gap-2">
          {sizeBuckets.map(([size, names]) => (
            <button key={size} onClick={() => openShopPanel(size, names)}
              className="flex-1 bg-white rounded border border-slate-200 py-1.5 px-2 hover:border-indigo-300 transition-colors text-center">
              <span className="text-xs font-bold text-slate-700">{names.length}</span>
              <span className="text-[10px] text-slate-500 ml-1">{size}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 刊登 ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">刊登</h2>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => openShopPanel("刊登使用率 < 50%", lowListingShops)}
            className="bg-white rounded-lg border border-slate-200 p-3 hover:border-indigo-300 transition-colors text-left">
            <div className="text-lg font-bold text-amber-500">{lowListingShops.length}</div>
            <div className="text-xs text-slate-500">使用率 &lt; 50%</div>
          </button>
        </div>
      </div>

      {/* ── 考核健康 ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">考核健康</h2>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => openPerfPanel("达标店铺", perf.filter((p) => p.达标数?.startsWith("6")), (p) => p.达标数 || "-")}
            className="bg-white rounded-lg border border-slate-200 p-3 text-center hover:border-indigo-300 transition-colors">
            <div className="text-lg font-bold text-emerald-600">{qualifiedPct}</div>
            <div className="text-xs text-slate-500">达标率</div>
            <div className="text-xs text-slate-400">{kpi.qualifiedCount}/{kpi.totalCount} 店</div>
          </button>
          <button onClick={() => openPerfPanel("差评率",
            [...perf].sort((a,b) => parseNum(b["店铺表现-商责店铺差评率(目标值＜5%)"]) - parseNum(a["店铺表现-商责店铺差评率(目标值＜5%)"])),
            (p) => p["店铺表现-商责店铺差评率(目标值＜5%)"])}
            className="bg-white rounded-lg border border-slate-200 p-3 text-center hover:border-indigo-300 transition-colors">
            <div className="text-lg font-bold text-amber-500">{kpi.avgBadReviewRate}%</div>
            <div className="text-xs text-slate-500">差评率</div>
            <div className="text-xs text-slate-400">
              {perf.filter((p) => parseFloat(p["店铺表现-商责店铺差评率(目标值＜5%)"]) > 0.4).length} 店超标
            </div>
          </button>
          <button onClick={() => openPerfPanel("违规分",
            [...violationOver10].sort((a,b) => parseNum(b["店铺表现-违规分(目标＜12)"]) - parseNum(a["店铺表现-违规分(目标＜12)"])),
            (p) => p["店铺表现-违规分(目标＜12)"])}
            className="bg-white rounded-lg border border-slate-200 p-3 text-center hover:border-indigo-300 transition-colors">
            <div className="text-lg font-bold text-slate-700">{kpi.avgViolationScore}</div>
            <div className="text-xs text-slate-500">违规分</div>
            <div className="text-xs text-slate-400">{violationOver10.length} 店 &gt;10</div>
          </button>
        </div>
      </div>

      {/* ── 风险预警 ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">风险预警</h2>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => openPerfPanel("违规分 > 10",
            [...violationOver10].sort((a,b) => parseNum(b["店铺表现-违规分(目标＜12)"]) - parseNum(a["店铺表现-违规分(目标＜12)"])),
            (p) => p["店铺表现-违规分(目标＜12)"])}
            className="bg-white rounded-lg border border-slate-200 p-3 hover:border-indigo-300 transition-colors text-left">
            <div className="text-lg font-bold text-red-500">{violationOver10.length}</div>
            <div className="text-xs text-slate-500">违规分 &gt; 10</div>
          </button>
          <button onClick={() => openPerfPanel("销量未达标", salesNotMet, (p) => p.销售金额当前值 || "-")}
            className="bg-white rounded-lg border border-slate-200 p-3 hover:border-indigo-300 transition-colors text-left">
            <div className="text-lg font-bold text-red-500">{salesNotMet.length}</div>
            <div className="text-xs text-slate-500">销量未达标</div>
          </button>
          <button onClick={() => openPerfPanel("去重客户未达标", customerNotMet)}
            className="bg-white rounded-lg border border-slate-200 p-3 hover:border-indigo-300 transition-colors text-left">
            <div className="text-lg font-bold text-red-500">{customerNotMet.length}</div>
            <div className="text-xs text-slate-500">去重客户未达标</div>
          </button>
          <button onClick={() => openPerfPanel("违规积分未达标", violationScoreNotMet, (p) => p.当前违规分 || "-")}
            className="bg-white rounded-lg border border-slate-200 p-3 hover:border-indigo-300 transition-colors text-left">
            <div className="text-lg font-bold text-red-500">{violationScoreNotMet.length}</div>
            <div className="text-xs text-slate-500">违规积分未达标</div>
          </button>
        </div>
      </div>

    </div>
  );
}
