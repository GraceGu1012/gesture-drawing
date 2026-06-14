import { useState, useEffect, useMemo, useCallback } from "react";
import type { UserContext, Shop, DailyOrder, ShopPerformance, KpiSnapshot, TimeRange } from "./types";
import { loadAllData } from "./lib/dataLoader";
import { filterShops, filterDailyOrders, filterPerformance } from "./lib/permissions";
import { computeKpi } from "./lib/aggregator";
import Overview from "./pages/Overview";
import ShopDetail from "./pages/ShopDetail";
import RoleSwitcher from "./components/RoleSwitcher";
import FilterBar from "./components/FilterBar";

/** 最小默认用户 — ERP 内容脚本注入前使用。真实用户由 content.ts 从 ERP 页面提取 */
const DEFAULT_USER: UserContext = { name: "管理员", role: "admin", group: "", department: "", team: "" };

type ViewMode = "shop" | "group" | "dept";

export default function App() {
  const [user, setUser] = useState<UserContext>(DEFAULT_USER);
  const [userReady, setUserReady] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("shop");

  const [filterGroup, setFilterGroup] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterSales, setFilterSales] = useState("");

  const [shops, setShops] = useState<Shop[]>([]);
  const [perf, setPerf] = useState<ShopPerformance[]>([]);
  const [orders, setOrders] = useState<DailyOrder[]>([]);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get("erpUser", (result) => {
        if (result.erpUser) setUser(result.erpUser as UserContext);
        setUserReady(true);
      });
    } else {
      setUserReady(true);
    }
  }, []);

  useEffect(() => {
    if (!userReady) return;
    loadAllData().then((data) => {
      setShops(data.shops);
      setPerf(data.perf);
      setOrders(data.orders);
      setLoading(false);
    });
  }, [userReady]);

  // Determine latest date from orders
  const latestDate = useMemo(() => {
    const dates = orders
      .map((o) => (o.同步时间 || "").slice(0, 10))
      .filter(Boolean);
    if (dates.length === 0) return "";
    return dates.sort().reverse()[0];
  }, [orders]);

  const roleShops = useMemo(() => filterShops(shops, user), [shops, user]);

  const filteredShops = useMemo(() => {
    return roleShops.filter((s) => {
      if (filterGroup && s.集团名称 !== filterGroup) return false;
      if (filterDept && s.部门 !== filterDept) return false;
      if (filterTeam && s.小组 !== filterTeam) return false;
      if (filterSales && s.销售员 !== filterSales) return false;
      return true;
    });
  }, [roleShops, filterGroup, filterDept, filterTeam, filterSales]);

  // All role-filtered orders
  const roleOrders = useMemo(
    () => filterDailyOrders(orders, filteredShops, user),
    [orders, filteredShops, user]
  );

  // Apply time range filter
  const filteredOrders = useMemo(() => {
    if (!latestDate) return roleOrders;
    const latest = new Date(latestDate);
    let since = latest;
    if (timeRange === "7d") {
      since = new Date(latest);
      since.setDate(since.getDate() - 6);
    } else if (timeRange === "30d") {
      since = new Date(latest);
      since.setDate(since.getDate() - 29);
    }
    const sinceStr = since.toISOString().slice(0, 10);
    return roleOrders.filter((o) => (o.同步时间 || "").slice(0, 10) >= sinceStr);
  }, [roleOrders, timeRange, latestDate]);

  const filteredPerf = useMemo(
    () => filterPerformance(perf, filteredShops, user),
    [perf, filteredShops, user]
  );

  const kpi: KpiSnapshot | null = useMemo(
    () => (filteredOrders.length > 0 ? computeKpi(filteredOrders, filteredPerf) : null),
    [filteredOrders, filteredPerf]
  );

  const handleShopClick = useCallback((shopName: string) => {
    setSelectedShop(shopName);
  }, []);

  const currentShop = selectedShop
    ? shops.find((s) => s.店铺名称 === selectedShop)
    : null;
  const currentPerf = selectedShop
    ? perf.find((p) => p.店铺名 === selectedShop)
    : undefined;
  const currentOrders = selectedShop
    ? orders.filter((o) => o.店铺 === selectedShop)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-xs">
        加载中...
      </div>
    );
  }

  if (selectedShop && currentShop) {
    return (
      <div className="p-4">
        <ShopDetail
          shop={currentShop}
          perf={currentPerf}
          orders={currentOrders}
          onBack={() => setSelectedShop(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-slate-800">TikTok 店铺看板</h1>
        <RoleSwitcher
          users={[DEFAULT_USER]}
          current={user}
          onChange={setUser}
        />
      </div>

      <FilterBar
        shops={roleShops}
        group={filterGroup}
        department={filterDept}
        team={filterTeam}
        salesperson={filterSales}
        onGroupChange={setFilterGroup}
        onDepartmentChange={setFilterDept}
        onTeamChange={setFilterTeam}
        onSalespersonChange={setFilterSales}
      />

      <div className="flex gap-1 items-center">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 flex-1">
          {(["today", "7d", "30d"] as TimeRange[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === t
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {{ today: "今日", "7d": "近7天", "30d": "近30天" }[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {(["shop", "group", "dept"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                viewMode === m
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {{ shop: "店铺", group: "集团", dept: "部门" }[m]}
            </button>
          ))}
        </div>
      </div>

      <Overview
        kpi={kpi}
        orders={filteredOrders}
        shops={filteredShops}
        perf={filteredPerf}
        timeRange={timeRange}
        onShopClick={handleShopClick}
        viewMode={viewMode}
      />
    </div>
  );
}
