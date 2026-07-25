import { COMPLETED_COURSES, COURSE_INFO, PREREQS } from "../data/prereqs";

export const GNW = 148, GNH = 44, HGAP = 18, VGAP = 82, GPAD = 32;
export const COL_W = GNW + HGAP;
export const MAX_D = 3, OR_PREV = 3;

export interface GNode {
  id: string; code: string; title: string; units: number;
  depth: number; x: number; y: number;
  isExpandable: boolean; isOrMore: boolean;
  orGroupId: string | null; parentId: string | null;
  status: "root" | "completed" | "missing" | "default";
}
export interface GEdge { id: string; fromId: string; toId: string; x1: number; y1: number; x2: number; y2: number; }
export interface GOrBox { id: string; x: number; y: number; w: number; h: number; }
export interface GraphLayout { nodes: GNode[]; edges: GEdge[]; orBoxes: GOrBox[]; svgW: number; svgH: number; }

function subW(code: string, depth: number, exp: Set<string>): number {
  const reqs = PREREQS[code] || [];
  if (!reqs.length) return 1;
  const show = depth < MAX_D - 1 || exp.has(code);
  if (!show) return 1;
  let w = 0;
  for (const r of reqs) {
    if (typeof r === "string") { w += subW(r, depth + 1, exp); }
    else {
      for (const o of r.or.slice(0, OR_PREV)) w += subW(o, depth + 1, exp);
      if (r.or.length > OR_PREV) w += 1;
    }
  }
  return Math.max(1, w);
}

export function buildGraph(rootCode: string, exp: Set<string>): GraphLayout {
  const nodes: GNode[] = [], edges: GEdge[] = [], orBoxMap: Record<string, string[]> = {};
  let seq = 0;

  function place(code: string, depth: number, leftCol: number, parentId: string | null, orGid: string | null) {
    const id = `n${seq++}`;
    const reqs = PREREQS[code] || [];
    const hasKids = reqs.length > 0;
    const show = hasKids && (depth < MAX_D - 1 || exp.has(code));
    const w = subW(code, depth, exp);
    const x = GPAD + GNW / 2 + (leftCol + (w - 1) / 2) * COL_W;
    const y = GPAD + GNH / 2 + depth * (GNH + VGAP);
    const status: GNode["status"] = depth === 0 ? "root"
      : COMPLETED_COURSES.has(code) ? "completed"
      : PREREQS[code] === undefined && COURSE_INFO[code] === undefined ? "missing"
      : "default";

    nodes.push({ id, code, title: COURSE_INFO[code]?.title ?? code, units: COURSE_INFO[code]?.units ?? 0,
      depth, x, y, isExpandable: hasKids && !show, isOrMore: false, orGroupId: orGid, parentId, status });
    if (orGid) { if (!orBoxMap[orGid]) orBoxMap[orGid] = []; orBoxMap[orGid].push(id); }

    if (parentId !== null) {
      const par = nodes.find(n => n.id === parentId)!;
      edges.push({ id: `${parentId}→${id}`, fromId: parentId, toId: id,
        x1: par.x, y1: par.y + GNH / 2, x2: x, y2: y - GNH / 2 });
    }
    if (!show) return;

    let col = leftCol, og = 0;
    for (const req of reqs) {
      if (typeof req === "string") {
        const cw = subW(req, depth + 1, exp);
        place(req, depth + 1, col, id, null);
        col += cw;
      } else {
        const oid = `or_${id}_${og++}`;
        const vis = req.or.slice(0, OR_PREV);
        const more = req.or.length - OR_PREV;
        for (const opt of vis) {
          const cw = subW(opt, depth + 1, exp);
          place(opt, depth + 1, col, id, oid);
          col += cw;
        }
        if (more > 0) {
          const pid = `n${seq++}`;
          const px = GPAD + GNW / 2 + col * COL_W;
          const py = GPAD + GNH / 2 + (depth + 1) * (GNH + VGAP);
          nodes.push({ id: pid, code: `+${more} more`, title: `+${more} alternatives`, units: 0,
            depth: depth + 1, x: px, y: py, isExpandable: false, isOrMore: true,
            orGroupId: oid, parentId: id, status: "default" });
          if (!orBoxMap[oid]) orBoxMap[oid] = []; orBoxMap[oid].push(pid);
          const par = nodes.find(n => n.id === id)!;
          edges.push({ id: `${id}→${pid}`, fromId: id, toId: pid,
            x1: par.x, y1: par.y + GNH / 2, x2: px, y2: py - GNH / 2 });
          col += 1;
        }
      }
    }
  }

  place(rootCode, 0, 0, null, null);

  const orBoxes: GOrBox[] = [];
  for (const [oid, ids] of Object.entries(orBoxMap)) {
    const ns = nodes.filter(n => ids.includes(n.id));
    if (ns.length < 2) continue;
    const pad = 10;
    orBoxes.push({
      id: oid,
      x: Math.min(...ns.map(n => n.x)) - GNW / 2 - pad,
      y: Math.min(...ns.map(n => n.y)) - GNH / 2 - pad,
      w: Math.max(...ns.map(n => n.x)) - Math.min(...ns.map(n => n.x)) + GNW + pad * 2,
      h: GNH + pad * 2,
    });
  }

  const svgW = nodes.length ? Math.max(...nodes.map(n => n.x + GNW / 2)) + GPAD : 300;
  const svgH = nodes.length ? Math.max(...nodes.map(n => n.y + GNH / 2)) + GPAD : 200;
  return { nodes, edges, orBoxes, svgW, svgH };
}

export const NODE_CFG: Record<GNode["status"], { fill: string; stroke: string; text: string }> = {
  root:      { fill: "#0b4a67", stroke: "#083858", text: "#ffffff" },
  completed: { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  missing:   { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  default:   { fill: "#f8faff", stroke: "#8899bb", text: "#1a2a4a" },
};
