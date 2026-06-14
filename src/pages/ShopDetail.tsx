import type { Shop, ShopPerformance, DailyOrder } from "../types";
import { parseGmv, formatGmv, formatLargeNum } from "../lib/aggregator";
import ShopTrend from "../components/ShopTrend";

interface Props {
  shop: Shop;
  perf: ShopPerformance | undefined;
  orders: DailyOrder[];
  onBack: () => void;
}

function parseNum(raw: string): number {
  const n = parseFloat((raw || "").replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function statusBadge(status: string) {
  const ok = status === "达标";
  return (
    <span className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-red-500"}`}>
      {status || "-"}
    </span>
  );
}

export default function ShopDetail({ shop, perf, orders, onBack }: Props) {
  let todayGmv = 0;
  let todayOrders = 0;
  let todayVisitors = 0;
  for (const o of orders) {
    todayGmv += parseGmv(o.今日商品交易总额);
    todayOrders += parseNum(o.今日成交件数);
    todayVisitors += parseNum(o.今日商品访客数);
  }

  /* ---- Module: 基础信息 ---- */
  const basicRows: [string, string][] = [
    ["站点", shop.站点],
    ["店铺属性", shop.店铺属性],
    ["店铺状态", shop.店铺状态],
    ["店铺大小", shop.店铺大小],
    ["店铺类型", shop.店铺类型],
    ["运营类型", shop.运营类型],
    ["店铺出村", shop.店铺出村],
    ["店铺授权", shop.店铺授权],
    ["海外仓", shop.海外仓],
    ["3PF店铺", shop["3PF店铺"]],
    ["本土账号", shop.本土账号],
    ["店铺Code码", shop.店铺Code码],
    ["商家ID", shop.商家ID],
    ["类目", shop.店铺准入一级类目],
    ["销售员", shop.销售员],
    ["部门", shop.部门],
    ["小组", shop.小组],
    ["集团", shop.集团名称],
    ["平台海外仓", shop.平台海外仓仓库名称],
    ["ERP仓库", shop.erp仓库名称],
  ];

  /* ---- Module: 运营配置 ---- */
  const opsRows: [string, string][] = [
    ["在线产品", shop.在线产品数量],
    ["在线商品上限", shop.在线商品上限],
    ["刊登使用率", shop.刊登使用率 + "%"],
    ["每日发布数量", shop.每日发布数量],
    ["自动调库存", shop.自动调库存],
    ["仓库", shop.仓库],
    ["滞销刊登", shop.滞销刊登],
    ["违规产品自动下架", shop.违规产品自动下架],
    ["单品折扣自动续期", shop.单品折扣自动续期],
    ["秒杀活动自动续期", shop.秒杀活动自动续期],
    ["开启关闭切价", shop.开启关闭切价],
  ];

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
      >
        ← 返回列表
      </button>

      <h2 className="text-base font-bold text-slate-800">{shop.店铺名称}</h2>
      <p className="text-xs text-slate-500">{shop.店铺真实名称}</p>

      {/* ── 今日快照 ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
          <div className="text-sm font-bold text-slate-800">{formatGmv(todayGmv)}</div>
          <div className="text-xs text-slate-500">今日 GMV</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
          <div className="text-sm font-bold text-slate-800">{formatLargeNum(todayOrders)}</div>
          <div className="text-xs text-slate-500">今日订单</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
          <div className="text-sm font-bold text-slate-800">{formatLargeNum(todayVisitors)}</div>
          <div className="text-xs text-slate-500">今日访客</div>
        </div>
      </div>

      {/* ── 日订单趋势 ── */}
      <ShopTrend orders={orders} />

      {/* ── 考核状态 ── */}
      {perf && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            考核状态
          </h3>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            <Row label="达标进度" value={perf.达标数}
              cls={perf.达标数?.startsWith("6") ? "text-emerald-600" : "text-amber-500"} />
            <Row label="差评率" value={perf["店铺表现-商责店铺差评率(目标值＜5%)"]} />
            <Row label="取消率" value={perf["店铺表现-商责取消率(目标＜2.5%)"]} />
            <Row label="履约率" value={perf["店铺表现-延迟履约率(目标值＜4%)"]} />
            <Row label="违规分" value={perf["店铺表现-违规分(目标＜12)"]} />
            <Row label="销量达标" value={statusBadge(perf.销量达标状态)} />
            <Row label="去重客户达标" value={statusBadge(perf.去重客户达标状态)} />
            <Row label="店铺体验达标" value={statusBadge(perf.店铺体验达标状态)} />
            <Row label="违规积分达标" value={statusBadge(perf.违规积分达标状态)} />
            <Row label="欺诈相关达标" value={statusBadge(perf.欺诈相关违规达标状态)} />
            <Row label="考察期状态" value={perf.考察期状态} />
            <Row label="评估结果" value={perf.评估结果} />
          </div>
        </div>
      )}

      {/* ── 考核明细 ── */}
      {perf && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            考核明细
          </h3>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            <Row label="销售金额" value={perf.销售金额当前值} />
            <Row label="销售目标" value={perf.销售金额目标值} />
            <Row label="去重客户" value={perf.去重客户当前值} />
            <Row label="去重客户目标" value={perf.去重客户目标值} />
            <Row label="店铺体验分" value={perf.店铺体验当前分} />
            <Row label="体验分目标" value={perf.店铺体验目标分} />
            <Row label="违规积分" value={perf.当前违规分} />
            <Row label="违规目标分" value={perf.违规目标分} />
            <Row label="欺诈违规" value={perf.欺诈相关违规当前值} />
            <Row label="欺诈违规目标" value={perf.欺诈相关违规目标值} />
          </div>
        </div>
      )}

      {/* ── 基础信息 ── */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          基础信息
        </h3>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {basicRows.map(([label, value]) => (
            <Row key={label} label={label} value={value || "-"} />
          ))}
        </div>
      </div>

      {/* ── 运营配置 ── */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          运营配置
        </h3>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {opsRows.map(([label, value]) => (
            <Row key={label} label={label} value={value || "-"} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* tiny helper */
function Row({ label, value, cls }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="flex justify-between px-3 py-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-700 max-w-[200px] truncate text-right ${cls || ""}`}>{value}</span>
    </div>
  );
}
