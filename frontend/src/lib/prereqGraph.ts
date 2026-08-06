// Client-side layout for the interactive prerequisite graph. The
// backend (/api/courses/{module_id}/prereqs, see app/prereqs.py)
// already returns the *full* transitive tree in one shot -- unlike
// ClassGraph, which precomputes depth-capped trees and lazy-fetches
// deeper ones on expand, we only need to progressively *reveal*
// already-fetched depth/OR-group data client-side. Layout otherwise
// follows ClassGraph's D3 renderer (src/utils/astGraphUtils.js): an OR
// node is a transparent layout level (its alternatives render at the
// OR node's own depth, wrapped in one dashed box) rather than a
// visible box of its own, and an overflowing OR group previews the
// first few alternatives behind a "+N more" node.
import type { PrereqNode } from "../types";

export const GNW = 148, GNH = 44, HGAP = 18, VGAP = 82, GPAD = 32;
export const COL_W = GNW + HGAP;
export const MAX_D = 3, OR_PREV = 3;

export interface GNode {
  id: string; code: string; title: string;
  depth: number; x: number; y: number;
  isExpandable: boolean; isOrMore: boolean;
  orGroupPath: string | null; parentId: string | null;
  status: "root" | "planned" | "unresolved" | "default";
}
export interface GEdge { id: string; fromId: string; toId: string; x1: number; y1: number; x2: number; y2: number; }
export interface GOrBox { id: string; x: number; y: number; w: number; h: number; }
export interface GraphLayout { nodes: GNode[]; edges: GEdge[]; orBoxes: GOrBox[]; svgW: number; svgH: number; }

// Column width a node's subtree occupies. `path` is a structural id
// (child-index chain from the root) used to key OR-group expand state
// -- it's independent of the sequential node ids assigned in place(),
// so this function and place() can each compute it standalone and
// still agree on which OR groups are expanded.
function subW(node: PrereqNode, depth: number, path: string, exp: Set<string>, orExp: Set<string>): number {
  const hasKids = node.children.length > 0;
  const show = hasKids && (depth < MAX_D - 1 || exp.has(node.code));
  if (!show) return 1;

  let w = 0;
  node.children.forEach((child, i) => {
    if (child.code === "OR") {
      const groupPath = `${path}.${i}`;
      const alts = child.children;
      const expanded = orExp.has(groupPath) || alts.length <= OR_PREV + 1;
      const visible = expanded ? alts : alts.slice(0, OR_PREV);
      visible.forEach((alt, j) => { w += subW(alt, depth + 1, `${groupPath}.${j}`, exp, orExp); });
      if (!expanded) w += 1; // "+N more" node
    } else {
      w += subW(child, depth + 1, `${path}.${i}`, exp, orExp);
    }
  });
  return Math.max(1, w);
}

function place(
  node: PrereqNode, depth: number, leftCol: number, path: string,
  parentId: string | null, orGroupPath: string | null,
  exp: Set<string>, orExp: Set<string>, plannedCodes: Set<string>,
  nodes: GNode[], edges: GEdge[], orBoxMap: Record<string, string[]>, seq: { n: number },
): void {
  const id = `n${seq.n++}`;
  const hasKids = node.children.length > 0;
  const show = hasKids && (depth < MAX_D - 1 || exp.has(node.code));
  const w = subW(node, depth, path, exp, orExp);
  const x = GPAD + GNW / 2 + (leftCol + (w - 1) / 2) * COL_W;
  const y = GPAD + GNH / 2 + depth * (GNH + VGAP);

  const status: GNode["status"] = depth === 0 ? "root"
    : plannedCodes.has(node.code) ? "planned"
    : node.title === null ? "unresolved"
    : "default";

  nodes.push({
    id, code: node.code, title: node.title ?? node.code,
    depth, x, y, isExpandable: hasKids && !show, isOrMore: false,
    orGroupPath, parentId, status,
  });
  if (orGroupPath) (orBoxMap[orGroupPath] ??= []).push(id);

  if (parentId !== null) {
    const par = nodes.find(n => n.id === parentId)!;
    edges.push({ id: `${parentId}→${id}`, fromId: parentId, toId: id, x1: par.x, y1: par.y + GNH / 2, x2: x, y2: y - GNH / 2 });
  }
  if (!show) return;

  let col = leftCol;
  node.children.forEach((child, i) => {
    if (child.code === "OR") {
      const groupPath = `${path}.${i}`;
      const alts = child.children;
      const expanded = orExp.has(groupPath) || alts.length <= OR_PREV + 1;
      const visible = expanded ? alts : alts.slice(0, OR_PREV);
      const hidden = alts.length - visible.length;

      visible.forEach((alt, j) => {
        const cw = subW(alt, depth + 1, `${groupPath}.${j}`, exp, orExp);
        place(alt, depth + 1, col, `${groupPath}.${j}`, id, groupPath, exp, orExp, plannedCodes, nodes, edges, orBoxMap, seq);
        col += cw;
      });

      if (hidden > 0) {
        const pid = `n${seq.n++}`;
        const par = nodes.find(n => n.id === id)!;
        const px = GPAD + GNW / 2 + col * COL_W;
        const py = GPAD + GNH / 2 + (depth + 1) * (GNH + VGAP);
        nodes.push({
          id: pid, code: `+${hidden} more`, title: `${hidden} more alternative${hidden !== 1 ? "s" : ""}`,
          depth: depth + 1, x: px, y: py, isExpandable: true, isOrMore: true,
          orGroupPath: groupPath, parentId: id, status: "default",
        });
        (orBoxMap[groupPath] ??= []).push(pid);
        edges.push({ id: `${id}→${pid}`, fromId: id, toId: pid, x1: par.x, y1: par.y + GNH / 2, x2: px, y2: py - GNH / 2 });
        col += 1;
      }
    } else {
      const cw = subW(child, depth + 1, `${path}.${i}`, exp, orExp);
      place(child, depth + 1, col, `${path}.${i}`, id, null, exp, orExp, plannedCodes, nodes, edges, orBoxMap, seq);
      col += cw;
    }
  });
}

export function buildGraph(
  root: PrereqNode, exp: Set<string>, orExp: Set<string>, plannedCodes: Set<string>,
): GraphLayout {
  const nodes: GNode[] = [], edges: GEdge[] = [];
  const orBoxMap: Record<string, string[]> = {};
  place(root, 0, 0, "0", null, null, exp, orExp, plannedCodes, nodes, edges, orBoxMap, { n: 0 });

  const orBoxes: GOrBox[] = [];
  for (const [id, memberIds] of Object.entries(orBoxMap)) {
    const ns = nodes.filter(n => memberIds.includes(n.id));
    if (ns.length < 2) continue;
    const pad = 10;
    orBoxes.push({
      id,
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
  root:       { fill: "#0b4a67", stroke: "#083858", text: "#ffffff" },
  planned:    { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  unresolved: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  default:    { fill: "#f8faff", stroke: "#8899bb", text: "#1a2a4a" },
};
