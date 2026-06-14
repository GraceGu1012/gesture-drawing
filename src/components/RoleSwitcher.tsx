import type { UserContext } from "../types";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  dept_head: "部门负责人",
  team_lead: "组长",
  seller: "销售",
};

interface Props {
  users: UserContext[];
  current: UserContext;
  onChange: (u: UserContext) => void;
}

export default function RoleSwitcher({ users, current, onChange }: Props) {
  return (
    <select
      value={users.indexOf(current)}
      onChange={(e) => onChange(users[Number(e.target.value)])}
      className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    >
      {users.map((u, i) => (
        <option key={i} value={i}>
          {ROLE_LABELS[u.role]}：{u.name}
        </option>
      ))}
    </select>
  );
}
