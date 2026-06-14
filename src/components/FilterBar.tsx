import { useMemo } from "react";
import type { Shop } from "../types";

interface Props {
  shops: Shop[];
  group: string;
  department: string;
  team: string;
  salesperson: string;
  onGroupChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onTeamChange: (v: string) => void;
  onSalespersonChange: (v: string) => void;
}

export default function FilterBar({
  shops,
  group, department, team, salesperson,
  onGroupChange, onDepartmentChange, onTeamChange, onSalespersonChange,
}: Props) {
  /* Derive unique values, cascading */
  const groups = useMemo(() => [...new Set(shops.map((s) => s.集团名称).filter(Boolean))].sort(), [shops]);

  const departments = useMemo(() => {
    let filtered = shops;
    if (group) filtered = filtered.filter((s) => s.集团名称 === group);
    return [...new Set(filtered.map((s) => s.部门).filter(Boolean))].sort();
  }, [shops, group]);

  const teams = useMemo(() => {
    let filtered = shops;
    if (group) filtered = filtered.filter((s) => s.集团名称 === group);
    if (department) filtered = filtered.filter((s) => s.部门 === department);
    return [...new Set(filtered.map((s) => s.小组).filter(Boolean))].sort();
  }, [shops, group, department]);

  const salespersons = useMemo(() => {
    let filtered = shops;
    if (group) filtered = filtered.filter((s) => s.集团名称 === group);
    if (department) filtered = filtered.filter((s) => s.部门 === department);
    if (team) filtered = filtered.filter((s) => s.小组 === team);
    return [...new Set(filtered.map((s) => s.销售员).filter(Boolean))].sort();
  }, [shops, group, department, team]);

  const selectCls = "text-[10px] bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 w-full";

  return (
    <div className="grid grid-cols-4 gap-1">
      <div>
        <div className="text-[9px] text-slate-400 mb-0.5">集团</div>
        <select value={group} onChange={(e) => { onGroupChange(e.target.value); onDepartmentChange(""); onTeamChange(""); onSalespersonChange(""); }} className={selectCls}>
          <option value="">全部</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <div className="text-[9px] text-slate-400 mb-0.5">部门</div>
        <select value={department} onChange={(e) => { onDepartmentChange(e.target.value); onTeamChange(""); onSalespersonChange(""); }} className={selectCls}>
          <option value="">全部</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <div className="text-[9px] text-slate-400 mb-0.5">小组</div>
        <select value={team} onChange={(e) => { onTeamChange(e.target.value); onSalespersonChange(""); }} className={selectCls}>
          <option value="">全部</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <div className="text-[9px] text-slate-400 mb-0.5">销售员</div>
        <select value={salesperson} onChange={(e) => onSalespersonChange(e.target.value)} className={selectCls}>
          <option value="">全部</option>
          {salespersons.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}
