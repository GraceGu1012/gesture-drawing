import type { DailyOrder } from "../types";
import { parseGmv, formatGmv } from "../lib/aggregator";

interface Props {
  orders: DailyOrder[];
  onShopClick: (shopName: string) => void;
}

interface RankItem {
  shop: string;
  gmv: number;
  orders: number;
}

export default function ShopRanking({ orders, onShopClick }: Props) {
  const map = new Map<string, { gmv: number; orders: number }>();
  for (const o of orders) {
    const prev = map.get(o.店铺) || { gmv: 0, orders: 0 };
    prev.gmv += parseGmv(o.今日商品交易总额);
    prev.orders += parseInt(o.今日成交件数) || 0;
    map.set(o.店铺, prev);
  }

  const ranked: { shop: string; gmv: number; orders: number }[] = [];
  for (const [shop, v] of map) {
    ranked.push({ shop, gmv: v.gmv, orders: v.orders });
  }
  ranked.sort((a, b) => b.gmv - a.gmv);

  const top10 = ranked.slice(0, 10);

  if (top10.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-4">
        暂无数据
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {top10.map((item, i) => (
        <button
          key={item.shop}
          onClick={() => onShopClick(item.shop)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-left"
        >
          <span className={`text-xs font-bold w-5 text-right ${
            i < 3 ? "text-amber-500" : "text-slate-400"
          }`}>
            {i + 1}
          </span>
          <span className="flex-1 text-xs text-slate-700 truncate">{item.shop}</span>
          <span className="text-xs font-medium text-slate-600">
            {formatGmv(item.gmv)}
          </span>
          <span className="text-xs text-slate-400 w-12 text-right">
            {item.orders}单
          </span>
        </button>
      ))}
    </div>
  );
}
