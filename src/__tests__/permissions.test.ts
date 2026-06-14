import { describe, it, expect } from "vitest";
import { filterShops, filterDailyOrders, filterPerformance } from "../lib/permissions";
import type { Shop, UserContext, DailyOrder, ShopPerformance } from "../types";

function makeShop(name: string, dept: string, team: string, seller: string): Shop {
  return {
    店铺名称: name, 店铺真实名称: name, 集团名称: "集团",
    部门: dept, 小组: team, 销售员: seller, 站点: "VN",
    店铺状态: "开启", 店铺授权: "已授权", 店铺属性: "铺货",
    海外仓: "否", "3PF店铺": "否", 本土账号: "否", 店铺出村: "已出村",
    "'店铺违规分'": "0", 店铺大小: "小", 店铺标签: "", 店铺类型: "系统铺货",
    在线商品上限: "5000", 刊登使用率: "20", 每日发布数量: "0",
    在线产品数量: "989", 在线产品数量更新时间: "", 运营类型: "",
    店铺Code码: "", 商家ID: "", 后台真实账号名称: "", 店铺准入一级类目: "",
    自动调库存: "", 仓库: "", 滞销刊登: "", 违规产品自动下架: "",
    单品折扣自动续期: "", 秒杀活动自动续期: "", 开启关闭切价: "",
    "销售系统店铺授权状态 2:授权过期  1:已授权  0:未授权": "",
    修改人名称: "", 修改时间: "", 同步时间: "", 平台海外仓仓库名称: "", erp仓库名称: "",
  };
}

const shops = [
  makeShop("S1", "一部", "A组", "张三"),
  makeShop("S2", "一部", "A组", "李四"),
  makeShop("S3", "一部", "B组", "王五"),
  makeShop("S4", "二部", "C组", "赵六"),
];

describe("filterShops", () => {
  it("admin sees all", () => {
    const user: UserContext = { name: "管理员", role: "admin", group: "", department: "", team: "" };
    expect(filterShops(shops, user)).toHaveLength(4);
  });

  it("dept_head sees only own department", () => {
    const user: UserContext = { name: "李四", role: "dept_head", group: "", department: "一部", team: "" };
    expect(filterShops(shops, user)).toHaveLength(3);
  });

  it("team_lead sees only own team", () => {
    const user: UserContext = { name: "李四", role: "team_lead", group: "", department: "", team: "A组" };
    expect(filterShops(shops, user)).toHaveLength(2);
  });

  it("seller sees only own shops", () => {
    const user: UserContext = { name: "张三", role: "seller", group: "", department: "", team: "" };
    const result = filterShops(shops, user);
    expect(result).toHaveLength(1);
    expect(result[0].店铺名称).toBe("S1");
  });
});
