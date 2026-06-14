import type { UserContext, Shop, DailyOrder, ShopPerformance } from "../types";

/**
 * 根据用户角色过滤店铺列表。
 * - admin：全部店铺
 * - dept_head：所属部门的店铺
 * - team_lead：所属小组的店铺
 * - seller：自己名下的店铺
 */
export function filterShops(shops: Shop[], user: UserContext): Shop[] {
  switch (user.role) {
    case "admin":
      return shops;
    case "dept_head":
      return shops.filter((s) => s.部门 === user.department);
    case "team_lead":
      return shops.filter((s) => s.小组 === user.team);
    case "seller":
      return shops.filter((s) => s.销售员 === user.name);
  }
}

/** 获取当前用户可见的店铺名集合。
 *  注意：shops 表用「店铺名称」字段，performance 表用「店铺名」字段，
 *  daily_orders 表用「店铺」字段，三者需对齐后做集合匹配。 */
function visibleShopNames(shops: Shop[], user: UserContext): Set<string> {
  return new Set(filterShops(shops, user).map((s) => s.店铺名称));
}

/** 过滤日订单，只保留当前用户可见店铺 */
export function filterDailyOrders(
  orders: DailyOrder[],
  shops: Shop[],
  user: UserContext
): DailyOrder[] {
  const names = visibleShopNames(shops, user);
  return orders.filter((o) => names.has(o.店铺));
}

/** 过滤店铺表现，只保留当前用户可见店铺 */
export function filterPerformance(
  perf: ShopPerformance[],
  shops: Shop[],
  user: UserContext
): ShopPerformance[] {
  const names = visibleShopNames(shops, user);
  return perf.filter((p) => names.has(p.店铺名));
}
